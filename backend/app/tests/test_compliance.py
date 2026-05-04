import sys
import os
from datetime import date, timedelta
from typing import List

# Add parent dir to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.db.business_logic import compute_business_status

# Mock classes to simulate DB models
class MockBusiness:
    def __init__(self, cr_number, cr_expiry, owner_id=None, authorized_person_id=None, manager_id=None):
        self.cr_number = cr_number
        self.cr_expiry = cr_expiry
        self.owner_id = owner_id
        self.authorized_person_id = authorized_person_id
        self.manager_id = manager_id

class MockDocument:
    def __init__(self, document_type, expiry_date=None):
        self.document_type = document_type
        self.expiry_date = expiry_date

class MockUser:
    def __init__(self, qid, expiry_date):
        self.qid_number = qid
        self.expiry_date = expiry_date

def run_scenarios():
    today = date.today()
    future = today + timedelta(days=60)
    past = today - timedelta(days=1)
    soon = today + timedelta(days=15)
    
    # 1. COMPLIANT Scenario
    biz1 = MockBusiness("12345", future, "owner1", "auth1", "mgr1")
    docs1 = [
        MockDocument("Authorization Letter", future),
        MockDocument("Commercial License", future),
        MockDocument("Establishment Card", future),
        MockDocument("Authorized Signatures", future),
        MockDocument("Manager Trade License", future)
    ]
    owner1 = MockUser("owner1", future)
    auth1 = MockUser("auth1", future)
    mgr1 = MockUser("mgr1", future)
    
    status1 = compute_business_status(biz1, docs1, owner1, auth1, mgr1)
    print(f"Scenario 1 (All Good): Expected COMPLIANT, Got {status1}")

    # 2. INVALID Scenario (CR Expired)
    biz2 = MockBusiness("22222", past, "owner1", "auth1", "mgr1")
    status2 = compute_business_status(biz2, docs1, owner1, auth1, mgr1)
    print(f"Scenario 2 (CR Expired): Expected INVALID, Got {status2}")

    # 3. NON_COMPLIANT Scenario (Missing Doc)
    docs3 = docs1[:-1] # Remove last doc
    status3 = compute_business_status(biz1, docs3, owner1, auth1, mgr1)
    print(f"Scenario 3 (Missing Doc): Expected NON_COMPLIANT, Got {status3}")

    # 4. NON_COMPLIANT Scenario (Doc Expired)
    docs4 = [
        MockDocument("Authorization Letter", future),
        MockDocument("Commercial License", past), # Expired
        MockDocument("Establishment Card", future),
        MockDocument("Authorized Signatures", future),
        MockDocument("Manager Trade License", future)
    ]
    status4 = compute_business_status(biz1, docs4, owner1, auth1, mgr1)
    print(f"Scenario 4 (Doc Expired): Expected NON_COMPLIANT, Got {status4}")

    # 5. NON_COMPLIANT Scenario (Identity Expired)
    owner5 = MockUser("owner1", past) # Expired
    status5 = compute_business_status(biz1, docs1, owner5, auth1, mgr1)
    print(f"Scenario 5 (Identity Expired): Expected NON_COMPLIANT, Got {status5}")

    # 6. NON_COMPLIANT Scenario (Missing Link)
    biz6 = MockBusiness("66666", future, "owner1", "auth1", None) # Manager missing
    status6 = compute_business_status(biz6, docs1, owner1, auth1, None)
    print(f"Scenario 6 (Missing Link): Expected NON_COMPLIANT, Got {status6}")

    # 7. PARTIAL Scenario (Expiring Soon)
    owner7 = MockUser("owner1", soon) # Expiring in 15 days
    status7 = compute_business_status(biz1, docs1, owner7, auth1, mgr1)
    print(f"Scenario 7 (Expiring Soon): Expected PARTIAL, Got {status7}")

if __name__ == "__main__":
    run_scenarios()
