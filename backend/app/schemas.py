from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from uuid import UUID
from enum import Enum
from typing import Optional

class IDStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRING_SOON = "EXPIRING_SOON"
    GRACE_PERIOD = "GRACE_PERIOD"
    INVALID = "INVALID"

class UserBase(BaseModel):
    qid_number: str
    name: str
    expiry_date: date
    name_ar: Optional[str] = None
    dob: Optional[date] = None
    nationality: Optional[str] = None
    employer: Optional[str] = None
    front_image: Optional[str] = None
    back_image: Optional[str] = None
    is_manual_edit: bool = False
    modified_fields: Optional[str] = None

class UserRecord(UserBase):
    id: UUID
    visit_count: int
    last_seen_at: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserScanData(BaseModel):
    qid_number: str
    name: str
    expiry_date: str # OCR returns string usually
    dob: Optional[str] = None
    nationality: Optional[str] = None

class ScanResponse(BaseModel):
    user: Optional[UserScanData] = None
    status: str # Changed from IDStatus to string for flexibility during verification
    status_message: str
    is_new_user: bool
    requires_review: bool
    ocr_confidence: float
    extracted_fields: dict
    processed_image: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
