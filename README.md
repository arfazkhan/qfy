# Q-FY: QID Intelligence System 🛡️

A production-grade Qatar ID OCR and visitor management system designed for high-accuracy data extraction, secure persistence, and real-time operational intelligence.

## 🚀 Key Features

*   **Intelligent OCR Pipeline**: Powered by PaddleOCR for high-precision extraction of Qatar ID fields (QID, Name, Expiry, DOB, Nationality, Employer).
*   **Audit-Ready Architecture**: Every record tracks manual corrections and modified fields to ensure data integrity.
*   **Performance Storage**: Shifted from heavy Base64 database storage to a URL-based static asset system for blazing-fast search and retrieval.
*   **Role-Based Infrastructure**: Built-in RBAC support for `admin` and `staff` roles.
*   **Real-time Analytics**: Dashboard with live stats on total scans, expiry warnings, and visitor trends.
*   **Smart Life-cycle Management**: Automatic status calculation (Active, Expiring Soon, Grace Period, Invalid).

## 🛠️ Technology Stack

*   **Backend**: FastAPI (Python), SQLAlchemy (Async), PaddleOCR, Alembic (Migrations), SQLite/PostgreSQL.
*   **Frontend**: React, TypeScript, Vite, Lucide Icons, Vanilla CSS (Premium Aesthetics).
*   **Storage**: Local Filesystem with URL-based static serving.

## 🏁 Getting Started

### Backend Setup
1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Configure `.env` (Database URL, JWT Secret).
4. Run migrations: `python -m alembic upgrade head`.
5. Start server: `python -m uvicorn app.main:app --reload`.

### Frontend Setup
1. Navigate to `/frontend`.
2. Install dependencies: `npm install`.
3. Start dev server: `npm run dev`.

## 🔧 Utilities

### Database Cleanup & Reset
To reset the system and re-seed the default admin:
```bash
cd backend
python scripts/clear_db.py
```
*Default Admin: admin / admin123*

## 📝 Licensing & Privacy
Designed for secure, local-first data processing of sensitive ID information.

---
*Built with precision for the Qatar operational landscape.*
