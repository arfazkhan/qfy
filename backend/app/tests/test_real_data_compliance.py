import requests
import os
import json
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def test_real_data_compliance():
    print("🚀 Starting Real Data Compliance Test...")
    
    # 1. Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASS
    })
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Logged in as admin.")

    # 2. Create 3 Users (Owner, Authorized, Manager)
    users = []
    for i in range(3):
        qid = f"9990000000{i}"
        user_data = {
            "qid_number": qid,
            "name": f"Test User {i}",
            "expiry_date": (date.today() + timedelta(days=365)).isoformat(),
            "nationality": "Qatari",
            "mobile_number": f"5555666{i}"
        }
        res = requests.post(f"{BASE_URL}/users/upsert", json=user_data, headers=headers)
        if res.status_code in [200, 409]:
            data = res.json()
            if res.status_code == 409 or "existing" in data:
                users.append(data["existing"]["id"])
                print(f"✅ Found existing user {i}: {qid}")
            else:
                users.append(data["id"])
                print(f"✅ Created user {i}: {qid}")
        else:
            print(f"❌ Failed to create user {i}: {res.text}")
            return

    # 3. Register Business
    cr_number = "REAL-TEST-101"
    biz_data = {
        "cr_number": cr_number,
        "name": "Real Data Test Corp",
        "cr_expiry_date": (date.today() + timedelta(days=365)).isoformat(),
        "nationality": "Qatari",
        "address": "Intake Test Street 1",
        "mobile": "44445555",
        "business_type": "WLL",
        "business_nature": "Software Testing",
        "owner_id": users[0],
        "authorized_person_id": users[1],
        "manager_id": users[2]
    }
    biz_res = requests.post(f"{BASE_URL}/businesses/upsert", json=biz_data, headers=headers)
    if biz_res.status_code == 200:
        print(f"✅ Business registered: {cr_number}")
    else:
        print(f"❌ Business registration failed: {biz_res.text}")
        return

    # 4. Upload CHANGELOG.md as all 5 documents
    changelog_path = "../CHANGELOG.md"
    if not os.path.exists(changelog_path):
        # Fallback if path is different
        changelog_path = "CHANGELOG.md"
        
    doc_types = [
        "Authorization Letter",
        "Commercial License",
        "Establishment Card",
        "Authorized Signatures",
        "Manager Trade License"
    ]
    
    for doc_type in doc_types:
        with open(changelog_path, "rb") as f:
            files = {"file": (os.path.basename(changelog_path), f, "text/markdown")}
            data = {
                "document_type": doc_type,
                "is_available": "true",
                "expiry_date": (date.today() + timedelta(days=365)).isoformat()
            }
            res = requests.post(
                f"{BASE_URL}/businesses/{cr_number}/documents",
                headers=headers,
                data=data,
                files=files
            )
            if res.status_code == 200:
                print(f"✅ Uploaded {doc_type}")
            else:
                print(f"❌ Failed to upload {doc_type}: {res.text}")
                return

    # 5. Verify Compliance Status
    status_res = requests.get(f"{BASE_URL}/businesses/{cr_number}", headers=headers)
    if status_res.status_code == 200:
        biz_info = status_res.json()
        print(f"\n📊 FINAL STATUS: {biz_info['status']}")
        print(f"📄 Documents Count: {len(biz_info['documents'])}")
        
        if biz_info['status'] == "COMPLIANT":
            print("🏆 TEST PASSED: Business is fully compliant with real data!")
        else:
            print(f"⚠️ TEST FAILED: Status is {biz_info['status']}")
    else:
        print(f"❌ Failed to fetch business details: {status_res.text}")

if __name__ == "__main__":
    test_real_data_compliance()
