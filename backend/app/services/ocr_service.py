import os
import sys

# --- HIGH-STRENGTH STABILITY OVERRIDES (Fixes Paddle 3.0+ Windows Bugs) ---
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_executor_type"] = "legacy"
os.environ["ONEDNN_MAX_CPU_ISA"] = "SSE41"
os.environ["PADDLE_USE_CUDA"] = "0"
os.environ["FLAGS_onednn_quantize"] = "0"
os.environ["FLAGS_prim_enable_dynamic"] = "0"
os.environ["FLAGS_new_executor_static_build"] = "0"
os.environ["FLAGS_enable_paddle_to_pir"] = "0"
os.environ["FLAGS_enable_new_executor"] = "0"

# --- EMERGENCY: Mock broken Windows dependencies (Fixes torch/modelscope crash) ---
if sys.platform == 'win32':
    from unittest.mock import MagicMock
    import importlib.machinery
    
    # Create a blanket mock for torch and modelscope
    mock_obj = MagicMock()
    mock_obj.__spec__ = importlib.machinery.ModuleSpec("mock", None)
    
    # These are the specific paths that crash on Windows 3.12
    for mod in [
        "torch", "torch.utils", "torch.utils.data", "torch.multiprocessing",
        "modelscope", "modelscope.utils", "modelscope.utils.import_utils",
        "modelscope.utils.logger", "modelscope.utils.registry"
    ]:
        sys.modules[mod] = mock_obj

import cv2
import numpy as np
import base64
import logging
import asyncio
import re
import threading
import concurrent.futures
import subprocess
import atexit
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from paddleocr import PaddleOCR

# Configure Logging
logger = logging.getLogger(__name__)

# --- Constants ---
CARD_WIDTH = 900
CARD_HEIGHT = 570
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_PIXELS = 25_000_000
INFERENCE_TIMEOUT = 30.0
CONFIDENCE_THRESHOLD = 0.70

# --- Regex Patterns ---
QID_PATTERN = re.compile(r'(?<!\d)(\d{11})(?!\d)')
DATE_PATTERN = re.compile(r'(\d{2}/\d{2}/\d{4})')
NAME_LABEL_PATTERN = re.compile(r'\bNAME\b|\bNAMO\b|\bNANE\b', re.IGNORECASE)
ID_LABEL_PATTERN = re.compile(r'ID[\.\s]*NO|QID|Q\.?I\.?D', re.IGNORECASE)
DOB_LABEL_PATTERN = re.compile(r'D[\.\s]*O[\.\s]*B|DATE[\s]*OF[\s]*BIRTH', re.IGNORECASE)
EXPIRY_LABEL_PATTERN = re.compile(r'\bEXPIRY\b', re.IGNORECASE)
NATIONALITY_LABEL_PATTERN = re.compile(r'\bNATIONALITY\b', re.IGNORECASE)
OCCUPATION_LABEL_PATTERN = re.compile(r'\bOCCUPATION\b', re.IGNORECASE)

# --- Thread-Safe Cloud Optimizations ---
_inference_semaphore: Optional[asyncio.Semaphore] = None
_semaphore_lock = threading.Lock()

def get_semaphore() -> asyncio.Semaphore:
    """Lazy semaphore initialization for universal Python (3.8+) compatibility."""
    global _inference_semaphore
    if _inference_semaphore is None:
        with _semaphore_lock:
            if _inference_semaphore is None:
                _inference_semaphore = asyncio.Semaphore(2)
    return _inference_semaphore

_cv_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="cv")
_ocr_executor = concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="ocr")

atexit.register(_cv_executor.shutdown, wait=False)
atexit.register(_ocr_executor.shutdown, wait=False)

def check_mkldnn_support() -> bool:
    # Always False for stability on Windows 3.0+ Beta
    return False

_engine_lock = threading.Lock()
_engine_instance = None

def get_ocr_engine():
    global _engine_instance
    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                logger.info("Initializing English PaddleOCR Engine (v4 Stability Mode)...")
                _engine_instance = PaddleOCR(
                    use_angle_cls=False,
                    lang='en',
                    ocr_version='PP-OCRv4',
                    enable_mkldnn=False,      # Force off to avoid PIR crash
                    # use_gpu=False,
                    # show_log is removed in PP-OCRv4 path
                    det_limit_side_len=960,
                    det_limit_type='min',
                    rec_batch_num=6
                )
    return _engine_instance

class OCRService:
    def __init__(self):
        self.conf_threshold = 0.60
        self.qid_pattern = (r'(?<!\d)(\d{11})(?!\d)')
        self.id_label_pattern = re.compile(r'Qatar ID|Identity Card|Residency Permit', re.I)
        self.name_label_pattern = re.compile(r'Name|Full Name', re.I)
        self.dob_label_pattern = re.compile(r'D\.?[0O]\.?B|Date of Birth|Birth Date', re.I)
        self.nat_label_pattern = re.compile(r'Nationality|Country', re.I)
        self.occ_label_pattern = re.compile(r'Occupation|Job', re.I)
        self.exp_label_pattern = re.compile(r'Expiry|Date of Exp|Valid Until|Valid Thru', re.I)

    @property
    def engine(self):
        return get_ocr_engine()

    async def perform_ocr(self, img: np.ndarray) -> List[Any]:
        loop = asyncio.get_running_loop()
        async with get_semaphore():
            try:
                results = await loop.run_in_executor(_ocr_executor, self.engine.ocr, img)
                
                # Critical structural logging
                logger.info(f"OCR RAW RESULT: type={type(results)} content_preview={str(results)[:200]}...")
                
                if isinstance(results, list):
                    logger.info(f"OCR LIST LEN: {len(results)}")
                    if len(results) > 0:
                        logger.info(f"OCR FIRST ELEMENT TYPE: {type(results[0])}")
                        if isinstance(results[0], list):
                             logger.info(f"OCR SUB-LIST LEN: {len(results[0])}")
                
                return results
            except Exception as e:
                logger.error(f"Engine.ocr execution failed: {e}")
                raise
    
    async def preprocess_image(self, img: np.ndarray) -> Tuple[np.ndarray, bool]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_cv_executor, self._sync_preprocess, img)
    
    def _sync_preprocess(self, img: np.ndarray) -> Tuple[np.ndarray, bool]:
        was_corrected = False
        h, w = img.shape[:2]
        
        # 1. Portrait Fix (Before Warp)
        if h > w:
            img_cw = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            img_ccw = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
            img = self._pick_correct_landscape(img_cw, img_ccw)
            was_corrected = True
            h, w = img.shape[:2]

        orig = img.copy()
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
        edged = cv2.Canny(blurred, 75, 200)

        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

        screenCnt = None
        for c in contours:
            if cv2.contourArea(c) < (h * w * 0.1): continue
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                screenCnt = approx
                break

        if screenCnt is not None:
            rect = self._order_points(screenCnt.reshape(4, 2))
            (tl, tr, br, bl) = rect
            maxWidth = max(int(np.linalg.norm(br-bl)), int(np.linalg.norm(tr-tl)))
            maxHeight = max(int(np.linalg.norm(tr-br)), int(np.linalg.norm(tl-bl)))
            dst = np.array([[0, 0], [maxWidth-1, 0], [maxWidth-1, maxHeight-1], [0, maxHeight-1]], dtype="float32")
            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(orig, M, (maxWidth, maxHeight))
            resized = cv2.resize(warped, (CARD_WIDTH, CARD_HEIGHT))
        else:
            resized = cv2.resize(orig, (CARD_WIDTH, CARD_HEIGHT))

        # 2. 180° Fix (After Warp/Normalize)
        warped_img, flip_corrected = self._check_and_fix_180(resized)
        
        # 3. Soft Preprocessing (Preserves character edges without ringing)
        # We stay in color space to avoid losing subtle contrast cues
        lab = cv2.cvtColor(warped_img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        final_color = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # Light unsharp mask instead of hard kernel
        blurred = cv2.GaussianBlur(final_color, (0,0), 3)
        final_img = cv2.addWeighted(final_color, 1.5, blurred, -0.5, 0)
        
        return final_img, was_corrected or flip_corrected

    def _check_and_fix_180(self, img: np.ndarray) -> Tuple[np.ndarray, bool]:
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        
        top_strip = thresh[:int(h * 0.18), :]
        bot_strip = thresh[int(h * 0.82):, :]
        
        top_density = np.sum(top_strip) / max(top_strip.size, 1)
        bot_density = np.sum(bot_strip) / max(bot_strip.size, 1)
        
        ratio = top_density / max(bot_density, 1e-6)
        logger.debug(f"Orientation Check: top={top_density:.4f} bot={bot_density:.4f} ratio={ratio:.2f}")
        
        if bot_density > 0 and top_density > (bot_density * 1.5):
            logger.info(f"180° flip detected (ratio={ratio:.2f}) - Correcting orientation.")
            return cv2.rotate(img, cv2.ROTATE_180), True
        return img, False

    def _pick_correct_landscape(self, img_cw, img_ccw) -> np.ndarray:
        def get_footer_density(img):
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            _, t = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
            h = t.shape[0]
            return np.sum(t[int(h*0.82):, :])
        return img_cw if get_footer_density(img_cw) >= get_footer_density(img_ccw) else img_ccw

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0], rect[2] = pts[np.argmin(s)], pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        rect[1], rect[3] = pts[np.argmin(diff)], pts[np.argmax(diff)]
        return rect

    async def process_image(self, image_bytes: bytes, return_debug_image: bool = True) -> Dict[str, Any]:
        if len(image_bytes) > MAX_IMAGE_BYTES: raise ValueError("Payload too large")
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_raw = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_raw is None: raise ValueError("Invalid image")
        if img_raw.shape[0] * img_raw.shape[1] > MAX_PIXELS: raise ValueError("Image too large")

        processed_img, was_corrected = await self.preprocess_image(img_raw)
        
        # Validate processed image structure
        if processed_img is None or not isinstance(processed_img, np.ndarray):
            raise ValueError("Preprocessing failed to produce a valid image array")
        if len(processed_img.shape) != 3 or processed_img.shape[2] != 3:
            logger.warning(f"Image shape mismatch after preprocessing: {processed_img.shape}. Attempting recovery.")
            if len(processed_img.shape) == 2:
                processed_img = cv2.cvtColor(processed_img, cv2.COLOR_GRAY2BGR)
            else:
                raise ValueError(f"Unsupported image shape: {processed_img.shape}")

        async with get_semaphore():
            loop = asyncio.get_running_loop()
            try:
                results = await asyncio.wait_for(
                    loop.run_in_executor(_ocr_executor, self.engine.ocr, processed_img),
                    timeout=INFERENCE_TIMEOUT
                )
            except asyncio.TimeoutError:
                raise ValueError("OCR Processing timed out.")
        
        extracted = self._parse_spatial_results(results)
        extracted["orientation_corrected"] = was_corrected
        extracted = self._validate_result(extracted)
        
        if return_debug_image:
            _, buffer = cv2.imencode('.jpg', processed_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            extracted["processed_image"] = base64.b64encode(buffer).decode('utf-8')
            
        return self._sanitize_for_json(extracted)

    def _get_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx) -> Optional[str]:
        """Spatial lookup for text fields. Rejects QIDs and Dates to avoid cross-contamination."""
        if label_block:
            label_text = label_block['text']
            if ':' in label_text:
                val = label_text.split(':', 1)[1].strip()
                if len(val) > 2 and not QID_PATTERN.search(val) and not DATE_PATTERN.search(val): return val
            if col_idx + 1 < len(current_row):
                val = current_row[col_idx+1]['text'].strip(': ')
                if len(val) > 2 and not QID_PATTERN.search(val) and not DATE_PATTERN.search(val): return val
        
        if row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx+1]:
                # Relaxed distance logic for row scanning
                val = block['text'].strip()
                if len(val) > 2 and not QID_PATTERN.search(val) and not DATE_PATTERN.search(val): return val
        return None

    def _get_qid_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx) -> Optional[str]:
        """Targeted spatial lookup for QID. Bypasses general text guards."""
        if not label_block or 'text' not in label_block:
            return None
            
        label_text = label_block['text']
        if ':' in label_text:
            val = label_text.split(':', 1)[1].strip()
            if QID_PATTERN.search(val): return QID_PATTERN.search(val).group()
            
        if col_idx + 1 < len(current_row):
            val = current_row[col_idx+1]['text'].strip(': ')
            if QID_PATTERN.search(val): return QID_PATTERN.search(val).group()
        
        if row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx+1]:
                if abs(block['cx'] - label_block['cx']) < (CARD_WIDTH * 0.15):
                    if QID_PATTERN.search(block['text']): return QID_PATTERN.search(block['text']).group()
        return None

    def _parse_spatial_results(self, results) -> Dict[str, Any]:
        blocks = []
        try:
            # --- PaddleOCR 3.x / PaddleX: Direct Dictionary ---
            if isinstance(results, dict):
                texts = results.get("rec_texts", [])
                scores = results.get("rec_scores", [])
                polys = results.get("rec_polys", [])
                for text, conf, bbox in zip(texts, scores, polys):
                    try:
                        bbox = np.array(bbox)
                        if bbox.shape[0] < 3: continue
                        cx = (bbox[0][0] + bbox[2][0]) / 2
                        cy = (bbox[0][1] + bbox[2][1]) / 2
                        h = abs(bbox[2][1] - bbox[0][1])
                        blocks.append({'text': str(text), 'conf': float(conf), 'cx': cx, 'cy': cy, 'h': h})
                    except Exception as e:
                        logger.warning(f"Skipping dict block: {e}")
                        continue

            # --- PaddleOCR 3.x: List of Dictionaries ---
            elif isinstance(results, list) and results and isinstance(results[0], dict):
                result = results[0]
                texts = result.get("rec_texts", [])
                scores = result.get("rec_scores", [])
                polys = result.get("rec_polys", [])
                for text, conf, bbox in zip(texts, scores, polys):
                    try:
                        bbox = np.array(bbox)
                        if bbox.shape[0] < 3: continue
                        cx = (bbox[0][0] + bbox[2][0]) / 2
                        cy = (bbox[0][1] + bbox[2][1]) / 2
                        h = abs(bbox[2][1] - bbox[0][1])
                        blocks.append({'text': str(text), 'conf': float(conf), 'cx': cx, 'cy': cy, 'h': h})
                    except Exception as e:
                        logger.warning(f"Skipping list-dict block: {e}")
                        continue

            # --- PaddleOCR 2.x Legacy: Nested Lists ---
            elif isinstance(results, list) and results and isinstance(results[0], list):
                for line in results[0]:
                    try:
                        if not line: continue
                        if len(line) == 3:
                            bbox, text, conf = line
                        elif len(line) == 2:
                            bbox, (text, conf) = line
                        else:
                            continue
                        
                        bbox = np.array(bbox)
                        if bbox.shape[0] < 3: continue
                        
                        cx = (bbox[0][0] + bbox[2][0]) / 2
                        cy = (bbox[0][1] + bbox[2][1]) / 2
                        h = abs(bbox[2][1] - bbox[0][1])
                        blocks.append({'text': str(text), 'conf': float(conf), 'cx': cx, 'cy': cy, 'h': h})
                    except Exception as e:
                        logger.warning(f"Skipping legacy line: {e}")
                        continue
            else:
                logger.error(f"Unknown OCR result type: {type(results)}")
                return self._empty_result()

        except Exception as e:
            logger.error(f"OCR parse failed entirely: {e}")
            return self._empty_result()

        if not blocks:
            return self._empty_result()

        # Sort by vertical position
        blocks.sort(key=lambda b: b['cy'])
        rows = []
        if blocks:
            data = self._empty_result()
            data["confidence"] = float(np.mean([b['conf'] for b in blocks]))
            current_row = [blocks[0]]
            for i in range(1, len(blocks)):
                row_avg_cy = np.mean([b['cy'] for b in current_row])
                row_avg_h = np.mean([b['h'] for b in current_row])
                if abs(blocks[i]['cy'] - row_avg_cy) < (row_avg_h * 0.6):
                    current_row.append(blocks[i])
                else:
                    rows.append(sorted(current_row, key=lambda b: b['cx']))
                    current_row = [blocks[i]]
            rows.append(sorted(current_row, key=lambda b: b['cx']))

        data["raw_text"] = [b['text'] for b in blocks]
        all_dates = []
        now = datetime.now()
        
        for i, row in enumerate(rows):
            row_text = " ".join([b['text'] for b in row])
            
            # --- DOB Extraction ---
            if self.dob_label_pattern.search(row_text):
                val = self._get_spatial_value(None, row, rows, i, 0) # Scan row for date
                match = DATE_PATTERN.search(row_text)
                if match:
                    data["dob"] = match.group()
                elif val and DATE_PATTERN.search(val):
                    data["dob"] = DATE_PATTERN.search(val).group()

            # --- Expiry Extraction ---
            if self.exp_label_pattern.search(row_text):
                # If we find a date in the same row as "Expiry", it's almost certainly the expiry date
                match = DATE_PATTERN.search(row_text)
                if match:
                    data["expiry_date"] = match.group()
                else:
                    val = self._get_spatial_value(None, row, rows, i, 0)
                    if val and DATE_PATTERN.search(val):
                        data["expiry_date"] = DATE_PATTERN.search(val).group()
            
            # Collect all dates for heuristic fallback
            for b in row:
                for match in DATE_PATTERN.finditer(b['text']):
                    all_dates.append(match.group())

            # Labels
            for j, block in enumerate(row):
                tu = block['text'].upper()
                if not data["qid_number"] and ID_LABEL_PATTERN.search(tu):
                    val = self._get_qid_spatial_value(block, row, rows, i, j)
                    if val: data["qid_number"] = val
                if not data["name"] and NAME_LABEL_PATTERN.search(tu): data["name"] = self._get_spatial_value(block, row, rows, i, j)
                if not data["nationality"] and NATIONALITY_LABEL_PATTERN.search(tu): data["nationality"] = self._get_spatial_value(block, row, rows, i, j)
                if not data["occupation"] and OCCUPATION_LABEL_PATTERN.search(tu): data["occupation"] = self._get_spatial_value(block, row, rows, i, j)

        # --- Heuristic Fallback for Dates ---
        if all_dates:
            # If DOB is still missing, it's likely the earliest date
            if not data["dob"]:
                data["dob"] = sorted(all_dates, key=lambda x: datetime.strptime(x, "%d/%m/%Y"))[0]
            
            # If Expiry is still missing, find the most likely candidate (not DOB, and either future or recent)
            if not data["expiry_date"]:
                other_dates = [d for d in all_dates if d != data["dob"]]
                if other_dates:
                    # Prefer future dates, then most recent past dates
                    data["expiry_date"] = sorted(other_dates, key=lambda x: datetime.strptime(x, "%d/%m/%Y"), reverse=True)[0]
        
        self._apply_heuristics(blocks, all_dates, data)
        return data

    def _apply_heuristics(self, blocks, all_dates, data):
        mrz_lines = [b['text'] for b in blocks if '<' in b['text'] and 35 <= len(b['text'].replace(' ', '')) <= 50]
        if mrz_lines and not data["qid_number"]:
            for line in mrz_lines:
                clean_line = line.replace(' ', '')
                if len(clean_line) >= 14:
                    doc_field = clean_line[5:14].replace('<', '')
                    digits = "".join(filter(str.isdigit, doc_field))
                    if len(digits) >= 9:
                        data["qid_number"] = digits
                        break
        
        # --- Global Regex Fallbacks (If spatial logic missed them) ---
        if not data["qid_number"]:
            for b in blocks:
                match = QID_PATTERN.search(b['text'])
                if match:
                    data["qid_number"] = match.group()
                    break

        if not data["name"]:
            for b in reversed(blocks):
                # Look for long capitalized blocks in the bottom 25% of the card
                if b['cy'] > (CARD_HEIGHT * 0.75):
                    t = b['text'].strip()
                    # Names are usually 2+ words, upper case, no digits
                    if len(t) > 10 and t.isupper() and len(t.split()) >= 2:
                        if not any(x in t.upper() for x in ["QATAR", "RESIDENCY", "PERMIT"]):
                            data["name"] = t
                            break

    def _validate_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        hard_issues = []
        info_flags = []
        if not data["qid_number"]: hard_issues.append("qid_missing")
        if not data["name"]: hard_issues.append("name_missing")
        if data["expiry_date"]:
            try:
                exp = datetime.strptime(data["expiry_date"], "%d/%m/%Y")
                if exp < datetime.now(): hard_issues.append("id_expired")
            except ValueError: hard_issues.append("expiry_parse_error")
        if data.get("orientation_corrected"): info_flags.append("auto_orientation_applied")
        
        data["validation_issues"] = hard_issues + info_flags
        
        # Determine overall status
        status = "valid"
        if "id_expired" in hard_issues:
            # Check for 90-day grace period
            try:
                exp_dt = datetime.strptime(data["expiry_date"], "%d/%m/%Y")
                if datetime.now() < (exp_dt + timedelta(days=90)):
                    status = "grace_period"
                    info_flags.append("within_grace_period")
                else:
                    status = "expired"
            except:
                status = "expired"
        
        if len(hard_issues) > 0 and status != "grace_period":
            if "qid_missing" in hard_issues or "name_missing" in hard_issues:
                status = "invalid"
            else:
                status = "expired"
        
        if data["confidence"] < self.conf_threshold:
            status = "invalid"
            
        data["status"] = status
        data["is_valid"] = bool(status in ["valid", "grace_period"])
        return data

    def _sanitize_for_json(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert numpy scalars to native Python types for JSON serialization."""
        sanitized = {}
        for k, v in data.items():
            if isinstance(v, np.generic):
                sanitized[k] = v.item()
            elif isinstance(v, np.ndarray):
                sanitized[k] = v.tolist()
            elif isinstance(v, list):
                sanitized[k] = [x.item() if isinstance(x, np.generic) else x for x in v]
            else:
                sanitized[k] = v
        return sanitized

    def _empty_result(self):
        return {"name": None, "qid_number": None, "dob": None, "nationality": None, "occupation": None, "expiry_date": None, "confidence": 0.0, "raw_text": [], "is_valid": False, "status": "invalid", "validation_issues": [], "orientation_corrected": False}

ocr_service = OCRService()
