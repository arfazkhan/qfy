import requests
import os
import io
from datetime import date, timedelta
import time

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

def run_rigorous_tests():
    print("🧨 Starting Rigorous/Chaos Testing...")
    
    # Setup Auth
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Scenario 1: Malicious File Upload (Script)
    print("\n[Test 1] Malicious File Upload (.py)")
    fake_script = io.BytesIO(b"import os; os.system('rm -rf /')")
    res = requests.post(
        f"{BASE_URL}/businesses/REAL-TEST-101/documents",
        headers=headers,
        data={"document_type": "Commercial License", "is_available": "true"},
        files={"file": ("malicious.py", fake_script, "text/x-python")}
    )
    if res.status_code == 400:
        print("✅ SUCCESS: Malicious file blocked with 400.")
    else:
        print(f"❌ FAILED: Malicious file accepted! Status: {res.status_code}")

    # Scenario 2: Malformed Date Format
    print("\n[Test 2] Malformed Date Format")
    biz_data = {
        "cr_number": "BAD-DATE-123",
        "name": "Bad Date Corp",
        "cr_expiry_date": "04-05-2026", # Wrong format, expects YYYY-MM-DD
        "nationality": "Qatari",
        "address": "Doha",
        "mobile": "55551111",
        "business_type": "WLL",
        "business_nature": "Testing"
    }
    res = requests.post(f"{BASE_URL}/businesses/upsert", json=biz_data, headers=headers)
    if res.status_code == 400: # We hardened this to return 400
        print(f"✅ SUCCESS: Bad date format blocked with {res.status_code}.")
    else:
        print(f"❌ FAILED: Bad date format accepted! Status: {res.status_code}")

    # Scenario 3: Missing Mandatory Fields
    print("\n[Test 3] Missing Mandatory Fields")
    incomplete_data = {"cr_number": "MISSING-FIELDS"}
    res = requests.post(f"{BASE_URL}/businesses/upsert", json=incomplete_data, headers=headers)
    if res.status_code == 422:
        print("✅ SUCCESS: Missing fields blocked with 422.")
    else:
        print(f"❌ FAILED: Incomplete data accepted! Status: {res.status_code}")

    # Scenario 4: Unauthorized Access (No Token)
    print("\n[Test 4] Unauthorized Access (No Token)")
    res = requests.get(f"{BASE_URL}/businesses/REAL-TEST-101")
    if res.status_code == 401:
        print("✅ SUCCESS: Unauthorized access blocked with 401.")
    else:
        print(f"❌ FAILED: Unauthorized access allowed! Status: {res.status_code}")

    # Scenario 5: Large Identity Swap (Compliance Propagation)
    print("\n[Test 5] Identity Swap Propagation")
    # 1. Create 2 Users: Valid and Expired
    qid_valid = f"V-{int(time.time())}"
    qid_expired = f"E-{int(time.time())}"
    
    requests.post(f"{BASE_URL}/users/upsert", json={"qid_number": qid_valid, "name": "Valid Guy", "expiry_date": "2030-01-01", "nationality": "Qatari"}, headers=headers)
    requests.post(f"{BASE_URL}/users/upsert", json={"qid_number": qid_expired, "name": "Expired Guy", "expiry_date": "2020-01-01", "nationality": "Qatari"}, headers=headers)
    
    v_id = requests.get(f"{BASE_URL}/users/{qid_valid}", headers=headers).json()["user"]["id"]
    e_id = requests.get(f"{BASE_URL}/users/{qid_expired}", headers=headers).json()["user"]["id"]

    # 2. Create Business with Valid Owner
    cr = f"SWAP-{int(time.time())}"
    biz_init = {
        "cr_number": cr, "name": "Swap Test", "cr_expiry_date": "2030-01-01", "nationality": "Qatari",
        "address": "Doha", "mobile": "1111", "business_type": "WLL", "business_nature": "Tech",
        "owner_id": v_id, "authorized_person_id": v_id, "manager_id": v_id
    }
    requests.post(f"{BASE_URL}/businesses/upsert", json=biz_init, headers=headers)
    
    # Upload docs to make it COMPLIANT
    doc_types = ["Authorization Letter", "Commercial License", "Establishment Card", "Authorized Signatures", "Manager Trade License"]
    for dt in doc_types:
        requests.post(f"{BASE_URL}/businesses/{cr}/documents", headers=headers, data={"document_type": dt, "is_available": "true", "expiry_date": "2030-01-01"})
    
    status_before = requests.get(f"{BASE_URL}/businesses/{cr}", headers=headers).json()["status"]
    print(f"   - Initial Status (Valid Owner): {status_before}")

    # 3. Swap Owner to Expired Guy
    biz_init["owner_id"] = e_id
    requests.post(f"{BASE_URL}/businesses/upsert", json=biz_init, headers=headers)
    
    status_after = requests.get(f"{BASE_URL}/businesses/{cr}", headers=headers).json()["status"]
    print(f"   - Status After Swap (Expired Owner): {status_after}")
    
    if status_after == "NON_COMPLIANT":
        print("✅ SUCCESS: Compliance correctly recalculated after identity swap.")
    else:
        print(f"❌ FAILED: Status remained {status_after} after swapping to expired owner.")

if __name__ == "__main__":
    run_rigorous_tests()
