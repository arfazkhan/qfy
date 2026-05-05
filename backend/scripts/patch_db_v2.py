import sqlite3
import os

db_path = "d:/qfy/backend/qfy.db"

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check existing columns
    cursor.execute("PRAGMA table_info(businesses)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if "owner_type" not in columns:
        print("Adding owner_type column...")
        cursor.execute("ALTER TABLE businesses ADD COLUMN owner_type VARCHAR DEFAULT 'INDIVIDUAL'")
    
    if "owner_company_name" not in columns:
        print("Adding owner_company_name column...")
        cursor.execute("ALTER TABLE businesses ADD COLUMN owner_company_name VARCHAR")
        
    if "owner_cr_number" not in columns:
        print("Adding owner_cr_number column...")
        cursor.execute("ALTER TABLE businesses ADD COLUMN owner_cr_number VARCHAR")
        
    conn.commit()
    print("Database patched successfully.")
except Exception as e:
    print(f"An error occurred: {e}")
    conn.rollback()
finally:
    conn.close()
