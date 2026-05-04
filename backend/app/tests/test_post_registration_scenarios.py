import requests
import os
from datetime import date, timedelta
import time

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def test_lifecycle_scenarios():
    print("🔄 Starting Business Compliance Lifecycle Test...")
    
    # 1. Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Setup Users
    users = []
    for i in range(3):
        qid = f"8880000000{i}"
        user_data = {
            "qid_number": qid,
            "name": f"Lifecycle User {i}",
            "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
            "nationality": "Qatari",
            "mobile_number": f"6666777{i}"
        }
        res = requests.post(f"{BASE_URL}/users/upsert", json=user_data, headers=headers)
        data = res.json()
        uid = data["existing"]["id"] if "existing" in data else data["id"]
        users.append(uid)

    # 3. Step 1: Create Business (Fresh State)
    cr_number = f"LIFE-{int(time.time())}"
    biz_data = {
        "cr_number": cr_number,
        "name": "Lifecycle Dynamics Corp",
        "cr_expiry_date": (date.today() + timedelta(days=365)).isoformat(),
        "nationality": "Qatari",
        "address": "Lifecycle Way 1",
        "mobile": "99998888",
        "business_type": "WLL",
        "business_nature": "Evolutionary Tech",
        "owner_id": users[0],
        "authorized_person_id": users[1],
        "manager_id": users[2]
    }
    requests.post(f"{BASE_URL}/businesses/upsert", json=biz_data, headers=headers)
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 1 (Created): Status = {status_res['status']} (Expected NON_COMPLIANT)")

    doc_types = [
        "Authorization Letter",
        "Commercial License",
        "Establishment Card",
        "Authorized Signatures",
        "Manager Trade License"
    ]

    changelog_path = "../CHANGELOG.md"
    if not os.path.exists(changelog_path):
        changelog_path = "CHANGELOG.md"

    # Upload first doc
    with open(changelog_path, "rb") as f:
        requests.post(
            f"{BASE_URL}/businesses/{cr_number}/documents",
            headers=headers,
            data={"document_type": doc_types[0], "is_available": "true", "expiry_date": (date.today() + timedelta(days=365)).isoformat()},
            files={"file": ("test.md", f)}
        )
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 2 (1 Doc Uploaded): Status = {status_res['status']} (Expected NON_COMPLIANT)")

    # 5. Step 3: Upload remaining 4 Documents
    for i in range(1, 5):
        with open(changelog_path, "rb") as f:
            requests.post(
                f"{BASE_URL}/businesses/{cr_number}/documents",
                headers=headers,
                data={"document_type": doc_types[i], "is_available": "true", "expiry_date": (date.today() + timedelta(days=365)).isoformat()},
                files={"file": ("test.md", f)}
            )
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 3 (All 5 Docs Uploaded): Status = {status_res['status']} (Expected COMPLIANT)")

    # 6. Step 4: One Document Expires
    # We update the Commercial License to have a past expiry
    requests.post(
        f"{BASE_URL}/businesses/{cr_number}/documents",
        headers=headers,
        data={"document_type": "Commercial License", "is_available": "true", "expiry_date": (date.today() - timedelta(days=1)).isoformat()}
    )
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 4 (Commercial License Expired): Status = {status_res['status']} (Expected NON_COMPLIANT)")

    # 7. Step 5: Renew Document
    requests.post(
        f"{BASE_URL}/businesses/{cr_number}/documents",
        headers=headers,
        data={"document_type": "Commercial License", "is_available": "true", "expiry_date": (date.today() + timedelta(days=365)).isoformat()}
    )
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 5 (Document Renewed): Status = {status_res['status']} (Expected COMPLIANT)")

    # 8. Step 6: Manager Identity Expires
    # We update User 2 (Manager) to have a past expiry
    manager_qid = f"88800000002"
    manager_data = {
        "qid_number": manager_qid,
        "name": "Lifecycle User 2",
        "expiry_date": (date.today() - timedelta(days=1)).isoformat(), # Expired
        "nationality": "Qatari",
        "mobile_number": "66667772",
        "force": True
    }
    requests.post(f"{BASE_URL}/users/upsert", json=manager_data, headers=headers)
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 6 (Manager QID Expired): Status = {status_res['status']} (Expected NON_COMPLIANT)")

    # 9. Step 7: Manager Renewed QID
    manager_data["expiry_date"] = (date.today() + timedelta(days=365)).isoformat()
    manager_data["force"] = True
    requests.post(f"{BASE_URL}/users/upsert", json=manager_data, headers=headers)
    
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers).json()
    print(f"📍 Step 7 (Manager QID Renewed): Status = {status_res['status']} (Expected COMPLIANT)")

if __name__ == "__main__":
    test_lifecycle_scenarios()
