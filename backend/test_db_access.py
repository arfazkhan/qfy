import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.models.user import User
import os

async def test_db():
    DATABASE_URL = "sqlite+aiosqlite:///./qfy.db"
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        result = await session.execute(select(User).where(User.qid_number == "29735616408"))
        user = result.scalar_one_or_none()
        if user:
            print(f"Found user: {user.name}")
        else:
            print("User not found")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
