import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.db.database import async_session
from backend.app.db.models import User
from sqlalchemy import select

async def check():
    try:
        async with async_session() as db:
            result = await db.execute(select(User))
            users = result.scalars().all()
            if not users:
                print("No users found in database.")
            for u in users:
                print(f"QID: {u.qid_number} | Name: {u.name} | Visits: {u.visit_count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
