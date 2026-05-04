from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
import os
import uuid
from datetime import date, datetime

from ..db.database import get_db
from ..db.business_models import Business, BusinessDocument, BusinessNote
from ..db.models import User
from ..db.business_logic import compute_business_status
from ..schemas import BusinessCreate, BusinessDocumentCreate, BusinessNoteCreate
from ..middleware.auth import get_current_user, RoleChecker

router = APIRouter(prefix="/businesses", tags=["businesses"])

@router.get("/search/{cr_number}")
async def search_business(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Quick search for a business by CR number.
    Returns compliance status and document summary.
    """
    result = await db.execute(
        select(Business).where(Business.cr_number == cr_number)
    )
    business = result.scalars().first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Get docs
    docs_result = await db.execute(
        select(BusinessDocument).where(BusinessDocument.business_id == business.id)
    )
    docs = docs_result.scalars().all()
    
    # Get latest note
    note_result = await db.execute(
        select(BusinessNote)
        .where(BusinessNote.business_id == business.id)
        .order_by(BusinessNote.created_at.desc())
        .limit(1)
    )
    latest_note = note_result.scalars().first()
    
    # Recalculate status
    # Fetch linked people for status check
    owner = None
    if business.owner_id:
        owner_res = await db.execute(select(User).where(User.id == business.owner_id))
        owner = owner_res.scalars().first()
    
    auth_person = None
    if business.authorized_person_id:
        auth_res = await db.execute(select(User).where(User.id == business.authorized_person_id))
        auth_person = auth_res.scalars().first()
        
    manager = None
    if business.manager_id:
        manager_res = await db.execute(select(User).where(User.id == business.manager_id))
        manager = manager_res.scalars().first()

    status = compute_business_status(business, docs, owner, auth_person, manager)
    if status != business.status:
        business.status = status
        await db.commit()
        
    return {
        "id": business.id,
        "name": business.name,
        "cr_number": business.cr_number,
        "status": business.status,
        "latest_note": latest_note.content if latest_note else None,
        "document_summary": [
            {"type": doc.document_type, "status": "valid" if (not doc.expiry_date or doc.expiry_date >= date.today()) else "expired"}
            for doc in docs
        ]
    }

@router.get("/{cr_number}")
async def get_business_details(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Business).where(Business.cr_number == cr_number)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Get owner info
    owner = None
    if business.owner_id:
        owner_res = await db.execute(select(User).where(User.id == business.owner_id))
        owner = owner_res.scalars().first()
        
    # Get authorized person info
    auth_person = None
    if business.authorized_person_id:
        auth_res = await db.execute(select(User).where(User.id == business.authorized_person_id))
        auth_person = auth_res.scalars().first()
        
    # Get manager info
    manager = None
    if business.manager_id:
        manager_res = await db.execute(select(User).where(User.id == business.manager_id))
        manager = manager_res.scalars().first()
        
    # Get docs
    docs_res = await db.execute(select(BusinessDocument).where(BusinessDocument.business_id == business.id))
    docs = docs_res.scalars().all()
    
    # Get notes
    notes_res = await db.execute(
        select(BusinessNote)
        .where(BusinessNote.business_id == business.id)
        .order_by(BusinessNote.created_at.desc())
    )
    notes = notes_res.scalars().all()
    
    # Refresh status
    current_status = compute_business_status(business, docs, owner, auth_person, manager)
    if current_status != business.status:
        business.status = current_status
        await db.commit()
    
    return {
        "id": business.id,
        "name": business.name,
        "cr_number": business.cr_number,
        "cr_expiry_date": business.cr_expiry,
        "nationality": business.nationality,
        "address": business.address,
        "mobile": business.mobile,
        "business_type": business.business_type,
        "business_nature": business.business_nature,
        "status": current_status,
        "owner": owner,
        "authorized_person": auth_person,
        "manager": manager,
        "documents": docs,
        "notes": notes
    }

@router.post("/upsert")
async def upsert_business(
    data: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if exists
    res = await db.execute(select(Business).where(Business.cr_number == data.cr_number))
    business = res.scalars().first()
    
    expiry_date = datetime.strptime(data.cr_expiry_date, "%Y-%m-%d").date()
    
    if business:
        business.name = data.name
        business.cr_expiry = expiry_date
        business.nationality = data.nationality
        business.address = data.address
        business.mobile = data.mobile
        business.business_type = data.business_type
        business.business_nature = data.business_nature
        business.owner_id = data.owner_id
        business.authorized_person_id = data.authorized_person_id
        business.manager_id = data.manager_id
    else:
        business = Business(
            name=data.name,
            cr_number=data.cr_number,
            cr_expiry=expiry_date,
            nationality=data.nationality,
            address=data.address,
            mobile=data.mobile,
            business_type=data.business_type,
            business_nature=data.business_nature,
            owner_id=data.owner_id,
            authorized_person_id=data.authorized_person_id,
            manager_id=data.manager_id,
            status="INVALID" # Initial state
        )
        db.add(business)
        
    await db.commit()
    await db.refresh(business)

    # Create initial note if provided
    if data.initial_note:
        note = BusinessNote(
            business_id=business.id,
            content=data.initial_note,
            operator_id=current_user.id if hasattr(current_user, 'id') else None
        )
        db.add(note)
        await db.commit()

    return business

from ..utils.storage import save_business_document

@router.post("/{cr_number}/documents")
async def add_or_update_document(
    cr_number: str,
    document_type: str = Form(...),
    is_available: bool = Form(True),
    expiry_date: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Find business
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Check if doc exists
    res = await db.execute(
        select(BusinessDocument)
        .where(BusinessDocument.business_id == business.id, BusinessDocument.document_type == document_type)
    )
    doc = res.scalars().first()
    
    expiry = None
    if expiry_date:
        try:
            expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        except ValueError:
            pass # Keep None if invalid
            
    file_url = None
    original_filename = None
    if file:
        file_url = save_business_document(cr_number, document_type, file)
        original_filename = file.filename
        
    if doc:
        doc.is_available = is_available
        doc.expiry_date = expiry
        if file_url:
            doc.file_url = file_url
            doc.original_filename = original_filename
    else:
        doc = BusinessDocument(
            business_id=business.id,
            document_type=document_type,
            is_available=is_available,
            expiry_date=expiry,
            file_url=file_url,
            original_filename=original_filename
        )
        db.add(doc)
        
    await db.commit()
    return {"status": "ok", "file_url": doc.file_url}

@router.post("/{cr_number}/notes")
async def add_business_note(
    cr_number: str,
    note_data: BusinessNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Find business
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    note = BusinessNote(
        business_id=business.id,
        operator_id=current_user.id,
        content=note_data.content
    )
    db.add(note)
    await db.commit()
    return {"status": "ok"}
