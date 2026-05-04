from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.database import get_db
from ..db.crud import upsert_user
from ..middleware.auth import get_current_user
from ..services.ocr_service import ocr_service
from ..services.status_engine import calculate_id_status
from ..services.validation import validate_qid, normalize_date
from ..schemas import ScanResponse
import os
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scan", tags=["scan"])

OCR_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.85"))

@router.post("", response_model=ScanResponse)
async def scan_id(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    contents = await file.read()
    
    try:
        ocr_result = await ocr_service.process_image(contents)
    except Exception as e:
        logger.error(f"OCR Error: {e}")
        raise HTTPException(status_code=400, detail=f"OCR Processing failed: {str(e)}")
    
    qid = ocr_result.get("qid_number")
    name = ocr_result.get("name")
    expiry_str = ocr_result.get("expiry_date")
    dob = ocr_result.get("dob")
    nationality = ocr_result.get("nationality")
    confidence = ocr_result.get("confidence", 0.0)
    
    requires_review = False
    if not qid or not name or not expiry_str or confidence < OCR_THRESHOLD:
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
            "name": name or "",
            "expiry_date": normalized_expiry,
            "dob": normalized_dob,
            "nationality": nationality or "—"
        },
        "status": id_status,
        "status_message": id_status_msg,
        "is_new_user": False,
        "requires_review": requires_review,
        "ocr_confidence": confidence,
        "extracted_fields": ocr_result,
        "processed_image": ocr_result.get("processed_image")
    }
