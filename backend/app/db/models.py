from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qid_number = Column(String, unique=True, index=True, nullable=True)
    passport_number = Column(String, unique=True, index=True, nullable=True)
    id_type = Column(String, default="QID", index=True) # QID, PASSPORT
    entity_type = Column(String, default="individual", index=True) # individual, business
    name = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=False)
    visit_count = Column(Integer, default=1)
    last_seen_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Future-ready columns
    name_ar = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    nationality = Column(String, nullable=True)
    employer = Column(String, nullable=True)
    front_image = Column(String, nullable=True) # Base64, URL or Local Path
    back_image = Column(String, nullable=True)  # Base64, URL or Local Path
    storage_mode = Column(String, default="LOCAL") # LOCAL, CLOUD
    
    # Audit tracking
    is_manual_edit = Column(Boolean, default=False)
    modified_fields = Column(String, nullable=True) # JSON string of fields changed
    mobile_number = Column(String, index=True, nullable=True)

class Operator(Base):
    __tablename__ = "operators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="staff") # admin, staff
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
