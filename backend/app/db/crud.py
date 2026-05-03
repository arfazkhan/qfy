from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, or_
from .models import User
from datetime import datetime
from typing import Optional, List

async def get_user_by_qid(db: AsyncSession, qid_number: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.qid_number == qid_number))
    return result.scalars().first()

async def get_user_by_qid_or_mobile(db: AsyncSession, identifier: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(
            or_(
                User.qid_number == identifier,
                User.mobile_number == identifier
            )
        )
    )
    return result.scalars().first()

async def upsert_user(db: AsyncSession, user_data: dict) -> tuple[User, bool]:
    existing_user = await get_user_by_qid(db, user_data["qid_number"])
    
    if existing_user:
        # Update existing user
        for key, value in user_data.items():
            setattr(existing_user, key, value)
        existing_user.visit_count += 1
        existing_user.last_seen_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing_user)
        return existing_user, False
    else:
        # Create new user
        new_user = User(**user_data)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user, True

async def list_recent_users(db: AsyncSession, limit: int = 20) -> List[User]:
    result = await db.execute(
        select(User).order_by(User.last_seen_at.desc()).limit(limit)
    )
    return result.scalars().all()

async def update_user_fields(db: AsyncSession, qid_number: str, update_data: dict) -> Optional[User]:
    user = await get_user_by_qid(db, qid_number)
    if not user:
        return None
    
    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)
            
    await db.commit()
    await db.refresh(user)
    return user
