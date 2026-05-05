from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from ..db.database import get_db
from ..db.models import User
from ..schemas import UserRecord
from ..middleware.auth import get_current_user
from ..db.business_models import Business, BusinessDocument

router = APIRouter(prefix="/lookup", tags=["lookup"])

@router.get("/users", response_model=List[UserRecord])
async def search_users(
    q: Optional[str] = Query(None, description="Search by Name, QID, or Mobile"),
    nationality: Optional[str] = Query(None),
    employer: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="ACTIVE, EXPIRING_SOON, GRACE_PERIOD, INVALID"),
    is_manual_edit: Optional[bool] = Query(None),
    cr_number: Optional[str] = Query(None, description="Filter by Business CR"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(User)
    
    # Filter by Business if CR is provided
    if cr_number:
        biz_q = select(Business).where(Business.cr_number == cr_number)
        biz_res = await db.execute(biz_q)
        biz = biz_res.scalar_one_or_none()
        if biz:
            query = query.where(or_(
                User.id == biz.owner_id,
                User.id == biz.authorized_person_id,
                User.id == biz.manager_id
            ))
        else:
            return [] # No business found, so no users linked to it

    # Date Range filtering (by last interaction)
    if start_date:
        query = query.where(func.date(User.last_seen_at) >= start_date)
    if end_date:
        query = query.where(func.date(User.last_seen_at) <= end_date)
    
    # Global search (QID, Name, Mobile)
    if q:
        search_filter = or_(
            User.qid_number.ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%"),
            User.name_ar.ilike(f"%{q}%"),
            User.mobile_number.ilike(f"%{q}%")
        )
        query = query.where(search_filter)
    
    # Nationality filter
    if nationality:
        query = query.where(User.nationality == nationality)
        
    # Employer filter
    if employer:
        query = query.where(User.employer.ilike(f"%{employer}%"))
        
    # Manual Edit filter
    if is_manual_edit is not None:
        query = query.where(User.is_manual_edit == is_manual_edit)
        
    # Status filter (Calculated from expiry_date)
    if status:
        today = date.today()
        # warning threshold (usually 30 days)
        warning_days = 30
        # grace period threshold (usually 30 days)
        grace_days = 30
        
        if status == "ACTIVE":
            query = query.where(User.expiry_date > today + timedelta(days=warning_days))
        elif status == "EXPIRING_SOON":
            query = query.where(and_(
                User.expiry_date >= today,
                User.expiry_date <= today + timedelta(days=warning_days)
            ))
        elif status == "GRACE_PERIOD":
            query = query.where(and_(
                User.expiry_date < today,
                User.expiry_date >= today - timedelta(days=grace_days)
            ))
        elif status == "INVALID":
            query = query.where(User.expiry_date < today - timedelta(days=grace_days))

    # Order by last seen
    query = query.order_by(User.last_seen_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [UserRecord.model_validate(u) for u in users]

@router.get("/businesses")
async def search_businesses(
    q: Optional[str] = Query(None, description="Search by Name or CR Number"),
    status: Optional[str] = Query(None, description="COMPLIANT, NON_COMPLIANT, PARTIAL, INVALID"),
    cr_number: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Business)
    
    if cr_number:
        query = query.where(Business.cr_number == cr_number)

    # Date Range filtering
    if start_date:
        query = query.where(func.date(Business.last_updated) >= start_date)
    if end_date:
        query = query.where(func.date(Business.last_updated) <= end_date)

    if q:
        search_filter = or_(
            Business.cr_number.ilike(f"%{q}%"),
            Business.name.ilike(f"%{q}%")
        )
        query = query.where(search_filter)
    
    if status:
        query = query.where(Business.status == status)
        
    query = query.order_by(Business.last_updated.desc())
    
    result = await db.execute(query)
    businesses = result.scalars().all()
    
    return [
        {
            "id": b.id,
            "cr_number": b.cr_number,
            "name": b.name,
            "status": b.status,
            "cr_expiry_date": b.cr_expiry,
            "nationality": b.nationality,
            "last_updated": b.last_updated
        }
        for b in businesses
    ]

@router.get("/documents")
async def search_documents(
    q: Optional[str] = Query(None),
    cr_number: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(BusinessDocument, Business.name.label("business_name"), Business.cr_number.label("cr_number"))\
        .join(Business, Business.id == BusinessDocument.business_id)
    
    if cr_number:
        query = query.where(Business.cr_number == cr_number)
    
    if q:
        query = query.where(BusinessDocument.document_type.ilike(f"%{q}%"))
        
    result = await db.execute(query)
    docs = result.all()
    
    return [
        {
            "id": d.BusinessDocument.id,
            "document_type": d.BusinessDocument.document_type,
            "expiry_date": d.BusinessDocument.expiry_date,
            "is_available": d.BusinessDocument.is_available,
            "business_name": d.business_name,
            "cr_number": d.cr_number
        }
        for d in docs
    ]
