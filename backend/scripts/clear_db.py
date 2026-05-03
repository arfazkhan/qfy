import os
import shutil
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker
from pathlib import Path
from dotenv import load_dotenv
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env
load_dotenv()

# Paths
ASYNC_DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./qfy.db")
# Convert async URL to sync for the cleanup script
DB_URL = ASYNC_DB_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
UPLOADS_DIR = "static/uploads"

def clear_database():
    print("🚀 Starting Database Cleanup...")
    
    # 1. Clear Database Tables
    try:
        engine = create_engine(DB_URL)
        metadata = MetaData()
        metadata.reflect(bind=engine)
        
        # We want to clear data but keep tables (or drop and recreate if preferred)
        # Here we just delete all rows from all tables
        with engine.connect() as conn:
            # Disable foreign key checks for SQLite during cleanup
            conn.execute(text("PRAGMA foreign_keys = OFF;"))
            
            for table in reversed(metadata.sorted_tables):
                if table.name == 'alembic_version':
                    print(f"⏩ Skipping system table: {table.name}")
                    continue
                    
                print(f"🗑️  Clearing table: {table.name}")
                conn.execute(table.delete())
            
            # 3. Seed Admin User
            print("🌱 Seeding default admin operator...")
            from app.services.auth_service import get_password_hash
            import uuid
            
            # Using raw SQL to avoid model dependency issues in scripts
            admin_id = str(uuid.uuid4()).replace("-", "")
            hashed_pw = get_password_hash("admin123")
            
            conn.execute(text(
                "INSERT INTO operators (id, username, hashed_password, role, is_active, created_at) "
                "VALUES (:id, :user, :pw, 'admin', 1, CURRENT_TIMESTAMP)"
            ), {"id": admin_id, "user": "admin", "pw": hashed_pw})
            
            conn.execute(text("PRAGMA foreign_keys = ON;"))
            conn.commit()
            
        print("✅ Database tables cleared and admin seeded.")
    except Exception as e:
        print(f"❌ Error clearing database: {e}")

    # 2. Clear Uploads Directory
    if os.path.exists(UPLOADS_DIR):
        print(f"📂 Clearing uploads directory: {UPLOADS_DIR}")
        try:
            # Delete all files in the directory but keep the directory itself
            for filename in os.listdir(UPLOADS_DIR):
                file_path = os.path.join(UPLOADS_DIR, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'Failed to delete {file_path}. Reason: {e}')
            print("✅ Uploads directory cleared.")
        except Exception as e:
            print(f"❌ Error clearing uploads: {e}")
    else:
        print("ℹ️  Uploads directory not found, skipping.")

    print("\n✨ Cleanup Complete. System is now fresh.")

if __name__ == "__main__":
    # Ensure we are in the backend directory
    # (Assuming the script is run from backend root)
    clear_database()
