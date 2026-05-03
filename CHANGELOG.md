# Changelog

All notable changes to the Q-FY project will be documented in this file.

## [v1.3.0-Inline-Intelligence] - 2026-05-04

### 🚀 Added
- **Inline Intelligence Grid**: Replaced modal-based lookups with an integrated 11-digit (QID) and 8-digit (CR) entry grid directly on the dashboard.
- **Contextual Search Tabs**: Integrated "Individual" and "Business" mode toggles into inline tabs above the input area for faster navigation.
- **Auto-Normalization Logic**: Implemented intelligent leading-zero padding for CR numbers, autonomously fulfilling the 8-digit standard from shorter entries.
- **Digit Flow Engine**: High-fidelity auto-focus and backspace logic for digit boxes, providing a premium, native-app data entry feel.
- **Input Clarity Labels**: Added explicit guidance labels ("Enter Qatar ID Number", etc.) and updated subheaders for better situational awareness.

### 🛠️ Changed
- **Overview Stats Redesign**: Rebuilt the stats section with a compact, 5-column grid featuring icon-glow effects (Amber, Green, Blue, Orange, Red) and high-density labels.
- **UI De-cluttering**: Removed redundant "SCAN ID CARD" CTA from the dashboard to focus users on the primary lookup grid.
- **Strict Validation**: Enforced strict length requirements (11 for QID, 8 for CR) at the UI level to prevent illegal backend queries.
- **Search Logic Sync**: Unified the `handleSearch` engine to prioritize joined digit state with automatic UI feedback on padding.

### 🐞 Fixed
- **JSX Structural Integrity**: Resolved critical Vite/Babel parsing errors by re-normalizing the `DashboardPage.tsx` section hierarchy.
- **Legacy State Cleanup**: Purged unused `isSearchDropdownOpen` and redundant search-prefix logic to streamline the frontend bundle.

---

## [v1.2.0-Customer-Intelligence] - 2026-05-04

### 🚀 Added
- **User Intelligence Profiles**: Launched `UserDetailPage.tsx`, providing a high-fidelity dashboard for individual customer data, visit counts, and identity history.
- **Visual Identity Audit**: High-resolution front/back ID scan previews integrated into customer profiles.
- **Priority Re-Scan Banners**: Dynamic, prominent alert banners for expired or expiring IDs with a direct "RE-SCAN ID NOW" action.
- **Date-Range History Filters**: Integrated a dual-calendar filter (From/To) on the History Page for precise audit lookups.
- **Deep-Link Filtering**: Automatic filtering on History Page via `?qid=` URL parameters, enabling one-click audit transitions from profiles.
- **Global Number Standards**: Integrated `react-phone-input-2` with custom dark-mode aesthetics for comprehensive international mobile support.

### 🛠️ Changed
- **Audit Archive Evolution**: Transformed the History Page into a read-only research tool, moving all management actions (re-scan, details) to the User Detail Page.
- **Data Streamlining**: Removed redundant `Employer` and `Profession` fields from UI (Lookup, Scan, and Detail views) to align with actual OCR extraction capabilities.
- **Search UI Polish**: Re-engineered the History search bar into a single-row luxury layout with integrated date pickers and focus animations.
- **Mobile Workflow**: Refined the "Quick Digit Entry" to appear only for Qatar-based (+974) numbers, preventing UI clutter for international entries.

### 🐞 Fixed
- **Code Integrity Cleanup**: Resolved critical linting and reference errors (`isIntlMode`, `setEmployer`, `RefreshCcw`) across frontend modules.
- **Date Picker Aesthetics**: Applied `color-scheme: dark` and CSS overrides to native date pickers to match the project's premium design system.
- **Backend Filter Support**: Updated `lookup.py` logic to correctly handle `start_date` and `end_date` parameters.

---

## [v1.1.0-Mobile-Intelligence] - 2026-05-04

### 🚀 Added
- **Mobile Number Integration**: Complete end-to-end support for collecting and storing mobile numbers.
- **Premium Mobile Modal**: Lightbox-style digit entry UI for Qatar numbers (+974) and international support.
- **Advanced Lookup Page**: New page with complex filtering (Name, QID, Mobile, Nationality, Status).
- **Backend Search**: Global search capabilities across the entire customer database.
- **Status Tracking**: Dynamic calculation of Active, Inactive, Grace Period, and Expiring Soon statuses.

### 🛠️ Changed
- **Dashboard Search**: Updated to allow searching by mobile number in addition to QID.
- **Result Cards**: Integrated mobile number display in both Dashboard and Lookup result views.
- **Audit Labels**: Updated status terminology to "Inactive" and "Expiring Soon" per user preference.

### 🐞 Fixed
- **History Page Filter**: Resolved backend error in `lookup.py` that prevented date range filtering.
- **Frontend Persistence**: Fixed `HistoryPage` to preserve query parameters (QID, dates) after navigation and page reloads.

---


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
