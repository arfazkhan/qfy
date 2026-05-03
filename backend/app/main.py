from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import auth, scan, users, lookup, businesses
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Q-fy API", version="1.0.0")

# CORS configuration
origins = os.getenv("CORS_ORIGINS", '["tauri://localhost", "http://localhost:3000", "http://localhost:1420"]')
import json
try:
    origins_list = json.loads(origins)
except:
    origins_list = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(scan.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(lookup.router, prefix="/api/v1")
app.include_router(businesses.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
