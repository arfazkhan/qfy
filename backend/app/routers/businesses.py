from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
import logging
logger = logging.getLogger(__name__)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from typing import List, Optional
import os
import uuid
from datetime import date, datetime

from ..db.database import get_db
from ..db.business_models import Business, BusinessDocument, BusinessNote, BusinessActivity, BusinessMember
from ..db.models import User
from ..db.business_logic import compute_business_status
from ..schemas import BusinessCreate, BusinessDocumentCreate, BusinessNoteCreate
from ..middleware.auth import get_current_user, RoleChecker
import json
from ..utils.pdf_generator import generate_business_report

async def log_activity(
    db: AsyncSession,
    business_id: uuid.UUID,
    event_type: str,
    description: str,
    severity: str = "INFO",
    operator_id: Optional[uuid.UUID] = None,
    metadata: Optional[dict] = None
):
    activity = BusinessActivity(
        business_id=business_id,
        event_type=event_type,
        description=description,
        severity=severity,
        operator_id=operator_id,
        metadata_json=json.dumps(metadata) if metadata else None
    )
    db.add(activity)
    await db.commit()

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

    status, reasons = compute_business_status(business, docs, owner, auth_person, manager)
    if status != business.status:
        old_status = business.status
        business.status = status
        await db.commit()
        
        await log_activity(
            db, business.id, "STATUS_CHANGE", 
            f"Compliance status changed from {old_status} to {status}",
            severity="WARNING" if status in ["NON_COMPLIANT", "INVALID"] else "INFO",
            metadata={"old": old_status, "new": status}
        )
        
    return {
        "id": str(business.id),
        "name": business.name,
        "cr_number": business.cr_number,
        "cr_expiry": business.cr_expiry.isoformat() if business.cr_expiry else None,
        "status": business.status,
        "compliance_reasons": [r["message"] for r in reasons],
        "latest_note": latest_note.content if latest_note else None,
        "owner_name": owner.name if owner else None,
        "manager_name": manager.name if manager else None,
        "visit_count": business.visit_count or 0,
        "last_seen_at": business.last_seen_at.isoformat() if business.last_seen_at else None,
        "document_summary": [
            {"type": doc.document_type, "status": "valid" if (not doc.expiry_date or doc.expiry_date >= date.today()) else "expired"}
            for doc in docs
        ]
    }

@router.post("/{cr_number}/log-visit")
async def log_business_visit(
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
        
    business.visit_count = (business.visit_count or 0) + 1
    business.last_seen_at = datetime.utcnow()
    
    await log_activity(
        db, business.id, "VISIT", 
        f"Logged physical visit by {current_user.username}",
        operator_id=current_user.id if hasattr(current_user, 'id') else None
    )
    
    await db.commit()
    
    return {"status": "success", "visit_count": business.visit_count}

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
        
    def person_to_dict(u, role=None):
        if not u: return None
        return {
            "id": u.id.hex if isinstance(u.id, uuid.UUID) else str(u.id).replace('-', ''),
            "name": u.name,
            "qid_number": u.qid_number,
            "role": role or "STAFF",
            "expiry_date": u.expiry_date.isoformat() if u.expiry_date else None,
            "nationality": u.nationality,
            "mobile_number": u.mobile_number,
            "employer": u.employer
        }

    # Get owner info
    owner_raw = None
    if business.owner_id:
        owner_res = await db.execute(select(User).where(User.id == business.owner_id))
        owner_raw = owner_res.scalars().first()
        # AUTO-SYNC: If company, ensure the primary rep's employer field is synced
        if owner_raw and business.owner_type == 'COMPANY' and owner_raw.employer != business.owner_company_name:
            old_employer = owner_raw.employer
            logger.info(f"SYNC: Auto-healing primary rep employer for {owner_raw.name} -> {business.owner_company_name}")
            owner_raw.employer = business.owner_company_name
            await db.commit()
            
            await log_activity(
                db=db,
                business_id=business.id,
                event_type="SYSTEM_SYNC",
                description=f"Auto-synced primary representative employer for {owner_raw.name}",
                severity="INFO",
                metadata={"field": "employer", "old": old_employer, "new": business.owner_company_name}
            )
    owner = person_to_dict(owner_raw, "OWNER")
        
    # Get authorized person info
    auth_raw = None
    if business.authorized_person_id:
        auth_res = await db.execute(select(User).where(User.id == business.authorized_person_id))
        auth_raw = auth_res.scalars().first()
    auth_person = person_to_dict(auth_raw, "AUTHORIZED")
        
    # Get manager info
    manager_raw = None
    if business.manager_id:
        manager_res = await db.execute(select(User).where(User.id == business.manager_id))
        manager_raw = manager_res.scalars().first()
    manager = person_to_dict(manager_raw, "MANAGER")
        
    # Get docs
    docs_res = await db.execute(select(BusinessDocument).where(BusinessDocument.business_id == business.id))
    docs_raw = docs_res.scalars().all()
    docs = []
    for d in docs_raw:
        docs.append({
            "id": d.id.hex if isinstance(d.id, uuid.UUID) else str(d.id).replace('-', ''),
            "document_type": d.document_type,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "is_available": d.is_available,
            "file_url": d.file_url
        })
    
    # Get notes
    notes_res = await db.execute(
        select(BusinessNote)
        .where(BusinessNote.business_id == business.id)
        .order_by(BusinessNote.created_at.desc())
    )
    notes_raw = notes_res.scalars().all()
    notes = []
    for n in notes_raw:
        notes.append({
            "id": n.id.hex if isinstance(n.id, uuid.UUID) else str(n.id).replace('-', ''),
            "content": n.content,
            "created_at": n.created_at.isoformat()
        })

    # Get activities
    activities_res = await db.execute(
        select(BusinessActivity)
        .where(BusinessActivity.business_id == business.id)
        .order_by(BusinessActivity.created_at.desc())
    )
    activities_raw = activities_res.scalars().all()

    # Get all members
    members_res = await db.execute(
        select(BusinessMember, User)
        .join(User, BusinessMember.user_id == User.id)
        .where(BusinessMember.business_id == business.id)
    )
    members_raw = members_res.all()
    
    # Combine fixed roles into a members list if not already there
    members = []
    seen_user_ids = set()
    
    # Add the extra members from business_members table
    for bm, u in members_raw:
        # AUTO-SYNC: If company, ensure ONLY the PRIMARY OWNER has their employer synced
        if business.owner_type == 'COMPANY' and u.id == business.owner_id and u.employer != business.owner_company_name:
            old_employer = u.employer
            logger.info(f"SYNC: Auto-healing primary representative {u.name} employer to {business.owner_company_name}")
            u.employer = business.owner_company_name
            await db.commit()
            
            await log_activity(
                db=db,
                business_id=business.id,
                event_type="SYSTEM_SYNC",
                description=f"Automated identity synchronization: Linked {u.name} as primary corporate representative",
                severity="INFO",
                metadata={"field": "employer", "old": old_employer, "new": business.owner_company_name}
            )
            
        m_dict = person_to_dict(u, bm.role)
        members.append(m_dict)
        seen_user_ids.add(m_dict["id"])
        
    # Add fixed roles to members list for unified view
    for p_dict in [owner, manager, auth_person]:
        if p_dict and p_dict["id"] not in seen_user_ids:
            members.append(p_dict)
            seen_user_ids.add(p_dict["id"])
            
    activities = []
    for a in activities_raw:
        activities.append({
            "id": a.id.hex if isinstance(a.id, uuid.UUID) else str(a.id).replace('-', ''),
            "event_type": a.event_type,
            "description": a.description,
            "severity": a.severity,
            "created_at": a.created_at.isoformat(),
            "metadata": json.loads(a.metadata_json) if a.metadata_json else None
        })
    
    # Refresh status
    # Use raw objects for status computation
    current_status, reasons = compute_business_status(business, docs_raw, members_raw, owner_raw, auth_raw, manager_raw)
    if current_status != business.status:
        old_status = business.status
        business.status = current_status
        await db.commit()
        
        await log_activity(
            db, business.id, "STATUS_CHANGE", 
            f"Compliance status automatically updated from {old_status} to {current_status}",
            severity="WARNING" if current_status in ["NON_COMPLIANT", "INVALID"] else "INFO",
            metadata={"old": old_status, "new": current_status}
        )
    
    return {
        "id": business.id.hex if isinstance(business.id, uuid.UUID) else str(business.id).replace('-', ''),
        "name": business.name,
        "cr_number": business.cr_number,
        "cr_expiry_date": business.cr_expiry.isoformat() if business.cr_expiry else None,
        "nationality": business.nationality,
        "address": business.address,
        "mobile": business.mobile,
        "business_type": business.business_type,
        "business_nature": business.business_nature,
        "owner_id": business.owner_id.hex if business.owner_id and isinstance(business.owner_id, uuid.UUID) else (str(business.owner_id).replace('-', '') if business.owner_id else None),
        "owner_type": business.owner_type,
        "owner_company_name": business.owner_company_name,
        "owner_cr_number": business.owner_cr_number,
        "status": current_status,
        "compliance_reasons": reasons,
        "owner": owner,
        "authorized_person": auth_person,
        "manager": manager,
        "documents": docs,
        "notes": notes,
        "activities": activities,
        "members": members
    }

@router.get("/{cr_number}/report")
async def download_business_report(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Reuse business details logic
    data = await get_business_details(cr_number, db, current_user)
    
    pdf_buffer = generate_business_report(data)
    
    filename = f"Report_{cr_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    # Log the download activity
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    biz = res.scalars().first()
    if biz:
        await log_activity(
            db, biz.id, "REPORT_DOWNLOAD", 
            f"Compliance report downloaded by {current_user.username}",
            operator_id=current_user.id if hasattr(current_user, 'id') else None
        )
        await db.commit()
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.put("/{cr_number}")
async def update_business_profile(
    cr_number: str,
    update_data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Update fields
    for field in ["name", "nationality", "address", "mobile", "business_type", "business_nature", "owner_type", "owner_company_name", "owner_cr_number"]:
        if field in update_data:
            setattr(business, field, update_data[field])
    
    # Special handling for company owner representative if being updated via direct ID link
    # (Though usually we handle this via upsert_customer)
    if update_data.get("is_company_owner"):
        business.owner_type = "COMPANY"
        business.owner_company_name = update_data.get("owner_name")
        business.owner_cr_number = update_data.get("owner_cr_number")

    if "cr_expiry_date" in update_data and update_data["cr_expiry_date"]:
        try:
            business.cr_expiry = datetime.strptime(update_data["cr_expiry_date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    await log_activity(
        db, business.id, "PROFILE_UPDATE", 
        f"Business profile updated by {current_user.username}",
        operator_id=current_user.id if hasattr(current_user, 'id') else None,
        metadata=update_data
    )
    
    await db.commit()
    logger.info(f"PROFILE_UPDATE: Business {cr_number} updated by {current_user.username}. Data: {update_data}")
    return {"status": "ok", "message": "Profile updated successfully"}

@router.post("/upsert")
async def upsert_business(
    data: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if exists
    res = await db.execute(select(Business).where(Business.cr_number == data.cr_number))
    business = res.scalars().first()
    
    is_new = business is None
    
    try:
        expiry_date = datetime.strptime(data.cr_expiry_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for cr_expiry_date. Use YYYY-MM-DD.")
    
    if not is_new:
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
    
    # Log Activity
    await log_activity(
        db, business.id, 
        "BUSINESS_REGISTERED" if is_new else "PROFILE_UPDATE", 
        f"Business record {'created' if is_new else 'updated'} via registration form",
        operator_id=current_user.id if hasattr(current_user, 'id') else None,
        metadata={"cr_number": data.cr_number, "is_new": is_new}
    )
    logger.info(f"UPSERT: {'Updated' if business else 'Created'} business {data.cr_number}. Owner ID: {data.owner_id}")

    # Create initial note if provided
    if data.initial_note:
        note = BusinessNote(
            business_id=business.id,
            content=data.initial_note,
            operator_id=current_user.id if hasattr(current_user, 'id') else None
        )
        db.add(note)
        await db.commit()
        logger.info(f"UPSERT: Added initial note for {data.cr_number}")

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
    # 1. Get Business
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalars().first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # 2. Add or Update Document
    res = await db.execute(
        select(BusinessDocument)
        .where(BusinessDocument.business_id == business.id)
        .where(BusinessDocument.document_type == document_type)
    )
    doc = res.scalars().first()
    
    expiry = None
    if expiry_date:
        try:
            expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format for expiry_date. Use YYYY-MM-DD.")
            
    file_url = None
    original_filename = None
    if file:
        file_url = save_business_document(cr_number, document_type, file)
        original_filename = file.filename
        
    if doc:
        old_expiry = doc.expiry_date
        doc.is_available = is_available
        doc.expiry_date = expiry
        
        log_desc = f"Document updated: {document_type}"
        if file:
            doc.file_url = file_url
            doc.original_filename = original_filename
            log_desc = f"Document replaced: {document_type}"
        elif old_expiry != expiry:
            log_desc = f"Expiry date updated for {document_type} (New: {expiry})"
            
        await log_activity(
            db, business.id, "DOC_UPDATE", 
            f"{log_desc} by {current_user.username}",
            operator_id=current_user.id if hasattr(current_user, 'id') else None,
            severity="WARNING" if not is_available else "INFO"
        )
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
        
        await log_activity(
            db, business.id, "DOC_UPLOAD", 
            f"New document uploaded: {document_type} by {current_user.username}",
            operator_id=current_user.id if hasattr(current_user, 'id') else None
        )
        
    
    await db.commit()
    logger.info(f"DOC_EVENT: Business {cr_number} - {document_type} processed (status: {is_available}, file: {original_filename})")
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
    
    await log_activity(
        db, business.id, "NOTE", 
        f"New operational note added by {current_user.username}",
        operator_id=current_user.id,
        metadata={"content": note_data.content[:100]}
    )
    
    await db.commit()
    return {"status": "ok"}

@router.delete("/{cr_number}/notes/{note_id}")
async def delete_business_note(
    cr_number: str,
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Find business
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # Find note
    try:
        note_uuid = uuid.UUID(note_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid note ID")

    res = await db.execute(
        select(BusinessNote)
        .where(BusinessNote.id == note_uuid)
        .where(BusinessNote.business_id == business.id)
    )
    note = res.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    await db.delete(note)
    
    await log_activity(
        db, business.id, "NOTE_DELETE", 
        f"Operational note removed by {current_user.username}",
        operator_id=current_user.id if hasattr(current_user, 'id') else None
    )
    
    await db.commit()
    return {"status": "ok"}

@router.delete("/{cr_number}")
async def delete_business(
    cr_number: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a business record by CR number."""
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    await db.delete(business)
    await db.commit()
    return {"status": "success", "message": f"Business {cr_number} deleted successfully"}
@router.delete("/{cr_number}/members/{user_id}")
async def unlink_member(cr_number: str, user_id: str, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Find Business
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    # 2. Check if this is the corporate entity unlinking (user_id='corporate')
    is_corporate_unlink = user_id == "corporate"
    target_name = "Corporate Entity"

    if is_corporate_unlink:
        business.owner_type = "INDIVIDUAL"
        business.owner_company_name = None
        business.owner_cr_number = None
        business.is_company_owner = False
        # Note: We keep the representative as a regular owner if they exist
    else:
        # 3. Delete from BusinessMember
        try:
            u_id = uuid.UUID(user_id)
        except ValueError:
             raise HTTPException(status_code=400, detail="Invalid user ID format")

        await db.execute(
            delete(BusinessMember)
            .where(BusinessMember.business_id == business.id)
            .where(BusinessMember.user_id == u_id)
        )
        
        # Get user name for logging
        u_res = await db.execute(select(User).where(User.id == u_id))
        u_obj = u_res.scalars().first()
        target_name = u_obj.name if u_obj else user_id

        # 4. Clear primary ID links if they match
        if business.owner_id == u_id:
            business.owner_id = None
        if business.authorized_person_id == u_id:
            business.authorized_person_id = None
        if business.manager_id == u_id:
            business.manager_id = None

    await db.commit()
    
    # Log Activity
    try:
        await log_activity(
            db, business.id, "MEMBER_UNLINK", 
            f"Unlinked {target_name} from business",
            operator_id=current_user.id if hasattr(current_user, 'id') else None,
            metadata={"user_id": user_id, "is_corporate": is_corporate_unlink}
        )
    except Exception as e:
        logger.error(f"Unlink log failed: {e}")
    
    # 5. Refresh status
    # Get everything again for status computation
    res = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = res.scalar_one()
    
    docs_res = await db.execute(select(BusinessDocument).where(BusinessDocument.business_id == business.id))
    docs_raw = docs_res.scalars().all()
    
    members_res = await db.execute(
        select(BusinessMember, User)
        .join(User, BusinessMember.user_id == User.id)
        .where(BusinessMember.business_id == business.id)
    )
    members_raw = members_res.all()
    
    # Get legacy objects for fallback
    owner_raw = await db.get(User, business.owner_id) if business.owner_id else None
    auth_raw = await db.get(User, business.authorized_person_id) if business.authorized_person_id else None
    manager_raw = await db.get(User, business.manager_id) if business.manager_id else None

    current_status, reasons = compute_business_status(business, docs_raw, members_raw, owner_raw, auth_raw, manager_raw)
    business.status = current_status
    await db.commit()
    
    return {"message": "Member unlinked successfully", "status": current_status}

@router.put("/{cr_number}/set-representative/{user_id}")
async def set_business_representative(
    cr_number: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Explicitly set a specific linked member as the primary corporate representative."""
    result = await db.execute(select(Business).where(Business.cr_number == cr_number))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Handle hex strings or UUIDs
    try:
        if '-' in user_id:
            u_id = uuid.UUID(user_id)
        else:
            u_id = uuid.UUID(hex=user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = await db.get(User, u_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update business primary identity
    business.owner_id = user.id
    business.owner_type = 'COMPANY'
    
    await db.commit()
    
    # Log activity
    await log_activity(
        db, business.id, "PROFILE_UPDATE", 
        f"Set {user.name} as Primary Corporate Representative",
        operator_id=current_user.id if hasattr(current_user, 'id') else None
    )
    
    return {"status": "success", "message": f"Set {user.name} as primary representative"}
