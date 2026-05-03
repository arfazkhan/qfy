from fastapi import APIRouter, Depends, HTTPException
import logging

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, date
from ..db.database import get_db
from ..db.crud import get_user_by_qid, list_recent_users, update_user_fields, upsert_user
from ..middleware.auth import get_current_user, RoleChecker
from ..schemas import UserRecord, UserBase, IDStatus
from ..services.status_engine import calculate_id_status
from ..db.models import User

router = APIRouter(prefix="/users", tags=["users"])

admin_only = RoleChecker(["admin"])

@router.get("/stats/summary")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get detailed analytics for the dashboard.
    """
    from datetime import timedelta
    
    total_users = await db.scalar(select(func.count(User.id)))
    total_scans = await db.scalar(select(func.sum(User.visit_count)))
    
    today = date.today()
    new_today = await db.scalar(select(func.count(User.id)).where(func.date(User.created_at) == today))
    returning = await db.scalar(select(func.count(User.id)).where(User.visit_count > 1))
    
    # Expiry metrics
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
        "total_scans": total_scans or 0,
        "existing_users": returning or 0,
        "new_users": total_users or 0,
        "expiring_soon": expiring_soon or 0,
        "invalid_ids": invalid or 0,
        "new_today": new_today or 0
    }

@router.get("/{qid}", response_model=dict)
async def lookup_user(
    qid: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lookup a single customer by QID."""
    result = await db.execute(select(User).where(User.qid_number == qid))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    status, message = calculate_id_status(user.expiry_date)
    
    return {
        "user": UserRecord.model_validate(user),
        "status": status,
        "status_message": message
    }

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

    user, _ = await upsert_user(db, user_data)
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
