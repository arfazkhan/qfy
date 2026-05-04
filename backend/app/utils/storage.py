import os
import shutil
from fastapi import UploadFile
from datetime import datetime
import uuid

UPLOAD_DIR = "static/uploads"

def save_business_document(cr_number: str, doc_type: str, file: UploadFile) -> str:
    """
    Saves a business document to the local filesystem.
    Structure: uploads/{cr_number}/{doc_type}_{timestamp}_{uuid}.{ext}
    Returns the relative path to the file.
    """
    # Create business directory
    business_dir = os.path.join(UPLOAD_DIR, cr_number)
    os.makedirs(business_dir, exist_ok=True)
    
    # Get extension
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".bin"
    
    # Security: Hardened extension check
    ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
    if ext not in ALLOWED_EXTENSIONS:
        # We allow it for now but maybe log it? Actually rigorous means fail fast.
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Only PDF, JPG, PNG are supported.")
    
    # Clean doc type for filename
    safe_doc_type = doc_type.replace(" ", "_").lower()
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{safe_doc_type}_{timestamp}_{unique_id}{ext}"
    
    file_path = os.path.join(business_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return file_path.replace("\\", "/") # Normalize path for all OS
