from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from ..db.database import get_db
from ..db.models import User
from ..schemas import UserRecord
from ..middleware.auth import get_current_user
from ..db.business_models import Business, BusinessDocument, BusinessMember

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
    
    # 2. Fetch Business Associations for these users
    user_ids = [u.id for u in users]
    if user_ids:
        # Fetch Associations (Unified)
        # Using hex strings for keys to avoid any UUID object comparison issues
        user_assocs = {uid.hex if isinstance(uid, uuid.UUID) else str(uid).replace('-', ''): [] for uid in user_ids}
            
        # A. From BusinessMember table
        m_q = select(BusinessMember, Business.name, Business.cr_number)\
            .join(Business, Business.id == BusinessMember.business_id)\
            .where(BusinessMember.user_id.in_(user_ids))
        m_res = await db.execute(m_q)
        for bm, b_name, b_cr in m_res.all():
            u_hex = bm.user_id.hex if isinstance(bm.user_id, uuid.UUID) else str(bm.user_id).replace('-', '')
            if u_hex in user_assocs:
                user_assocs[u_hex].append({"cr_number": b_cr, "name": b_name, "role": bm.role})
            
        # B. From Primary links in Business table (fallback/legacy)
        for role_field in ["owner_id", "manager_id", "authorized_person_id"]:
            role_name = "OWNER" if "owner" in role_field else ("MANAGER" if "manager" in role_field else "AUTHORIZED")
            field_attr = getattr(Business, role_field)
            p_q = select(Business.cr_number, Business.name, field_attr).where(field_attr.in_(user_ids))
            p_res = await db.execute(p_q)
            for b_cr, b_name, u_id in p_res.all():
                if u_id:
                    u_hex = u_id.hex if isinstance(u_id, uuid.UUID) else str(u_id).replace('-', '')
                    if u_hex in user_assocs:
                        # Avoid duplicates if already in BusinessMember
                        if not any(a["cr_number"] == b_cr and a["role"] == role_name for a in user_assocs[u_hex]):
                            user_assocs[u_hex].append({"cr_number": b_cr, "name": b_name, "role": role_name})
            
        return [
            UserRecord.model_validate({
                **u.__dict__,
                "associations": user_assocs.get(u.id.hex if isinstance(u.id, uuid.UUID) else str(u.id).replace('-', ''), [])
            })
            for u in users
        ]
    
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
