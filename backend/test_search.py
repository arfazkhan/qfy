import requests
import json

url = "http://localhost:8000/api/v1/businesses/search/00007777"
headers = {
    "Authorization": "Bearer TEST_TOKEN" # I need a real token or it will 401
}

# Try without token first to see if CORS is the real issue
try:
    response = requests.get(url)
    print(f"Status: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Content: {response.text}")
except Exception as e:
    print(f"Error: {e}")
