# Changelog

All notable changes to the Q-FY project will be documented in this file.

## [v1.8.0-Document-Uploads] - 2026-05-04

### 🚀 Added
- **Document Upload System**: Replaced simple compliance checklist with a functional file upload system.
- **File Storage Backend**: Documents are now stored in `static/uploads/{cr_number}` with unique naming conventions.
- **Document Management UI**: New `DocumentUploadRow` component for uploading, scanning, and viewing mandatory documents.
- **Expiry Tracking**: Integrated expiry date tracking for each business document.
- **Multipart Support**: Backend router now supports `multipart/form-data` for secure document intake.
- **Code Hygiene**: Resolved multiple linting warnings by purging unused imports across `BusinessFormPage`, `BusinessDetailPage`, and `DocumentUploadRow`.

---

## [v1.7.0-Compliance-Engine] - 2026-05-04

### 🚀 Added
- **Multi-Tier Compliance Engine**: Implemented a 3-layer status engine for businesses (CR Validity, Mandatory Document Check, and Linked Identity Validation).
- **Manager Incharge Identity Link**: Added a new mandatory identity link for businesses, including its own specific compliance requirements (Manager Trade License).
- **Expanded Business Metadata**: Added fields for Nationality, Registered Address, Contact Mobile, Business Type, and Business Nature.
- **Establishment Card Integration**: Introduced the "Establishment Card (Computer Card)" as a mandatory compliance document.

### 🛠️ Changed
- **Strict Registration Validation**: The system now blocks business registration if mandatory links (Owner, Authorized Person, Manager) or documents are missing.
- **Enhanced Business Dashboard**: Updated `IndividualResultCard` and `BusinessDetailPage` to reflect new compliance states (COMPLIANT, NON_COMPLIANT, PARTIAL).
- **Compliance Status Real-time Recalculation**: The system now automatically cross-references the expiry dates of all linked individuals when calculating business status.

### 🐞 Fixed
- **Database Schema Sync**: Applied Alembic migrations to synchronize the SQLite database with the new multi-relation business model.

---

## [v1.6.1-Privacy-Aesthetics] - 2026-05-04

### 🚀 Added
- **Luxury Initial-Based Avatars**: Replaced sensitive, utility-driven ID scan avatars with high-fidelity, initial-based luxury placeholders across the entire application (Dashboard, Lookup, History, and User Details).
- **Privacy-by-Design**: Decoupled user identity from sensitive ID card scans in the UI to satisfy privacy standards for high-margin retail environments and luxury branding.

### 🛠️ Changed
- **Premium Placeholder Logic**: Implemented a unified `linear-gradient` (Charcoal/Gold) styling for all user avatars, ensuring consistent branding across all screens.
- **Action Banner Refinement**: Restored and enhanced the "Action Required" banner in `UserDetailPage` with better visibility and a corrected `Clock` icon.

### 🐞 Fixed
- **Missing Icon Variable**: Corrected a CSS variable error where `--amber` was used instead of `--warning` in the status banners.
- **UI Consistency Audit**: Refactored `LookupPage.tsx` and `HistoryPage.tsx` to align their customer list views with the new privacy-first design system.

---

## [v1.6.0-Hybrid-Storage] - 2026-05-04

### 🚀 Added
- **Hybrid Local-First Storage**: Implemented a desktop-first storage strategy using Tauri v2 native filesystem plugins. Users can now choose to archive document scans locally on their desktop (`~/Desktop/QFY_Archive/`) to reduce cloud storage costs and egress fees.
- **Persistent Storage Preference**: Added a global "Storage Mode" selector in the `ScanPage` that persists user preferences (LOCAL vs. CLOUD) across sessions via `useSettingsStore`.
- **Tauri Native Resolution**: Integrated `convertFileSrc` into the `ApiClient` to securely resolve and display local filesystem images within the Tauri environment.
- **Storage Mode Metadata**: Updated the backend database schema and Pydantic models to track the `storage_mode` for every `User` and `BusinessDocument`.

### 🛠️ Changed
- **Archive Permission Scopes**: Configured Tauri `fs` and `path` plugins with recursive desktop scopes to ensure secure and authorized file operations.
- **Unified Path Resolution**: Refactored `UserDetailPage` and image rendering components to dynamically switch between cloud URLs and local URI schemes based on record provenance.

### 🐞 Fixed
- **JSX Structural Integrity**: Fixed critical nesting errors in `ScanPage.tsx` caused by a dangling `scan-page-grid` div and mismatched JSX expressions.
- **Type Safety Hardening**: Resolved TypeScript errors related to `fullscreenImage` nullability and image source attribute expectations.
- **UI Overflow**: Corrected success modal positioning to ensure overlays are properly decoupled from the layout grid.
- **Import Hygiene**: Purged unused `Save` icons and redundant React imports to optimize the frontend bundle.

---

## [v1.5.0-UX-Stability] - 2026-05-04

### 🚀 Added
- **Intelligent Conflict Resolution**: Implemented a "Duplicate Found" workflow that intercepts duplicate QID entries and prompts users to compare, merge, or discard records with a force-override mechanism.
- **Dynamic Filename Preview**: Added a real-time "Target Archive Name" preview in the scan UI (e.g., `NAME_QID_FRONT.jpg`) to ensure naming consistency before archival.
- **Visual Success Feedback**: Integrated high-fidelity glassmorphism success overlays and automated redirection logic for both identity and business registrations.
- **Manual Data Fallback**: Decoupled registration from OCR dependency, allowing for complete manual data entry and storage even when automatic extraction fails.
- **Onboarding Context**: Added "Initial Operational Note" field to the business registration form, allowing operators to capture day-one context that automatically flows into the business timeline.

### 🛠️ Changed
- **Precision Date Pickers**: Replaced legacy text inputs with native HTML5 date pickers for DOB and Expiry fields, supported by backend ISO normalization.

### 🐞 Fixed
- **Real-time Status Engine**: Fixed backend status return unpacking and implemented a robust frontend calculator that supports multiple regional date formats (DD/MM/YYYY) for accurate "Grace Period" detection.
- **Extracted Data Sync**: Synchronized the identity editing state to automatically ingest new OCR extraction results, preventing data lag during the scanning process.

---

## [v1.4.1-UX-Stabilization] - 2026-05-04

### 🚀 Added
- **Native Date Selection**: Implemented native date pickers for `Date of Birth` and `Expiry Date` in the identity scanning workflow to eliminate manual formatting errors.
- **Backend Date Normalization**: Added server-side utility in `scan.py` to normalize OCR-extracted dates into standard ISO format (`YYYY-MM-DD`).
- **Success Feedback System**: Integrated high-fidelity success overlays for both identity and business registrations with automated redirection.
- **Manual Fallback Resilience**: Enabled manual entry paths that bypass OCR dependencies, ensuring users can always complete registration.

---

## [v1.4.0-Identity-Graph] - 2026-05-04

### 🚀 Added
- **Identity Graph Architecture**: Shifted from flat identity records to a relational model where Businesses reference Individuals as Sources of Truth.
- **Business Compliance Engine**: Multi-tier status engine (INVALID / NON-COMPLIANT / PARTIAL / COMPLIANT) based on CR expiry, document presence, and linked identity validity.
- **Operational Notes Timeline**: Centralized system for tracking document promises and operational context for businesses.
- **IdentityPicker Component**: Reusable UI component for searching, linking, or scanning identities for business roles.
- **Business Management Pages**: New detailed management views for onboarding (`BusinessFormPage`) and compliance monitoring (`BusinessDetailPage`).
- **Dashboard Intelligence**: Instant search bifurcation for QID vs CR with immediate compliance summaries.

### 🛠️ Changed
- **Relational Refactoring**: Updated database schema with `businesses`, `business_documents`, and `business_notes` tables.
- **Dashboard Integration**: Refactored `DashboardPage.tsx` to handle the new relational business results and "Not Found" registration workflows.

### 🐞 Fixed
- **Module Resolution Cleanup**: Resolved critical `App.tsx` import errors for Business pages by normalizing export structures.
- **IdentityPicker Integrity**: Fixed broken `ApiClient` imports and synchronized prop signatures (`onLink`, `onUnlink`) with state management.
- **UI Logic Hardening**: Corrected shorthand style properties (`pr`, `py`) in `BusinessDetailPage.tsx` and purged redundant Lucide icon imports across the suite.
- **Form Feedback Engine**: Implemented linked user state previews in the Business registration flow to confirm identity associations before submission.
- **Layout Routing Fix**: Refactored `MainLayout.tsx` to use `<Outlet />`, resolving the "missing children" prop error when used as a layout route in `App.tsx`.
- **Backend UUID & Schema Sync**: Fixed a `StatementError` by correctly casting string identifiers to UUID objects and transitioned to JSON-based Pydantic schemas.
- **Search & Navigation Hub**: Added "Register Business" to the sidebar and corrected the `IdentityPicker` to use standard user lookup endpoints with specialized 404 handling.
- **Stateful Scan Return**: Implemented a `returnUrl` system in the `ScanPage` to automatically redirect and re-link new identities back to the registration form, eliminating workflow disconnection.

---

## [v1.3.1-Data-Intelligence] - 2026-05-04

### 🚀 Added
- **Real-Time Analytics Polling**: Implemented a 30-second automated refresh cycle for dashboard stats to ensure live situational awareness.
- **Entity Type Architecture**: Added `entity_type` column to the `User` database model to natively distinguish between **Individual** (QID) and **Business** (CR) records.
- **Smart Data Backfill**: Executed an Alembic migration with automatic logic to classify existing legacy records based on identifier length (11 vs 8 digits).
- **Persistent Intelligence Trends**: Connected the dashboard "Overview Stats" to a live backend trend calculation engine (Today vs. Yesterday).

### 🛠️ Changed
- **Analytics Bifurcation**: Refactored the `/users/stats/summary` endpoint to explicitly separate Individual visits from Business visits using the new indexed DB column.
- **Dynamic Trend UI**: Updated `StatCard` logic to conditionally render trend movement:
  - **Zero-Suppression**: Trends of 0% are now hidden for a cleaner interface.
  - **Neutral Indicators**: Implemented a dash `-` and muted styling for static metrics.
  - **Contextual Colors**: Inverted "positive" logic for risk metrics (e.g., a decrease in "Invalid IDs" is now flagged as green/positive).

### 🐞 Fixed
- **Dashboard Type Safety**: Resolved 16+ TypeScript lint errors in `DashboardPage.tsx` by synchronizing the `stats` state interface with the expanded backend schema.
- **Placeholder Data Removal**: Purged all hardcoded demo values (12.5%, 9.8%, etc.) from the dashboard, ensuring 100% data-driven reporting.

---

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
