from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from ..db.database import get_db
from ..db.models import User
from ..schemas import UserRecord
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/lookup", tags=["lookup"])

@router.get("/users", response_model=List[UserRecord])
async def search_users(
    q: Optional[str] = Query(None, description="Search by Name, QID, or Mobile"),
    nationality: Optional[str] = Query(None),
    employer: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="ACTIVE, EXPIRING_SOON, GRACE_PERIOD, INVALID"),
    is_manual_edit: Optional[bool] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(User)
    
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

from ..db.business_models import Business
from ..schemas import BusinessCreate # Using BusinessCreate or similar for list response

@router.get("/businesses")
async def search_businesses(
    q: Optional[str] = Query(None, description="Search by Name or CR Number"),
    status: Optional[str] = Query(None, description="COMPLIANT, NON_COMPLIANT, PARTIAL, INVALID"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Business)
    
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
    
    # We'll return a simplified list for the lookup
    return [
        {
            "id": b.id,
            "cr_number": b.cr_number,
            "name": b.name,
            "status": b.status,
            "cr_expiry_date": b.cr_expiry, # Fixed field name
            "nationality": b.nationality,
            "last_updated": b.last_updated
        }
        for b in businesses
    ]
