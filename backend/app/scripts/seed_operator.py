import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..db.database import async_session
from ..db.models import Operator
from ..services.auth_service import get_password_hash
import sys

async def seed_operator(username: str = "admin", password: str = "admin123"):
    async with async_session() as session:
        # Check if operator already exists
        result = await session.execute(select(Operator).where(Operator.username == username))
        existing = result.scalars().first()
        
        if existing:
            print(f"Operator '{username}' already exists.")
            return

        new_operator = Operator(
            username=username,
            hashed_password=get_password_hash(password)
        )
        session.add(new_operator)
        await session.commit()
        print(f"Operator '{username}' created successfully.")

if __name__ == "__main__":
    username = sys.argv[1] if len(sys.argv) > 1 else "admin"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin123"
    asyncio.run(seed_operator(username, password))
