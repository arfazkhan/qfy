from fastapi import APIRouter, Depends, HTTPException
import logging

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, date
from ..db.database import get_db
from ..db.crud import get_user_by_qid, get_user_by_qid_or_mobile, list_recent_users, update_user_fields, upsert_user
from ..middleware.auth import get_current_user, RoleChecker
from ..schemas import UserRecord, UserBase, IDStatus
from ..services.status_engine import calculate_id_status
from ..db.models import User
from ..db.business_models import BusinessMember, BusinessActivity
import uuid
import json
from typing import Optional

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

router = APIRouter(prefix="/users", tags=["users"])

admin_only = RoleChecker(["admin"])

@router.get("/stats/summary")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed analytics for the dashboard with trends.
    """
    from datetime import timedelta
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Current Stats
    total_users = await db.scalar(select(func.count(User.id)))
    total_scans = await db.scalar(select(func.sum(User.visit_count))) or 0
    
    # Entity Specific Stats
    individual_users = await db.scalar(select(func.count(User.id)).where(User.entity_type == "individual")) or 0
    business_users = await db.scalar(select(func.count(User.id)).where(User.entity_type == "business")) or 0
    
    individual_visits = await db.scalar(select(func.sum(User.visit_count)).where(User.entity_type == "individual")) or 0
    business_visits = await db.scalar(select(func.sum(User.visit_count)).where(User.entity_type == "business")) or 0
    
    # New today
    new_today = await db.scalar(select(func.count(User.id)).where(func.date(User.created_at) == today))
    
    # Expiring/Invalid
    expiring_soon = await db.scalar(
        select(func.count(User.id))
        .where(User.expiry_date >= today)
        .where(User.expiry_date <= today + timedelta(days=30))
    )
    invalid = await db.scalar(
        select(func.count(User.id))
        .where(User.expiry_date < today)
    )
    
    return {
        "total_scans": total_scans,
        "total_scans_trend": 0.0,
        "individual_visits": individual_visits,
        "individual_visits_trend": 0.0,
        "business_visits": business_visits,
        "business_visits_trend": 0.0,
        "expiring_soon": expiring_soon or 0,
        "expiring_soon_trend": 0.0,
        "invalid_ids": invalid or 0,
        "invalid_ids_trend": 0.0,
        "new_today": new_today or 0
    }

@router.get("/search", response_model=List[UserRecord])
async def search_users(
    query: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search users by name or QID."""
    stmt = select(User).where(
        (User.name.ilike(f"%{query}%")) | 
        (User.qid_number.ilike(f"%{query}%"))
    ).limit(10)
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [UserRecord.model_validate(u) for u in users]

@router.get("/{identifier}", response_model=dict)
async def lookup_user(
    identifier: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lookup a single customer by QID or Mobile."""
    user = await get_user_by_qid_or_mobile(db, identifier)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    res = calculate_id_status(user.expiry_date)
    
    return {
        "user": UserRecord.model_validate(user),
        "status": res["status"],
        "status_message": res["message"],
        "days_left": res["days_left"],
        "days_expired": res["days_expired"],
        "grace_days_remaining": res["grace_days_remaining"],
        "is_expired": res["is_expired"]
    }

@router.post("/link")
async def link_user_to_business(
    data: dict, # qid_number, business_id, role
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Link an existing user to a business with a specific role."""
    qid = data.get("qid_number")
    business_id = data.get("business_id")
    role = data.get("role", "STAFF")
    
    if not qid or not business_id:
        raise HTTPException(status_code=400, detail="Missing qid_number or business_id")
        
    user = await get_user_by_qid(db, qid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Link
    member_res = await db.execute(
        select(BusinessMember).where(
            BusinessMember.business_id == uuid.UUID(business_id),
            BusinessMember.user_id == user.id
        )
    )
    existing_member = member_res.scalars().first()
    
    if existing_member:
        existing_member.role = role
    else:
        member = BusinessMember(
            business_id=uuid.UUID(business_id),
            user_id=user.id,
            role=role
        )
        db.add(member)
        
    # If role is OWNER, update primary owner_id
    if role == 'OWNER':
        from ..db.business_models import Business
        res = await db.execute(select(Business).where(Business.id == uuid.UUID(business_id)))
        business = res.scalars().first()
        if business:
            logger.info(f"Linking OWNER to business: {business.owner_company_name} (Type: {business.owner_type})")
            # If it's a company, only set as primary rep if none exists
            if business.owner_type == 'COMPANY':
                if not business.owner_id:
                    logger.info(f"AUTO-DETECT: Setting INITIAL primary rep owner_id={user.id} and syncing employer={business.owner_company_name}")
                    business.owner_id = user.id
                    user.employer = business.owner_company_name
                else:
                    logger.info(f"LINKING: Adding co-owner {user.name} to corporate business (Primary remains {business.owner_id})")
            # If it's individual and has no owner yet, set it
            elif not business.owner_id:
                logger.info(f"AUTO-DETECT: Setting primary owner_id={user.id} for INDIVIDUAL business")
                business.owner_id = user.id
                business.owner_type = 'INDIVIDUAL'
        else:
            logger.warning(f"Business {business_id} not found during OWNER linking")

    await db.commit()
    
    # Log Activity
    try:
        await log_activity(
            db=db,
            business_id=uuid.UUID(business_id),
            event_type="MEMBER_LINK",
            description=f"Linked {user.name} to business as {role}",
            operator_id=current_user.id if hasattr(current_user, 'id') else None,
            metadata={"user_id": str(user.id), "role": role}
        )
    except Exception as e:
        logger.error(f"Failed to log link activity: {e}")

    logger.info(f"Link successful: {user.name} -> {role}")
    return {"status": "ok", "message": f"Linked {user.name} to business as {role}"}

@router.get("/", response_model=List[UserRecord])
async def list_users(
    limit: int = 20, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List recent customers."""
    users = await list_recent_users(db, limit)
    return [UserRecord.model_validate(u) for u in users]

@router.post("/upsert", response_model=UserRecord)
async def upsert_customer(
    user_data: dict, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create or update a customer record."""
    # Normalize dates if they are strings
    from ..services.validation import normalize_date
    for field in ['expiry_date', 'dob']:
        val = user_data.get(field)
        if isinstance(val, str) and val.strip():
            try:
                user_data[field] = normalize_date(val)
            except Exception as e:
                logger.warning(f"Failed to normalize {field}: {val}. Error: {e}")
                # If invalid, set to None for optional fields or handle as needed
                if field == 'dob': user_data[field] = None
        
    # Save images as files if they are base64
    from ..services.storage import save_base64_image
    qid = user_data.get('qid_number')
    name = user_data.get('name', 'UNKNOWN')
    
    if user_data.get('front_image') and user_data['front_image'].startswith('data:'):
        user_data['front_image'] = save_base64_image(user_data['front_image'], name, qid, "FRONT")
    
    if user_data.get('back_image') and user_data['back_image'].startswith('data:'):
        user_data['back_image'] = save_base64_image(user_data['back_image'], name, qid, "BACK")

    # Map audit fields to model columns
    user_data['is_manual_edit'] = user_data.pop('manual_edit', False)
    modified_list = user_data.pop('modified_fields', [])
    user_data['modified_fields'] = ",".join(modified_list) if modified_list else None
    
    if user_data['is_manual_edit']:
        logger.info(f"User {qid} was manually edited. Fields: {user_data['modified_fields']}")

    # Link to business if provided
    link_business_id = user_data.pop('link_business_id', None)
    link_role = user_data.pop('link_role', 'STAFF')

    # Duplicate Check Logic
    force = user_data.pop('force', False)
    if not force:
        existing = await get_user_by_qid(db, qid)
        if existing:
            from fastapi.responses import JSONResponse
            from fastapi.encoders import jsonable_encoder
            return JSONResponse(
                status_code=409,
                content={
                    "status": "duplicate",
                    "existing": jsonable_encoder(UserRecord.model_validate(existing)),
                    "new": jsonable_encoder(user_data)
                }
            )

    user, _ = await upsert_user(db, user_data)

    if link_business_id:
        try:
            # Check if already a member
            member_res = await db.execute(
                select(BusinessMember).where(
                    BusinessMember.business_id == uuid.UUID(link_business_id),
                    BusinessMember.user_id == user.id
                )
            )
            if not member_res.scalars().first():
                member = BusinessMember(
                    business_id=uuid.UUID(link_business_id),
                    user_id=user.id,
                    role=link_role
                )
                db.add(member)
                await db.commit()
                logger.info(f"Linked user {qid} to business {link_business_id} as {link_role}")
        except Exception as e:
            logger.error(f"Failed to link user to business: {e}")

    return UserRecord.model_validate(user)

@router.post("/{qid}/visit", response_model=UserRecord)
async def mark_visit(
    qid: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Log a new visit for an existing customer."""
    result = await db.execute(select(User).where(User.qid_number == qid))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    user.visit_count += 1
    user.last_seen_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return UserRecord.model_validate(user)

@router.delete("/{identifier}")
async def delete_user(
    identifier: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a user record by QID or ID."""
    user = await get_user_by_qid_or_mobile(db, identifier)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": f"User {identifier} deleted successfully"}
