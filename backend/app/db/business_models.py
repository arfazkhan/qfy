from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Text, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from .database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cr_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    cr_expiry = Column(Date, nullable=False)
    
    # Basic Details (New)
    nationality = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    mobile = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    business_nature = Column(String, nullable=True)
    
    # Identity Links
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    authorized_person_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    status = Column(String, default="NON_COMPLIANT") # INVALID, NON_COMPLIANT, PARTIAL, COMPLIANT
    
    visit_count = Column(Integer, default=0)
    last_seen_at = Column(DateTime, nullable=True)
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    
    # Type: Commercial License, Authorization Letter, etc.
    document_type = Column(String, nullable=False)
    file_url = Column(String, nullable=True) # URL or Local Path
    original_filename = Column(String, nullable=True)
    storage_mode = Column(String, default="LOCAL") # LOCAL, CLOUD
    expiry_date = Column(Date, nullable=True)
    is_available = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessNote(Base):
    __tablename__ = "business_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id"), nullable=True)
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessActivity(Base):
    __tablename__ = "business_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id"), nullable=True)
    
    event_type = Column(String, nullable=False) # VISIT, DOC_UPLOAD, STATUS_CHANGE, NOTE
    description = Column(String, nullable=False)
    severity = Column(String, default="INFO") # INFO, WARNING, HIGH
    metadata_json = Column(Text, nullable=True) # JSON string for extra data
    
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessMember(Base):
    __tablename__ = "business_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False) # OWNER, MANAGER, AUTHORIZED, STAFF, VISITOR
    
    created_at = Column(DateTime, default=datetime.utcnow)
