# Changelog

All notable changes to the Q-FY project will be documented in this file.

## [v1.0.0-Hardening] - 2026-05-04

### 🚀 Added
- **Server-Side Image Persistence**: Implemented `storage.py` service to save scanned ID images to `static/uploads/` instead of storing Base64 in the database.
- **Naming Convention**: Automatic file naming for scans: `{NAME}_{QID}_{SIDE}.jpg`.
- **Audit Tracking**: Added `is_manual_edit` and `modified_fields` columns to the `User` model to track operator corrections.
- **RBAC Infrastructure**: Implemented `admin` and `staff` role support with `RoleChecker` middleware and JWT role embedding.
- **Cleanup Utility**: Created `scripts/clear_db.py` for full system reset and admin re-seeding.

### 🛠️ Changed
- **Database Optimization**: Transitioned from inline Base64 storage to URL-based static paths, significantly improving query performance and DB size.
- **OCR Engine Stabilization**: Fixed PaddleOCR 3.x result parsing and Pydantic serialization for `numpy` scalars.
- **History UI**: Updated `HistoryPage` to display physical image thumbnails from the server.
- **Dashboard Search**: Refined "Not Found" state handling to distinguish between missing records and system errors.
- **Scan Lifecycle**: Disabled "Save" button until OCR processing is complete to ensure data integrity.

### 🐞 Fixed
- **Bcrypt Compatibility**: Patched `passlib` to resolve `AttributeError: module 'bcrypt' has no attribute '__about__'` in Python 3.12 environments.
- **SQLite Date Formatting**: Implemented robust date normalization to prevent `TypeError` during record upserts.
- **Alembic Sync**: Fixed migration chain integrity after database purges using `alembic stamp`.
- **404 Handling**: Updated `ApiClient` to attach HTTP status codes to error objects for better UI feedback.

---
*End of Hardening Phase - System Stabilized for Production.*
