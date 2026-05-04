from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Text, Enum
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
    
    # Identity Links
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    authorized_person_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    status = Column(String, default="NON_COMPLIANT") # INVALID, NON_COMPLIANT, PARTIAL, COMPLIANT
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    
    # Type: Commercial License, Authorization Letter, etc.
    document_type = Column(String, nullable=False)
    file_url = Column(String, nullable=True) # URL or Local Path
    storage_mode = Column(String, default="LOCAL") # LOCAL, CLOUD
    expiry_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class BusinessNote(Base):
    __tablename__ = "business_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id"), nullable=True)
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
