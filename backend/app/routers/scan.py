from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.database import get_db
from ..db.crud import upsert_user
from ..middleware.auth import get_current_user
from ..services.ocr_service import ocr_service
from ..services.status_engine import calculate_id_status
from ..services.validation import validate_qid, normalize_date
from ..schemas import ScanResponse
from ..schemas import ScanResponse, CornerDetectionResponse, Corner
import os
import re
import logging
import cv2
import numpy as np
import base64
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["scan"])

@router.post("/detect", response_model=CornerDetectionResponse)
async def detect_corners(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
    
    corners = await ocr_service.detect_corners(img)
    
    # Return image size too so frontend can scale nodes correctly
    h, w = img.shape[:2]
    
    return {
        "corners": corners,
        "width": w,
        "height": h
    }

@router.post("/extract", response_model=ScanResponse)
async def extract_with_corners(
    file: UploadFile = File(...),
    corners_json: str = File(...), # JSON string of corners
    doc_type: str = "AUTO",
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    import json
    try:
        corners = json.loads(corners_json)
    except:
        raise HTTPException(status_code=400, detail="Invalid corners JSON")
        
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
        
    try:
        ocr_result = await ocr_service.warp_and_extract(img, corners, doc_type=doc_type)
    except Exception as e:
        logger.error(f"Extraction Error: {e}")
        raise HTTPException(status_code=400, detail=f"Extraction failed: {str(e)}")

    # Reuse the same normalization/status logic from scan_id (could be refactored but keeping simple for now)
    qid = ocr_result.get("qid_number")
    passport = ocr_result.get("passport_number")
    id_type = ocr_result.get("id_type", "QID")
    name = ocr_result.get("name")
    expiry_str = ocr_result.get("expiry_date")
    dob = ocr_result.get("dob")
    nationality = ocr_result.get("nationality")
    confidence = ocr_result.get("confidence", 0.0)
    
    requires_review = (not qid and not passport) or not name or not expiry_str or confidence < OCR_THRESHOLD

    normalized_expiry = ""
    normalized_dob = ""
    id_status = "AWAITING_VERIFICATION"
    id_status_msg = "Please verify and save the information below."

    if expiry_str:
        try:
            exp_date = normalize_date(expiry_str)
            if exp_date:
                normalized_expiry = exp_date.isoformat()
                res = calculate_id_status(exp_date)
                id_status = res["status"].value
                id_status_msg = res["message"]
        except: pass

    if dob:
        try:
            dob_date = normalize_date(dob)
            if dob_date: normalized_dob = dob_date.isoformat()
        except: pass

    # For debug image, send the original but we could also send warped
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    debug_image = base64.b64encode(buffer).decode('utf-8')

    return {
        "user": {
            "qid_number": qid or "",
            "passport_number": passport or "",
            "id_type": id_type,
            "name": name or "",
            "expiry_date": normalized_expiry,
            "dob": normalized_dob,
            "nationality": nationality or "—",
            "occupation": ocr_result.get("occupation"),
            "employer": ocr_result.get("employer"),
            "residency_type": ocr_result.get("residency_type"),
            "passport_expiry": ocr_result.get("passport_expiry")
        },
        "status": id_status,
        "status_message": id_status_msg,
        "is_new_user": False,
        "requires_review": requires_review,
        "ocr_confidence": confidence,
        "extracted_fields": ocr_result,
        "processed_image": debug_image
    }


OCR_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.85"))

@router.post("", response_model=ScanResponse)
async def scan_id(
    file: UploadFile = File(...), 
    doc_type: str = "AUTO",
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contents = await file.read()
    
    try:
        ocr_result = await ocr_service.process_image(contents, doc_type=doc_type)
    except Exception as e:
        logger.error(f"OCR Error: {e}")
        raise HTTPException(status_code=400, detail=f"OCR Processing failed: {str(e)}")
    
    qid = ocr_result.get("qid_number")
    passport = ocr_result.get("passport_number")
    id_type = ocr_result.get("id_type", "QID")
    name = ocr_result.get("name")
    expiry_str = ocr_result.get("expiry_date")
    dob = ocr_result.get("dob")
    nationality = ocr_result.get("nationality")
    confidence = ocr_result.get("confidence", 0.0)
    
    requires_review = False
    if (not qid and not passport) or not name or not expiry_str or confidence < OCR_THRESHOLD:
        requires_review = True

    # Calculate real-time ID status if we have a date
    id_status = "AWAITING_VERIFICATION"
    id_status_msg = "Please verify and save the information below."
    
    # Normalize dates for frontend (HTML5 date input expects YYYY-MM-DD)
    normalized_expiry = ""
    normalized_dob = ""
    
    if expiry_str:
        try:
            exp_date = normalize_date(expiry_str)
            if exp_date:
                normalized_expiry = exp_date.isoformat()
                res = calculate_id_status(exp_date)
                id_status = res["status"].value
                id_status_msg = res["message"]
        except Exception as e:
            logger.warning(f"Expiry normalization failed: {e}")
            normalized_expiry = expiry_str # Fallback

    if dob:
        try:
            dob_date = normalize_date(dob)
            if dob_date:
                normalized_dob = dob_date.isoformat()
        except Exception as e:
            logger.warning(f"DOB normalization failed: {e}")
            normalized_dob = dob # Fallback

    return {
        "user": {
            "qid_number": qid or "",
            "passport_number": passport or "",
            "id_type": id_type,
            "name": name or "",
            "expiry_date": normalized_expiry,
            "dob": normalized_dob,
            "nationality": nationality or "—",
            "occupation": ocr_result.get("occupation"),
            "employer": ocr_result.get("employer"),
            "residency_type": ocr_result.get("residency_type"),
            "passport_expiry": ocr_result.get("passport_expiry")
        },
        "status": id_status,
        "status_message": id_status_msg,
        "is_new_user": False,
        "requires_review": requires_review,
        "ocr_confidence": confidence,
        "extracted_fields": ocr_result,
        "processed_image": ocr_result.get("processed_image"),
        "processed_back_image": ocr_result.get("processed_back_image")
    }

@router.post("/pair", response_model=ScanResponse)
async def scan_id_pair(
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    doc_type: str = "AUTO",
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    front_bytes = await front.read()
    back_bytes = await back.read()
    
    try:
        ocr_result = await ocr_service.process_id_pair(front_bytes, back_bytes, return_debug_images=True)
    except Exception as e:
        logger.error(f"OCR Pair Error: {e}")
        raise HTTPException(status_code=400, detail=f"OCR Processing failed: {str(e)}")
    
    # Re-use the same normalization/status logic
    qid = ocr_result.get("qid_number")
    passport = ocr_result.get("passport_number")
    id_type = ocr_result.get("id_type", "QID")
    name = ocr_result.get("name")
    expiry_str = ocr_result.get("expiry_date")
    dob = ocr_result.get("dob")
    nationality = ocr_result.get("nationality")
    confidence = ocr_result.get("confidence", 0.0)
    
    requires_review = (not qid and not passport) or not name or not expiry_str or confidence < OCR_THRESHOLD

    normalized_expiry = ""
    normalized_dob = ""
    id_status = "AWAITING_VERIFICATION"
    id_status_msg = "Please verify and save the information below."

    if expiry_str:
        try:
            exp_date = normalize_date(expiry_str)
            if exp_date:
                normalized_expiry = exp_date.isoformat()
                res = calculate_id_status(exp_date)
                id_status = res["status"].value
                id_status_msg = res["message"]
        except: pass

    if dob:
        try:
            dob_date = normalize_date(dob)
            if dob_date: normalized_dob = dob_date.isoformat()
        except: pass

    return {
        "user": {
            "qid_number": qid or "",
            "passport_number": passport or "",
            "id_type": id_type,
            "name": name or "",
            "expiry_date": normalized_expiry,
            "dob": normalized_dob,
            "nationality": nationality or "—",
            "occupation": ocr_result.get("occupation"),
            "employer": ocr_result.get("employer"),
            "residency_type": ocr_result.get("residency_type"),
            "passport_expiry": ocr_result.get("passport_expiry")
        },
        "status": id_status,
        "status_message": id_status_msg,
        "is_new_user": False,
        "requires_review": requires_review,
        "ocr_confidence": confidence,
        "extracted_fields": ocr_result,
        "processed_image": ocr_result.get("processed_image"),
        "processed_back_image": ocr_result.get("processed_back_image")
    }
