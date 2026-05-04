from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.business_models import Business, BusinessDocument, BusinessNote
from app.db.models import User, Operator

# Database URL
DATABASE_URL = "sqlite:///./qfy.db"

def migrate_cr_numbers():
    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        # Fetch all businesses
        businesses = session.query(Business).all()
        print(f"Found {len(businesses)} businesses to check.")
        
        updated_count = 0
        for business in businesses:
            if business.cr_number and len(business.cr_number) < 8 and business.cr_number.isdigit():
                old_cr = business.cr_number
                new_cr = old_cr.zfill(8)
                
                print(f"Updating CR: {old_cr} -> {new_cr}")
                business.cr_number = new_cr
                updated_count += 1
        
        if updated_count > 0:
            session.commit()
            print(f"Successfully updated {updated_count} CR numbers.")
        else:
            print("No CR numbers needed updating.")

if __name__ == "__main__":
    migrate_cr_numbers()
