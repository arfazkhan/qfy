import os
import sys

# Fix DLL Hell between PyTorch and PaddleOCR on Windows by loading torch first
try:
    sys.path.insert(0, r"d:\qfy\backend\local_packages")
    import torch
    import torchvision
except ImportError:
    pass


# --- HIGH-STRENGTH STABILITY OVERRIDES (Fixes Paddle 3.0+ Windows Bugs) ---
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_executor_type"] = "legacy"
os.environ["ONEDNN_MAX_CPU_ISA"] = "SSE41"
os.environ["PADDLE_USE_CUDA"] = "1"
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
    # Removed 'torch' modules to avoid Windows DLL conflicts
    for mod in [
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
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from paddleocr import PaddleOCR
from difflib import SequenceMatcher

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
DATE_PATTERN = re.compile(r'(\d+)[\s\./\?]*(\d+)[\s\./\?]*(\d{2,4})')
YEAR_ONLY_PATTERN = re.compile(r'^(20\d{2}|19\d{2})$')
NAME_LABEL_PATTERN = re.compile(r'NAME|NAMO|NANE|الإسم|الاسم', re.I | re.U)
ID_LABEL_PATTERN = re.compile(r'ID[\.\s]*NO|QID|Q\.?I\.?D|الرقم الشخصي', re.I | re.U)
DOB_LABEL_PATTERN = re.compile(r'D[\.\s]*O[\.\s]*B|DATE[\s]*OF[\s]*BIRTH|تاريخ الميلاد', re.I | re.U)
EXPIRY_LABEL_PATTERN = re.compile(r'EXPIRY|الصلاحية', re.I | re.U)
NATIONALITY_LABEL_PATTERN = re.compile(r'NATIONALITY|الجنسية', re.I | re.U)
OCCUPATION_LABEL_PATTERN = re.compile(r'OCCUPAT|PROFESSION|المهنة|DCCUPAT', re.I | re.U)

# Back Side Labels
PASSPORT_LABEL_PATTERN = re.compile(r'Passport[\s\.]*Number|رقم[\s]*جواز', re.I | re.U)
PASSPORT_EXP_LABEL_PATTERN = re.compile(r'Passport[\s\.]*Expiry|انتهاء[\s]*الجواز', re.I | re.U)
RESIDENCY_TYPE_LABEL_PATTERN = re.compile(r'Residency Type|نوع الرخصة', re.I | re.U)
EMPLOYER_LABEL_PATTERN = re.compile(r'Employer|المستقدم', re.I | re.U)

# Forensic Patterns
PASSPORT_PATTERN = re.compile(r'\b[A-Z]\d{7}\b|\b\d{8,9}\b', re.I)

# --- Thread-Safe Cloud Optimizations ---
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
LLM_MODEL = "amazon/nova-2-lite-v1:free"

NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
NVIDIA_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"

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
_ocr_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="ocr")

atexit.register(_cv_executor.shutdown, wait=False)
atexit.register(_ocr_executor.shutdown, wait=False)

def check_mkldnn_support() -> bool:
    # Always False for stability on Windows 3.0+ Beta
    return False

_engine_lock = threading.Lock()
_engine_instance = None

_engine_en_lock = threading.Lock()
_engine_en_instance = None

def get_ocr_engine():
    global _engine_instance
    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                logger.info("Initializing Arabic PaddleOCR Engine (PP-OCRv3)...")
                _engine_instance = PaddleOCR(
                    use_angle_cls=False,
                    lang='ar',
                    ocr_version='PP-OCRv3',
                    enable_mkldnn=False,
                    det_limit_side_len=1600,
                    det_limit_type='max',
                    rec_batch_num=8,
                    show_log=False
                )
                try:
                    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
                    _engine_instance.ocr(dummy_img)
                except Exception:
                    pass
    return _engine_instance

def get_ocr_engine_en():
    global _engine_en_instance
    if _engine_en_instance is None:
        with _engine_en_lock:
            if _engine_en_instance is None:
                logger.info("Initializing English PaddleOCR Engine (PP-OCRv3)...")
                _engine_en_instance = PaddleOCR(
                    use_angle_cls=False,
                    lang='en',
                    ocr_version='PP-OCRv3',
                    enable_mkldnn=False,
                    det_limit_side_len=1600,
                    det_limit_type='max',
                    rec_batch_num=8,
                    show_log=False
                )
                try:
                    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
                    _engine_en_instance.ocr(dummy_img)
                except Exception:
                    pass
    return _engine_en_instance


class OCRService:
    def __init__(self):
        get_ocr_engine()
        self.conf_threshold = 0.60
        self.qid_pattern = QID_PATTERN
        self.id_label_pattern = ID_LABEL_PATTERN
        self.name_label_pattern = NAME_LABEL_PATTERN
        self.dob_label_pattern = DOB_LABEL_PATTERN
        self.nat_label_pattern = NATIONALITY_LABEL_PATTERN
        self.occ_label_pattern = OCCUPATION_LABEL_PATTERN
        self.exp_label_pattern = EXPIRY_LABEL_PATTERN
        self.passport_label_pattern = PASSPORT_LABEL_PATTERN
        self.passport_exp_label_pattern = PASSPORT_EXP_LABEL_PATTERN
        self.res_type_label_pattern = RESIDENCY_TYPE_LABEL_PATTERN
        self.emp_label_pattern = EMPLOYER_LABEL_PATTERN
        self._ocr_lock = asyncio.Lock()
        self._ocr_en_lock = asyncio.Lock()

    @property
    def engine(self):
        return get_ocr_engine()

    @property
    def engine_en(self):
        return get_ocr_engine_en()

    def _preprocess_for_ocr(self, img: np.ndarray) -> np.ndarray:
        """Light preprocessing: upscale small images only, no sharpening."""
        h, w = img.shape[:2]
        # Upscale small images to minimum 900px width
        if w < 900:
            scale = 900 / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        return img

    async def perform_ocr(self, img: np.ndarray, use_en: bool = False) -> List[Any]:
        loop = asyncio.get_running_loop()
        try:
            if use_en:
                async with self._ocr_en_lock:
                    results = await loop.run_in_executor(_ocr_executor, self.engine_en.ocr, img)
            else:
                async with self._ocr_lock:
                    results = await loop.run_in_executor(_ocr_executor, self.engine.ocr, img)
            return results
        except Exception as e:
            logger.error(f"Engine.ocr execution failed: {e}")
            raise

    async def perform_dual_ocr(self, img: np.ndarray) -> List[Any]:
        """Run both Arabic and English engines in parallel, merge results."""
        ar_task = self.perform_ocr(img, use_en=False)
        en_task = self.perform_ocr(img, use_en=True)
        ar_results, en_results = await asyncio.gather(ar_task, en_task)
        return self._merge_ocr_results(ar_results, en_results)

    def _merge_ocr_results(self, ar_results, en_results) -> List[Any]:
        """Merge Arabic and English OCR results, preferring higher-confidence per block."""
        ar_blocks = self._extract_blocks_raw(ar_results)
        en_blocks = self._extract_blocks_raw(en_results)

        if not ar_blocks:
            return en_results
        if not en_blocks:
            return ar_results

        merged = []
        used_en = set()

        for ab in ar_blocks:
            best_match = None
            best_dist = 999
            for idx, eb in enumerate(en_blocks):
                if idx in used_en:
                    continue
                dy = abs(ab['cy'] - eb['cy'])
                dx = abs(ab['cx'] - eb['cx'])
                if dy < 20 and dx < 80:
                    dist = dy + dx
                    if dist < best_dist:
                        best_dist = dist
                        best_match = idx

            if best_match is not None:
                eb = en_blocks[best_match]
                used_en.add(best_match)
                ar_text = ab['text']
                en_text = eb['text']

                # Decision: which engine's result to keep
                ar_is_arabic = bool(re.search(r'[؀-ۿ]', ar_text))
                en_has_digits = bool(re.search(r'\d{3,}', en_text))
                en_has_latin = bool(re.search(r'[A-Za-z]{2,}', en_text))
                en_has_name_label = bool(re.search(r'(?i)name[:\.]', en_text))

                if en_has_name_label and en_has_latin:
                    # "Name: FULL NAME" blocks always prefer English
                    merged.append(eb)
                elif en_has_digits:
                    # Numbers are more reliable from English engine
                    merged.append(eb)
                elif ar_is_arabic and not en_has_latin:
                    merged.append(ab)
                elif ar_is_arabic and en_has_latin:
                    # Both have content — keep both (Arabic for labels, English for values)
                    merged.append(ab)
                    merged.append(eb)
                elif en_has_latin:
                    merged.append(eb)
                elif eb['conf'] > ab['conf']:
                    merged.append(eb)
                else:
                    merged.append(ab)
            else:
                merged.append(ab)

        # Add unmatched English blocks only if they don't overlap with existing merged blocks
        for idx, eb in enumerate(en_blocks):
            if idx not in used_en:
                is_duplicate = False
                for mb in merged:
                    if abs(mb['cy'] - eb['cy']) < 20 and abs(mb['cx'] - eb['cx']) < 80:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    merged.append(eb)

        paddle_format = []
        for b in merged:
            paddle_format.append([b['bbox'], (b['text'], b['conf'])])
        return [paddle_format]

    def _extract_blocks_raw(self, ocr_results) -> List[Dict]:
        """Extract blocks with bbox, text, conf, cx, cy from raw OCR results."""
        blocks = []
        if not ocr_results:
            return blocks

        data = ocr_results
        if isinstance(data, list) and data and isinstance(data[0], list):
            if data[0] and isinstance(data[0][0], list):
                data = data[0]

        if isinstance(data, list):
            for res in data:
                if isinstance(res, (list, tuple)) and len(res) >= 2:
                    bbox = res[0]
                    text_conf = res[1]
                    if isinstance(text_conf, (list, tuple)) and len(text_conf) >= 2:
                        text, conf = str(text_conf[0]), float(text_conf[1])
                        try:
                            bbox_np = np.array(bbox)
                            if bbox_np.shape[0] >= 4:
                                cx = (bbox_np[0][0] + bbox_np[2][0]) / 2
                                cy = (bbox_np[0][1] + bbox_np[2][1]) / 2
                                blocks.append({'bbox': bbox, 'text': text, 'conf': conf, 'cx': cx, 'cy': cy})
                        except:
                            pass
        return blocks

    def _get_raw_lines(self, ocr_results: Any) -> List[str]:
        """Safely extracts text lines from various PaddleOCR result formats."""
        if not ocr_results:
            return []
        
        # Handle PaddleOCR 2.x/3.x nested list format: [ [[box, [text, conf]], ...] ]
        if isinstance(ocr_results, list) and len(ocr_results) > 0 and isinstance(ocr_results[0], list):
            # Check if it's the double-nested version
            if len(ocr_results[0]) > 0 and isinstance(ocr_results[0][0], list):
                ocr_results = ocr_results[0]
        
        lines = []
        if isinstance(ocr_results, list):
            for res in ocr_results:
                # Format: [box, [text, conf]]
                if isinstance(res, (list, tuple)) and len(res) > 1 and isinstance(res[1], (list, tuple)):
                    lines.append(str(res[1][0]))
                # Format: some other variants might exist
        elif isinstance(ocr_results, dict):
            # PaddleX/PaddleOCR dict format
            lines = [str(t) for t in ocr_results.get("rec_texts", [])]
            
        return lines
    
    async def detect_corners(self, img: np.ndarray) -> List[Dict[str, int]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_cv_executor, self._sync_detect_corners, img)

    def _sync_detect_corners(self, img: np.ndarray) -> List[Dict[str, int]]:
        h, w = img.shape[:2]
        
        # Ensure we are in landscape for detection if possible
        if h > w:
            img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            h, w = img.shape[:2]

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
            # Order points: TL, TR, BR, BL
            rect = self._order_points(screenCnt.reshape(4, 2))
            return [{"x": int(p[0]), "y": int(p[1])} for p in rect]
        
        # Fallback to a centered rectangle
        margin_w = int(w * 0.1)
        margin_h = int(h * 0.1)
        return [
            {"x": margin_w, "y": margin_h},
            {"x": w - margin_w, "y": margin_h},
            {"x": w - margin_w, "y": h - margin_h},
            {"x": margin_w, "y": h - margin_h}
        ]

    async def warp_and_extract(self, img: np.ndarray, corners: List[Dict[str, int]], doc_type: str = "AUTO") -> Dict[str, Any]:
        loop = asyncio.get_running_loop()

        rect = np.array([[p["x"], p["y"]] for p in corners], dtype="float32")
        (tl, tr, br, bl) = rect

        w_pad = (tr[0] - tl[0]) * 0.05
        h_pad = (bl[1] - tl[1]) * 0.05
        tl = [tl[0] - w_pad, tl[1] - h_pad]
        tr = [tr[0] + w_pad, tr[1] - h_pad]
        br = [br[0] + w_pad, br[1] + h_pad]
        bl = [bl[0] - w_pad, bl[1] + h_pad]
        rect = np.array([tl, tr, br, bl], dtype="float32")

        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))

        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))

        dst = np.array([[0, 0], [maxWidth-1, 0], [maxWidth-1, maxHeight-1], [0, maxHeight-1]], dtype="float32")
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

        warped_img, flip_corrected = self._check_and_fix_180(warped)

        # Preprocess warped image
        warped_enhanced = self._preprocess_for_ocr(warped_img)
        results = await self.perform_dual_ocr(warped_enhanced)
        h, w = warped_enhanced.shape[:2]
        extracted = self._parse_spatial_results(results, img_width=w)
        extracted["orientation_corrected"] = flip_corrected

        return self._validate_result(extracted)

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


    def _is_back_side(self, raw_lines: List[str]) -> bool:
        """Detect if image is a back side of QID (has passport/serial/employer labels)."""
        back_keywords = 0
        front_keywords = 0
        for line in raw_lines:
            upper = line.upper()
            if any(k in upper for k in ["PASSPORT", "SERIAL", "EMPLOYER", "RESIDENCY TYPE", "المستقدم", "المسلسل", "جواز"]):
                back_keywords += 1
            if any(k in upper for k in ["D.O.B", "NATIONALITY", "NAME:", "الجنسية", "الميلاد"]):
                front_keywords += 1
        return back_keywords >= 2 and back_keywords > front_keywords

    def _is_passport_doc(self, raw_lines: List[str]) -> bool:
        """Detect if document is a standalone passport (not back of QID)."""
        for line in raw_lines:
            clean = line.upper().replace(" ", "")
            if clean.startswith("P<") or clean.count("<") > 10:
                return True
            # "PASSPORT" alone is NOT sufficient — back side of QID also says "Passport Number"
            # Only flag as passport if there's MRZ-like content or explicit passport page indicators
            if "REPUBLIC" in clean or "KINGDOM" in clean or "GOVERNMENT" in clean:
                if "PASSPORT" in clean:
                    return True
        return False

    async def process_image(self, image_bytes: bytes, doc_type: str = "AUTO", engine: str = "paddle", return_debug_image: bool = True) -> Dict[str, Any]:
        if len(image_bytes) > MAX_IMAGE_BYTES: raise ValueError("Payload too large")
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_raw = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_raw is None: raise ValueError("Invalid image")

        h, w = img_raw.shape[:2]

        # --- Auto-Split for Stacked IDs ---
        if h > (w * 1.3):
            logger.info("Stacked ID detected. Splitting image into front/back halves.")
            mid = h // 2
            front_half = img_raw[:mid, :]
            back_half = img_raw[mid:, :]

            _, front_buf = cv2.imencode('.png', front_half)
            _, back_buf = cv2.imencode('.png', back_half)

            return await self.process_id_pair(front_buf.tobytes(), back_buf.tobytes(), return_debug_images=return_debug_image)

        if img_raw.shape[0] * img_raw.shape[1] > MAX_PIXELS: raise ValueError("Image too large")

        if return_debug_image:
            _, buffer = cv2.imencode('.jpg', img_raw, [cv2.IMWRITE_JPEG_QUALITY, 85])
            debug_image = base64.b64encode(buffer).decode('utf-8')
        else:
            debug_image = None

        # --- Preprocess for better OCR ---
        img_enhanced = self._preprocess_for_ocr(img_raw)

        # --- Step 1: Dual-pass OCR (English for digits/names, Arabic for labels) ---
        ocr_results = await self.perform_dual_ocr(img_enhanced)
        h_e, w_e = img_enhanced.shape[:2]

        # Determine document type
        raw_lines = self._get_raw_lines(ocr_results)

        is_passport = self._is_passport_doc(raw_lines)
        is_back = self._is_back_side(raw_lines)

        if is_passport:
            doc_type_detected = "PASSPORT"
        elif is_back:
            doc_type_detected = "QID_BACK"
        else:
            doc_type_detected = "QID"
        logger.info(f"Auto-detected document type: {doc_type_detected}")

        if doc_type_detected == "PASSPORT":
            extracted = await self.process_passport(image_bytes)
        elif doc_type_detected == "QID_BACK":
            extracted = self._parse_spatial_results(ocr_results, img_width=w_e)
            extracted["id_type"] = "QID_BACK"
            # Extract QID from Serial Number (format: 308XXXXXXXXXXX where X's contain QID)
            if not extracted.get("qid_number"):
                for line in raw_lines:
                    digits = re.sub(r'\D', '', line)
                    if len(digits) >= 14:
                        # Serial format: 3-digit prefix + 11-digit QID
                        candidate = digits[3:14]
                        if QID_PATTERN.match(candidate):
                            extracted["qid_number"] = candidate
                            break
                    elif len(digits) == 11:
                        if QID_PATTERN.match(digits):
                            extracted["qid_number"] = digits
                            break
            # Fix residency type — look for common values in raw text
            if not extracted.get("residency_type") or extracted["residency_type"] in ["Type:", "Residency", "Type"]:
                res_types = {"عمل": "عمل", "WORK": "عمل", "عائلة": "عائلة", "FAMILY": "عائلة"}
                for line in raw_lines:
                    for key, val in res_types.items():
                        if key in line:
                            extracted["residency_type"] = val
                            break
        else:
            # Try direct extraction first
            extracted = self._parse_spatial_results(ocr_results, img_width=w_e)

            # If we have core fields, return immediately (no warp needed)
            if extracted.get("qid_number") and extracted.get("name") and len(extracted["name"]) > 4:
                logger.info("Direct extraction successful — skipping warp.")
                extracted["original_width"] = w
                extracted["original_height"] = h
            else:
                # Try corner detection + warp only if direct failed
                corners = await self.detect_corners(img_raw)
                warped_result = await self.warp_and_extract(img_raw, corners, doc_type="QID")

                if self._result_score(warped_result) > self._result_score(extracted):
                    extracted = warped_result
                extracted["detected_corners"] = corners
                extracted["original_width"] = w
                extracted["original_height"] = h

        if return_debug_image:
            extracted["processed_image"] = debug_image

        return self._sanitize_for_json(extracted)

    def _result_score(self, result: Dict[str, Any]) -> int:
        """Score a result by how many key fields are populated."""
        score = 0
        if result.get("qid_number"): score += 3
        if result.get("name") and len(result["name"]) > 3: score += 3
        if result.get("dob"): score += 2
        if result.get("expiry_date"): score += 2
        if result.get("nationality"): score += 1
        if result.get("occupation"): score += 1
        if result.get("passport_number"): score += 2
        if result.get("employer"): score += 1
        return score

    async def process_id_pair(self, front_bytes: bytes, back_bytes: bytes, return_debug_images: bool = False) -> Dict[str, Any]:
        """Processes both sides of an ID and merges them into a single high-fidelity result."""
        # Process both in parallel with timeout/safety
        try:
            front_task = self.process_image(front_bytes, return_debug_image=return_debug_images)
            back_task = self.process_image(back_bytes, return_debug_image=return_debug_images)
            front_res, back_res = await asyncio.gather(front_task, back_task, return_exceptions=True)
            
            # Handle potential task failures
            if isinstance(front_res, Exception): 
                logger.error(f"Front side processing failed: {front_res}")
                front_res = self._empty_result()
            if isinstance(back_res, Exception):
                logger.error(f"Back side processing failed: {back_res}")
                back_res = self._empty_result()
        except Exception as e:
            logger.error(f"Pair processing crashed: {e}")
            return self._empty_result()
        
        # Merge logic: Start with front as base
        merged = front_res.copy()
        
        # Fill in missing fields from back
        for key in ["passport_number", "passport_expiry", "residency_type", "employer", "occupation", "qid_number"]:
            if not merged.get(key) or len(str(merged[key])) < 3:
                if back_res.get(key):
                    merged[key] = back_res[key]
        
        # QID Merging Logic (Serial Number Check)
        front_qid = merged.get("qid_number")
        # Check if back found a QID (e.g. in Serial No: 301XXXXXXXXXXX)
        back_qid = back_res.get("qid_number")
        if not back_qid:
            for text in back_res.get("raw_text", []):
                # Look for 11 digits at end of string (Serial No fallback)
                digits = re.sub(r'\D', '', text)
                if len(digits) >= 11:
                    back_qid = digits[-11:]
                    break

        if front_qid and back_qid and front_qid != back_qid:
            # Score them based on DOB/Nationality
            f_score = self._score_qid(front_qid, merged.get("dob"), merged.get("nationality"))
            b_score = self._score_qid(back_qid, merged.get("dob"), merged.get("nationality"))
            if b_score > f_score:
                logger.info(f"Preferring Back Side QID: {back_qid} (Score {b_score}) over Front Side: {front_qid} (Score {f_score})")
                merged["qid_number"] = back_qid

        # Update raw text for audit trail
        merged["raw_text"] = front_res.get("raw_text", []) + back_res.get("raw_text", [])
        
        if return_debug_images:
            merged["processed_image"] = front_res.get("processed_image")
            merged["processed_back_image"] = back_res.get("processed_image")

        # Re-run validation on the merged object
        return self._validate_result(merged)

    def _score_qid(self, qid: str, dob: Optional[str], nationality: Optional[str]) -> int:
        """Scores a QID based on its alignment with known facts (DOB, Nationality)."""
        if not qid or len(qid) != 11: return 0
        score = 0
        
        # Heuristic 1: DOB Alignment (Century + Year)
        if dob:
            try:
                # DOB format: DD/MM/YYYY or YYYY-MM-DD
                year_part = ""
                if '/' in dob: year_part = dob.split('/')[-1]
                elif '-' in dob: year_part = dob.split('-')[0]
                
                if len(year_part) == 4:
                    century = "2" if year_part.startswith("19") else "3"
                    year_short = year_part[2:]
                    if qid.startswith(century + year_short): score += 10
                    elif qid[1:3] == year_short: score += 5
            except: pass
            
        # Heuristic 2: Nationality Alignment (India=356, Qatar=634, etc.)
        nat_codes = {
            "INDIA": "356", "الهند": "356", "INDIAN": "356",
            "QATAR": "634", "قطر": "634", "QATARI": "634",
            "PAKISTAN": "586", "باكستان": "586",
            "NEPAL": "524", "نيبال": "524",
            "PHILIPPINES": "608", "الفلبين": "608",
            "BANGLADESH": "050", "بنجلاديش": "050",
            "SRI LANKA": "144", "سريلانكا": "144",
            "EGYPT": "818", "مصر": "818"
        }
        if nationality:
            u_nat = str(nationality).upper()
            for name, code in nat_codes.items():
                if name in u_nat:
                    if qid[3:6] == code: score += 10
                    break
                    
        return score

    def _validate_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Final stabilization and sanity checks."""
        # Auto-correct QID if possible using DOB/Nationality
        qid = data.get("qid_number")
        dob = data.get("dob")
        nat = data.get("nationality")
        
        if qid and len(qid) == 11 and (dob or nat):
            corrected_qid = list(qid)
            # Correct century/year from DOB
            if dob:
                try:
                    parts = dob.split('/')
                    if len(parts) == 3:
                        century = "2" if parts[2].startswith("19") else "3"
                        year_short = parts[2][2:]
                        if corrected_qid[0] != century: corrected_qid[0] = century
                        if "".join(corrected_qid[1:3]) != year_short:
                            corrected_qid[1] = year_short[0]
                            corrected_qid[2] = year_short[1]
                except: pass
            
            # Correct nationality code
            nat_codes = {
                "INDIA": "356", "الهند": "356", "INDIAN": "356",
                "QATAR": "634", "قطر": "634", "QATARI": "634",
                "PAKISTAN": "586", "باكستان": "586",
                "NEPAL": "524", "نيبال": "524",
                "PHILIPPINES": "608", "الفلبين": "608",
                "BANGLADESH": "050", "بنجلاديش": "050",
                "SRI LANKA": "144", "سريلانكا": "144",
                "EGYPT": "818", "مصر": "818"
            }
            if nat:
                upper_nat = str(nat).upper()
                for name, code in nat_codes.items():
                    if name in upper_nat:
                        if "".join(corrected_qid[3:6]) != code:
                            corrected_qid[3] = code[0]
                            corrected_qid[4] = code[1]
                            corrected_qid[5] = code[2]
                        break
            
            final_qid = "".join(corrected_qid)
            if final_qid != qid:
                logger.info(f"Heuristic QID Correction: {qid} -> {final_qid}")
                data["qid_number"] = final_qid

        # Basic status checks
        data["is_valid"] = bool(data.get("name") and data.get("qid_number"))
        data["status"] = "valid" if data["is_valid"] else "incomplete"
        
        return data

    def _parse_mrz(self, lines: List[str]) -> Optional[Dict[str, Any]]:
        """Detects and parses TD3 format MRZ lines with error-correction."""
        mrz_candidates = []
        for line in lines:
            # Clean but preserve chevrons
            clean = re.sub(r'[^A-Z0-9<]', '', line.upper())
            # TD3 lines are exactly 44 chars. We allow 40-50 for OCR noise.
            if len(clean) >= 40:
                # Count chevrons - MRZ lines are characterized by high chevron density
                chevron_count = clean.count('<')
                if chevron_count >= 5:
                    mrz_candidates.append(clean)
        
        # Look for two adjacent candidates that look like Line 1 and Line 2
        mrz_lines = []
        for i in range(len(mrz_candidates)):
            # Line 1 usually starts with P (Passport)
            if i + 1 < len(mrz_candidates):
                # Try to identify which is line 1 and which is line 2
                # Line 1: Starts with P, contains name
                # Line 2: Starts with Passport No, contains DOB/EXP
                c1, c2 = mrz_candidates[i], mrz_candidates[i+1]
                
                # Heuristic: Line 1 usually has more chevrons than Line 2 due to name padding
                if c1.count('<') > c2.count('<') or c1.startswith('P'):
                    mrz_lines = [c1, c2]
                    break
        
        if not mrz_lines: return None
        try:
            line1, line2 = mrz_lines
            # Standard TD3: Line 1 (P<CCC_SURNAME<<GIVEN_NAMES...)
            name_part = line1[5:]
            parts = [p for p in name_part.split('<<') if p]
            surname = parts[0].replace('<', ' ').strip() if parts else ""
            given_names = parts[1].replace('<', ' ').strip() if len(parts) > 1 else ""
            
            # Line 2: Passport (9) + Check (1) + Nationality (3) + DOB (6) + Check (1) + Sex (1) + Exp (6)
            passport_no = line2[0:9].replace('<', '').strip()
            nationality_code = line2[10:13].replace('<', '').strip()
            dob_raw, sex, expiry_raw = line2[13:19], line2[20], line2[21:27]
            
            def fix_date(raw, is_dob=True):
                yy = int(raw[0:2])
                curr_yy = datetime.now().year % 100
                century = "19" if is_dob and yy > curr_yy else "20"
                return f"{raw[4:6]}/{raw[2:4]}/{century}{yy:02d}"
            
            return {
                "name": f"{given_names} {surname}".strip(),
                "passport_number": passport_no,
                "nationality": nationality_code,
                "dob": fix_date(dob_raw, True),
                "expiry_date": fix_date(expiry_raw, False),
                "sex": sex, "confidence": 0.99, "id_type": "PASSPORT", "mrz_detected": True
            }
        except: return None

    async def process_passport(self, image_bytes: bytes) -> Dict[str, Any]:
        """High-accuracy Passport extraction using Dual-Pass MRZ + Vision LLM."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        h, w = img.shape[:2]

        # Pass 1: Global OCR
        ocr_results = await self.perform_ocr(img)
        raw_lines = self._get_raw_lines(ocr_results)
        
        mrz_data = self._parse_mrz(raw_lines)
        
        # Pass 2: Focused MRZ Crop (Bottom 30% of image)
        if not mrz_data:
            logger.info("MRZ not found in global pass. Attempting focused bottom-crop pass...")
            mrz_zone = img[int(h*0.7):, :]
            # Apply thresholding for better machine-readable text
            gray_mrz = cv2.cvtColor(mrz_zone, cv2.COLOR_BGR2GRAY)
            mrz_thresh = cv2.adaptiveThreshold(gray_mrz, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            # Re-run OCR on high-contrast crop
            mrz_results = await self.perform_ocr(cv2.merge([mrz_thresh, mrz_thresh, mrz_thresh]))
            mrz_lines_focused = self._get_raw_lines(mrz_results)
            mrz_data = self._parse_mrz(mrz_lines_focused)
        if mrz_data:
            logger.info("MRZ detected and parsed successfully.")
            return self._validate_result(mrz_data)

        if not OPENROUTER_API_KEY and not NVIDIA_API_KEY:
            logger.error("No API keys for Vision LLM. Returning OCR best-effort.")
            return self._parse_spatial_results(ocr_results)
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        data_url = f"data:image/jpeg;base64,{image_base64}"
        prompt = "Extract details from this Passport. Focus on MRZ lines. Return ONLY JSON: {name, passport_number, nationality, dob, expiry_date, sex, confidence}"
        url, headers = (NVIDIA_URL, {"Authorization": f"Bearer {NVIDIA_API_KEY}", "Content-Type": "application/json"}) if NVIDIA_API_KEY else (OPENROUTER_URL, {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"})
        payload = {"model": NVIDIA_MODEL if NVIDIA_API_KEY else LLM_MODEL, "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": data_url}}]}], "temperature": 0.1, "max_tokens": 1024}
        if not NVIDIA_API_KEY: payload["response_format"] = {"type": "json_object"}

        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, lambda: requests.post(url, headers=headers, json=payload, timeout=30))
            content = response.json().get("choices", [])[0].get("message", {}).get("content", "{}")
            if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
            extracted = json.loads(content)
            result = self._empty_result()
            result.update({"name": extracted.get("name"), "passport_number": extracted.get("passport_number"), "id_type": "PASSPORT", "nationality": extracted.get("nationality"), "dob": extracted.get("dob"), "expiry_date": extracted.get("expiry_date"), "confidence": 0.95})
            return self._validate_result(result)
        except Exception as e:
            logger.error(f"Passport LLM failed: {e}")
            # Fallback to OCR parsing on raw image results
            # We need to get ocr_results from somewhere, but for now we'll just return empty or re-run
            return self._parse_spatial_results([], img_width=CARD_WIDTH)
    def _get_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx, img_width=CARD_WIDTH) -> Optional[str]:
        """Collects the value associated with a label, using spatial proximity."""
        if not label_block or not current_row: return None

        ALL_LABEL_PATTERNS = [
            self.id_label_pattern, self.dob_label_pattern, self.nat_label_pattern,
            self.exp_label_pattern, self.name_label_pattern, self.occ_label_pattern,
            EMPLOYER_LABEL_PATTERN, RESIDENCY_TYPE_LABEL_PATTERN, PASSPORT_LABEL_PATTERN,
            PASSPORT_EXP_LABEL_PATTERN
        ]

        def is_label(text):
            tu = text.upper().strip(': ')
            return any(p.search(tu) for p in ALL_LABEL_PATTERNS)

        def is_noise(text):
            t = text.strip()
            if len(t) < 2: return True
            if QID_PATTERN.search(t): return True
            if DATE_PATTERN.search(t): return True
            return False

        results = []

        # 1. Check inline (label contains value after colon)
        if ':' in label_block['text']:
            val = label_block['text'].split(':', 1)[1].strip()
            if len(val) > 1 and not is_label(val):
                results.append(val)

        # 2. Check RIGHT in same row (primary for English labels)
        for k in range(col_idx + 1, len(current_row)):
            block = current_row[k]
            text = block['text'].strip(': ')
            if is_noise(text): continue
            if is_label(text): break
            results.append(text)

        # 3. If no results or Arabic-only, check LEFT (for Arabic RTL layout)
        if not results:
            for k in range(col_idx - 1, -1, -1):
                block = current_row[k]
                text = block['text'].strip(': ')
                if is_noise(text): continue
                if is_label(text): break
                results.append(text)

        # 4. Check ONE row below only (not aggressive multi-row)
        if not results and row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx + 1]:
                if abs(block['cx'] - label_block['cx']) < (img_width * 0.35):
                    text = block['text'].strip(': ')
                    if is_noise(text): continue
                    if is_label(text): break
                    results.append(text)

        if not results:
            return None

        # Clean and join
        final = " ".join(results).strip()
        # Remove any label text that leaked in
        for p in ALL_LABEL_PATTERNS:
            final = p.sub('', final).strip(': ')
        return final.strip() if len(final.strip()) > 1 else None

    def _get_numeric_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx, img_width=CARD_WIDTH) -> Optional[str]:
        """Lookup for numeric fields (Serial, Passport). Bypasses text filters."""
        if not label_block or not current_row: return None
        
        # Check inline
        if ':' in label_block['text']:
            val = label_block['text'].split(':', 1)[1].strip()
            # Allow any alphanumeric string with at least 3 digits
            if sum(c.isdigit() for c in val) >= 3: return val

        # Check RIGHT and LEFT
        for offset in [1, -1]:
            new_idx = col_idx + offset
            if 0 <= new_idx < len(current_row):
                val = current_row[new_idx]['text']
                if sum(c.isdigit() for c in val) >= 3: return val
        
        # Check BELOW
        if row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx+1]:
                if abs(block['cx'] - label_block['cx']) < (img_width * 0.20):
                    val = block['text'].strip()
                    if sum(c.isdigit() for c in val) >= 3: return val
        return None

    def _get_qid_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx, img_width=CARD_WIDTH) -> Optional[str]:
        """Direction-aware QID lookup."""
        if not label_block or not current_row: return None
        
        # Check inline
        if ':' in label_block['text']:
            val = label_block['text'].split(':', 1)[1].strip()
            if QID_PATTERN.search(val): return QID_PATTERN.search(val).group()

        # Check RIGHT and LEFT
        for offset in [1, -1]:
            new_idx = col_idx + offset
            if 0 <= new_idx < len(current_row):
                val = current_row[new_idx]['text']
                if QID_PATTERN.search(val): return QID_PATTERN.search(val).group()
        
        # Check BELOW
        if row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx+1]:
                if abs(block['cx'] - label_block['cx']) < (img_width * 0.20):
                    if QID_PATTERN.search(block['text']): return QID_PATTERN.search(block['text']).group()
    def _get_date_spatial_value(self, label_block, current_row, all_rows, row_idx, col_idx, img_width=CARD_WIDTH) -> Optional[str]:
        """Direction-aware date lookup with split-year support."""
        if not label_block or not current_row: return None
        
        # Helper to find year in nearby rows
        def find_nearby_year(start_row_idx, cx_limit):
            for r_idx in range(start_row_idx, min(start_row_idx + 3, len(all_rows))):
                for b in all_rows[r_idx]:
                    if YEAR_ONLY_PATTERN.match(b['text'].strip()) and abs(b['cx'] - cx_limit) < (img_width * 0.3):
                        return b['text'].strip()
            return None

        # 1. Check inline
        if ':' in label_block['text']:
            val = label_block['text'].split(':', 1)[1].strip()
            if DATE_PATTERN.search(val): return self._normalize_date(DATE_PATTERN.search(val).group())

        # 2. Check RIGHT and LEFT
        for offset in [1, -1]:
            new_idx = col_idx + offset
            if 0 <= new_idx < len(current_row):
                val = current_row[new_idx]['text'].strip()
                if DATE_PATTERN.search(val): return self._normalize_date(DATE_PATTERN.search(val).group())
                # Partial date check (e.g. 30/01)
                if re.match(r'^\d{1,2}/\d{1,2}$', val):
                    year = find_nearby_year(row_idx, current_row[new_idx]['cx'])
                    if year: return self._normalize_date(f"{val}/{year}")
        
        # 3. Check BELOW
        if row_idx + 1 < len(all_rows):
            for block in all_rows[row_idx+1]:
                if abs(block['cx'] - label_block['cx']) < (img_width * 0.30):
                    val = block['text'].strip()
                    if DATE_PATTERN.search(val): return self._normalize_date(DATE_PATTERN.search(val).group())
                    if re.match(r'^\d{1,2}/\d{1,2}$', val):
                        year = find_nearby_year(row_idx + 1, block['cx'])
                        if year: return self._normalize_date(f"{val}/{year}")
        return None

    def _parse_spatial_results(self, results, img_width=CARD_WIDTH) -> Dict[str, Any]:
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
                # Look for dates specifically in this row
                row_dates = []
                for b in row:
                    for match in DATE_PATTERN.finditer(b['text']):
                        row_dates.append(f"{match.group(1)}/{match.group(2)}/{match.group(3)}")
                
                if row_dates:
                    # If multiple dates in row, we usually want the one after the label
                    data["dob"] = row_dates[0]

            # --- Expiry Extraction ---
            if self.exp_label_pattern.search(row_text):
                row_dates = []
                for b in row:
                    for match in DATE_PATTERN.finditer(b['text']):
                        row_dates.append(f"{match.group(1)}/{match.group(2)}/{match.group(3)}")
                
                if row_dates:
                    # If both DOB and Expiry are in same row (rare), Expiry is usually second
                    data["expiry_date"] = row_dates[-1]

            # --- Passport Expiry Extraction ---
            if not data["passport_expiry"] and PASSPORT_EXP_LABEL_PATTERN.search(row_text):
                row_dates = []
                for b in row:
                    for match in DATE_PATTERN.finditer(b['text']):
                        row_dates.append(f"{match.group(1)}/{match.group(2)}/{match.group(3)}")
                if row_dates:
                    # Passport Expiry is usually the date in this row
                    data["passport_expiry"] = row_dates[0]
            
            # --- Passport Number Extraction ---
            if not data["passport_number"] and PASSPORT_LABEL_PATTERN.search(row_text):
                # Look for passport pattern in row
                for b in row:
                    match = PASSPORT_PATTERN.search(b['text'])
                    if match:
                        data["passport_number"] = match.group().upper()
                        break

            # --- Residency Type Extraction ---
            if not data["residency_type"] and RESIDENCY_TYPE_LABEL_PATTERN.search(row_text):
                # The residency type (e.g., 'Work', 'Family') is usually a short word in this row
                for b in row:
                    # Skip the labels themselves
                    if not RESIDENCY_TYPE_LABEL_PATTERN.search(b['text']):
                        # Basic heuristic: if it's not a label and not a date/number
                        if len(b['text']) >= 2 and not DATE_PATTERN.search(b['text']):
                            data["residency_type"] = b['text']
                            break

            # --- Employer Extraction ---
            if not data["employer"] and EMPLOYER_LABEL_PATTERN.search(row_text):
                # The employer is usually the remainder of the row or a specific block
                for b in row:
                    if not EMPLOYER_LABEL_PATTERN.search(b['text']) and len(b['text']) > 3:
                        if not DATE_PATTERN.search(b['text']) and not QID_PATTERN.search(b['text']):
                            data["employer"] = b['text']
                            break

            # Collect all dates for heuristic fallback
            for j, b in enumerate(row):
                # 1. Direct match
                for match in DATE_PATTERN.finditer(b['text']):
                    all_dates.append(match.group())
                # 2. Split match (DD/MM in current row, Year nearby)
                if re.match(r'^\d{1,2}/\d{1,2}$', b['text'].strip()):
                    # Explicitly hunt for year in next 3 rows (it's often split by labels)
                    year = None
                    for offset in range(1, 4):
                        if i + offset < len(rows):
                            for next_b in rows[i + offset]:
                                if YEAR_ONLY_PATTERN.match(next_b['text'].strip()):
                                    year = next_b['text'].strip()
                                    break
                        if year: break
                    if year:
                        joined_date = f"{b['text'].strip()}/{year}"
                        all_dates.append(joined_date)

            # Labels
            for j, block in enumerate(row):
                tu = block['text'].upper()
                
                # Name Extraction with English Priority
                if NAME_LABEL_PATTERN.search(tu):
                    val = self._get_spatial_value(block, row, rows, i, j, img_width=img_width)
                    if val:
                        # If we have nothing, or if we have Arabic but found English, update
                        current_is_arabic = bool(re.search(r'[\u0600-\u06FF]', data["name"] or ""))
                        new_is_english = not bool(re.search(r'[\u0600-\u06FF]', val))
                        
                        if not data["name"] or (current_is_arabic and new_is_english):
                            data["name"] = val

                if not data["qid_number"] and ID_LABEL_PATTERN.search(tu):
                    val = self._get_qid_spatial_value(block, row, rows, i, j, img_width=img_width)
                    if val: data["qid_number"] = val
                
                if NATIONALITY_LABEL_PATTERN.search(tu): 
                    val = self._get_spatial_value(block, row, rows, i, j, img_width=img_width)
                    if val:
                        # Prefer English or update if missing
                        current_is_arabic = bool(re.search(r'[\u0600-\u06FF]', data["nationality"] or ""))
                        new_is_english = not bool(re.search(r'[\u0600-\u06FF]', val))
                        if not data["nationality"] or (current_is_arabic and new_is_english):
                            data["nationality"] = val
                
                if OCCUPATION_LABEL_PATTERN.search(tu): 
                    val = self._get_spatial_value(block, row, rows, i, j, img_width=img_width)
                    if val:
                        # Similar priority for occupation
                        current_is_arabic = bool(re.search(r'[\u0600-\u06FF]', data["occupation"] or ""))
                        new_is_english = not bool(re.search(r'[\u0600-\u06FF]', val))
                        if not data["occupation"] or (current_is_arabic and new_is_english):
                            data["occupation"] = val

                if not data["passport_number"] and PASSPORT_LABEL_PATTERN.search(tu):
                    data["passport_number"] = self._get_numeric_spatial_value(block, row, rows, i, j, img_width=img_width)
                
                if not data["passport_expiry"] and PASSPORT_EXP_LABEL_PATTERN.search(tu):
                    data["passport_expiry"] = self._get_date_spatial_value(block, row, rows, i, j, img_width=img_width)
                
                if not data["residency_type"] and RESIDENCY_TYPE_LABEL_PATTERN.search(tu):
                    data["residency_type"] = self._get_spatial_value(block, row, rows, i, j, img_width=img_width)
                
                if not data["employer"] and EMPLOYER_LABEL_PATTERN.search(tu):
                    data["employer"] = self._get_spatial_value(block, row, rows, i, j, img_width=img_width)
        
        # --- Forensic Fallback (Aggressive) ---
        for i, row in enumerate(rows):
            row_text = " ".join([b['text'] for b in row]).upper()

            if (not data["occupation"] or len(data["occupation"]) < 3) and OCCUPATION_LABEL_PATTERN.search(row_text):
                for j, b in enumerate(row):
                    if OCCUPATION_LABEL_PATTERN.search(b['text']):
                        val = self._get_spatial_value(b, row, rows, i, j, img_width=img_width)
                        if val and len(val) >= 3:
                            data["occupation"] = val
                            break

            if not data["employer"] and EMPLOYER_LABEL_PATTERN.search(row_text):
                for j, b in enumerate(row):
                    if EMPLOYER_LABEL_PATTERN.search(b['text']):
                        data["employer"] = self._get_spatial_value(b, row, rows, i, j, img_width=img_width)

            if not data["residency_type"] and RESIDENCY_TYPE_LABEL_PATTERN.search(row_text):
                for j, b in enumerate(row):
                    if RESIDENCY_TYPE_LABEL_PATTERN.search(b['text']):
                        data["residency_type"] = self._get_spatial_value(b, row, rows, i, j, img_width=img_width)

        # --- "Name:" line at bottom of card ---
        # QID cards have "Name: FULL NAME" printed at the very bottom
        # Use the longest single block containing "Name: ..." to avoid merge noise
        best_name_candidate = None
        for i, row in enumerate(rows):
            for b in row:
                name_match = re.search(r'(?:Name|NAMO)\s*[:\.]?\s*([A-Za-z].+)', b['text'], re.I)
                if name_match:
                    candidate = name_match.group(1).strip()
                    candidate = re.sub(r'[^A-Za-z\s]', '', candidate).strip()
                    candidate = re.sub(r'\s+', ' ', candidate).upper()
                    if len(candidate) > 4 and (not best_name_candidate or len(candidate) > len(best_name_candidate)):
                        best_name_candidate = candidate

        if best_name_candidate:
            data["name"] = best_name_candidate

        self._apply_heuristics(blocks, all_dates, data)
        return data

    def _deduplicate_name(self, name: str) -> str:
        """Remove duplicate/near-duplicate words from dual-engine merge noise."""
        if not name:
            return name
        words = name.upper().split()
        if len(words) <= 1:
            return name

        # Strategy: detect if this looks like a duplicated sequence
        # e.g. "HIJAS KHAN AFNAZ HIJAS KHAN AFNAZ KHAN" → "HIJAS KHAN AFNAZ KHAN"
        # Try to find the longest non-repeating prefix
        best = words
        for split_point in range(2, len(words)):
            prefix = words[:split_point]
            rest = words[split_point:]
            # Check if rest is a (possibly fuzzy) repeat of prefix
            is_repeat = True
            for i, rw in enumerate(rest):
                if i >= len(prefix):
                    # Extra words beyond the repeat — keep them
                    is_repeat = False
                    break
                ratio = SequenceMatcher(None, rw, prefix[i]).ratio()
                if ratio < 0.6:
                    is_repeat = False
                    break
            if is_repeat and len(rest) <= len(prefix):
                # This is a duplicated prefix — keep prefix + any extra from rest
                remaining_extra = rest[len(prefix):]
                candidate = prefix + remaining_extra
                if len(candidate) <= len(best):
                    best = candidate

        # Remove fuzzy duplicate ADJACENT words (e.g. AFNAZ AFNIZ → AFNAZ)
        final = [best[0]]
        for i in range(1, len(best)):
            ratio = SequenceMatcher(None, best[i], final[-1]).ratio()
            if ratio > 0.75 and best[i] == final[-1]:
                # Exact adjacent duplicate — skip
                continue
            elif ratio > 0.8 and len(best[i]) < len(final[-1]):
                # Fuzzy adjacent dup, keep longer
                continue
            elif ratio > 0.8 and len(best[i]) > len(final[-1]):
                # Fuzzy adjacent dup, replace with longer
                final[-1] = best[i]
            else:
                final.append(best[i])

        return " ".join(final)

    def _normalize_text(self, text: str) -> str:
        """Converts Eastern Arabic numerals and cleans script noise."""
        if not text: return ""
        arabic_digits = "٠١٢٣٤٥٦٧٨٩"
        western_digits = "0123456789"
        trans = str.maketrans(arabic_digits, western_digits)
        return text.translate(trans).strip()

    def _normalize_date(self, date_str: str) -> str:
        """Pads single-digit day/month and handles 2/4 digit years."""
        if not date_str: return None
        logger.debug(f"Normalizing date: {date_str}")
        # Remove all whitespace and common noise
        clean_date = re.sub(r'[^\d/]', '', date_str).strip("/")
        parts = clean_date.split('/')
        if len(parts) == 3:
            try:
                day = parts[0].zfill(2)
                month = parts[1].zfill(2)
                year = parts[2]
                
                # Prevent invalid months/days from being generated
                if day == "00": day = "01"
                if month == "00": month = "01"
                
                if len(year) == 2:
                    year = "20" + year
                elif len(year) > 4:
                    year = year[:4]
                
                res = f"{day}/{month}/{year}"
                logger.debug(f"Normalized result: {res}")
                return res
            except Exception as e:
                logger.warning(f"Normalization failed for {date_str}: {e}")
                return clean_date
        return clean_date

    def _apply_heuristics(self, blocks, all_dates, data):
        # Normalize all raw text and dates
        for b in blocks:
            b['text'] = self._normalize_text(b.get('text', ''))
        
        logger.info(f"Candidate dates: {all_dates}")
        normalized_dates = []
        for d in all_dates:
            norm = self._normalize_date(d)
            if norm: normalized_dates.append(norm)
        
        logger.info(f"Normalized dates: {normalized_dates}")
        
        # Update data fields with normalized values if they exist
        if data.get("dob"): data["dob"] = self._normalize_date(data["dob"])
        if data.get("expiry_date"): data["expiry_date"] = self._normalize_date(data["expiry_date"])
        if data.get("passport_expiry"): data["passport_expiry"] = self._normalize_date(data["passport_expiry"])

        # --- MRZ Extraction (Targeted for QID) ---
        mrz_lines = [b['text'] for b in blocks if '<' in b['text'] and 30 <= len(b['text'].replace(' ', '')) <= 60]
        if mrz_lines and not data["qid_number"]:
            for line in mrz_lines:
                clean_line = line.replace(' ', '')
                match = QID_PATTERN.search(clean_line)
                if match:
                    data["qid_number"] = match.group()
                    break
        
        # --- Passport Number Fallback ---
        if not data["passport_number"] and blocks:
            max_y = max(b['cy'] for b in blocks)
            for b in blocks:
                text = b['text'].strip().upper()
                if PASSPORT_PATTERN.search(text) and not QID_PATTERN.search(text):
                    # Check if it's in the top half of the blocks
                    if b['cy'] < (max_y * 0.5):
                        data["passport_number"] = PASSPORT_PATTERN.search(text).group()
                        break

        # --- Global Regex Fallbacks ---
        if not data["qid_number"]:
            for b in blocks:
                match = QID_PATTERN.search(b['text'])
                if match:
                    data["qid_number"] = match.group()
                    break

        # --- Nationality Cleaning ---
        if data.get("nationality"):
            nat = data["nationality"]
            nat = re.sub(r'(?i)Nationall?ty\.?:?\s*', '', nat).strip()
            known_nats = ["INDIA", "INDIAN", "QATAR", "QATARI", "PAKISTAN", "PAKISTANI",
                          "NEPAL", "NEPALESE", "PHILIPPINES", "FILIPINO", "BANGLADESH",
                          "BANGLADESHI", "SRI LANKA", "SRI LANKAN", "EGYPT", "EGYPTIAN"]
            nat_upper = nat.upper()
            found_nat = False
            for known in known_nats:
                if known in nat_upper:
                    data["nationality"] = known
                    found_nat = True
                    break
            if not found_nat:
                words = nat.split()
                if len(words) > 2:
                    data["nationality"] = words[0]

        # --- Nationality Fallback from raw text ---
        nat_arabic_map = {"الهند": "INDIA", "باكستان": "PAKISTAN",
                          "نيبال": "NEPAL", "الفلبين": "PHILIPPINES", "بنجلاديش": "BANGLADESH",
                          "مصر": "EGYPT", "سريلانكا": "SRI LANKA"}
        if not data.get("nationality") or len(data["nationality"]) < 3 or not re.search(r'[A-Z]{3,}', data["nationality"]):
            # Search blocks near the nationality label row (not header)
            nat_found = False
            for b in blocks:
                t = b['text'].strip().upper()
                # Skip header area (top 20% of image)
                if b['cy'] < (max(bl['cy'] for bl in blocks) * 0.2):
                    continue
                if t in ["INDIA", "INDIAN", "PAKISTAN", "PAKISTANI", "NEPAL", "NEPALESE",
                         "PHILIPPINES", "FILIPINO", "BANGLADESH", "BANGLADESHI",
                         "SRI LANKA", "EGYPT", "EGYPTIAN"]:
                    data["nationality"] = t
                    nat_found = True
                    break
            if not nat_found:
                # Check Arabic nationalities (exclude قطر since it's in the header)
                all_text = " ".join(data.get("raw_text", []))
                for ar, en in nat_arabic_map.items():
                    if ar in all_text:
                        data["nationality"] = en
                        break

        # --- Occupation Cleaning ---
        if data.get("occupation"):
            occ = data["occupation"]
            occ = re.sub(r'(?i)OCCUPAT\w*\.?:?\s*', '', occ).strip()
            occ = re.sub(r'المهنة:?\s*', '', occ).strip()
            if data.get("nationality") and data["nationality"].upper() in occ.upper():
                occ = re.sub(re.escape(data["nationality"]), '', occ, flags=re.I).strip()
            # Remove garbage English text — keep Arabic words and properly-cased English
            occ_words = occ.split()
            clean_occ_words = []
            for w in occ_words:
                if re.search(r'[؀-ۿ]', w):
                    clean_occ_words.append(w)
                elif re.match(r'^[A-Z][a-z]{2,}$', w):
                    # Properly capitalized English word (e.g. "Accountant", "Engineer")
                    clean_occ_words.append(w)
                elif re.match(r'^[A-Z]{3,}$', w):
                    # All-caps English word (e.g. "ACCOUNTANT")
                    clean_occ_words.append(w)
                # Skip mixed-case garbage like "YWbA", random fragments
            data["occupation"] = " ".join(clean_occ_words).strip() if clean_occ_words else occ

        # --- Name Cleaning ---
        if data.get("name"):
            name = data["name"]
            name = re.sub(r'[\s]*[!#$@%^&*()]+[A-Z0-9]{0,6}$', '', name).strip()
            name = name.strip("!@#$%^&*()_+=[]{}|;:',.<>?/\" ")
            data["name"] = self._deduplicate_name(name)


        # --- Date Refinement ---
        if normalized_dates:
            valid_parsed_dates = []
            for d in set(normalized_dates):
                try:
                    # Defensive parsing
                    if len(d) == 10 and d[2] == '/' and d[5] == '/':
                        dt = datetime.strptime(d, "%d/%m/%Y")
                        # Basic sanity check: 1900 < year < 2100
                        if 1900 < dt.year < 2100:
                            valid_parsed_dates.append(dt)
                except:
                    continue
            
            if valid_parsed_dates:
                valid_parsed_dates.sort()
                unique_dates = [d.strftime("%d/%m/%Y") for d in valid_parsed_dates]
                
                # DOB is typically the earliest, Expiry the latest
                if not data["dob"]: data["dob"] = unique_dates[0]
                if not data["expiry_date"]: data["expiry_date"] = unique_dates[-1]
                
                # Validation: DOB must be before Expiry
                if data["dob"] and data["expiry_date"]:
                    try:
                        d1 = datetime.strptime(data["dob"], "%d/%m/%Y")
                        d2 = datetime.strptime(data["expiry_date"], "%d/%m/%Y")
                        if d1 > d2:
                            data["dob"], data["expiry_date"] = data["expiry_date"], data["dob"]
                    except: pass

    def _validate_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        hard_issues = []
        info_flags = []
        
        # Identification Check
        if data.get("id_type") == "PASSPORT":
            if not data.get("passport_number"): hard_issues.append("passport_missing")
        else:
            if not data.get("qid_number"): hard_issues.append("qid_missing")
            
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
        return {
            "name": None, 
            "qid_number": None, 
            "passport_number": None,
            "id_type": "QID",
            "dob": None, 
            "nationality": None, 
            "occupation": None, 
            "expiry_date": None, 
            "passport_expiry": None,
            "residency_type": None,
            "employer": None,
            "confidence": 0.0, 
            "raw_text": [], 
            "is_valid": False, 
            "status": "invalid", 
            "validation_issues": [], 
            "orientation_corrected": False
        }

ocr_service = OCRService()
