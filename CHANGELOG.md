# Changelog

All notable changes to the Q-FY project will be documented in this file.

## [v2.2.0-Dual-Engine-OCR-Overhaul] - 2026-05-12

### 🚀 Added
- **Dual-Engine OCR Architecture**: Introduced parallel English + Arabic PaddleOCR engines for dramatically improved accuracy on bilingual Qatar ID cards.
- **Spatial Text Parsing**: Built intelligent label-value association based on block position, replacing naive line-based extraction.
- **Combined/Stacked ID Detection**: Auto-splits vertically stacked front+back images (height > width × 1.3) and processes as a pair.
- **Front+Back Pair Scanning**: New `/scan/pair` endpoint processes both sides in parallel and merges results with field-level conflict resolution.
- **Interactive Corner Cropper**: Added perspective-warp flow with manual corner adjustment for skewed or angled captures.
- **OCR Accuracy Benchmark**: Created `test_ocr_accuracy.py` harness with ground-truth scoring across 4 sample images (97.4% accuracy achieved).
- **Name Deduplication**: Fuzzy matching via `SequenceMatcher` eliminates duplicate words from dual-engine merge artifacts.

### 🛠️ Changed
- **OCR Preprocessing Simplified**: Removed destructive sharpening/CLAHE that garbled characters; now only upscales images below 900px.
- **Executor Pool Expanded**: Increased `_ocr_executor` from 2 to 4 workers for true parallel dual-engine execution.
- **Detection Resolution Bumped**: `det_limit_side_len` raised from 1280 to 1600 for finer text detection on high-res scans.
- **Pydantic Schema Completed**: Added `occupation`, `residency_type`, and `passport_expiry` to `UserScanData` — previously silently stripped from API responses.
- **ScanPage.tsx Hardened**: Fixed undefined `setDocType` crash, type mismatch on dual-scan button, and null-value overwrite race condition.

### 🐞 Fixed
- **Occupation/Employer Not Displaying**: Pydantic `UserScanData` model was missing these fields, causing silent serialization drop.
- **Back-Side Misidentified as Passport**: Added keyword-density check (`_is_back_side()`) to distinguish QID back from standalone passport documents.
- **Nationality Grabbing "QATAR" from Header**: Excluded top-20% image blocks and removed `قطر` from Arabic nationality map.
- **QID Not Extracted from Serial Number**: Implemented targeted extraction of 11-digit QID from 14-digit serial format on back side.
- **Doc Type Sync Crash**: `setDocType` was undefined in ScanPage — replaced with `setSessionDocType` and fixed response path to `response.user.id_type`.
- **Duplicate React Import**: Merged standalone `useEffect` import into main React import line.

## [v2.1.0-Surya-Sunset-Paddle-Optimization] - 2026-05-10
 
### 🚀 Added
- **Bilingual Arabic/English Engine**: Transitioned to PaddleOCR PP-OCRv3 for native multilingual support, significantly improving extraction of Occupation and QID fields.
- **Eastern-to-Western Numeral Support**: Added automatic translation for Arabic numerals and robust date padding for truncated scans.
- **Forensic Refinements**: Implemented 'NaMO' alias support and English-priority name extraction to ensure clean, readable record data.
- **Stability Overrides**: Hardened the PaddleOCR runtime with Windows-specific stability flags to prevent PIR API and oneDNN related crashes.

### 🗑️ Removed
- **Surya OCR Deprecation**: Fully sunsetted the Surya OCR engine integration to eliminate inference instability and technical debt.
- **Legacy Surya Artifacts**: Purged redundant environment configurations and bypassed Surya initialization in the production pipeline.

### 🐞 Fixed
- **OCR Field Precision**: Resolved a common issue where long names were truncated or split into separate records during the scanning process.
- **Environment Isolation**: Corrected a dependency conflict on Windows by enforcing strict local package priority for PyTorch and Paddle.

## [v2.0.1-Global-Passport-Support] - 2026-05-06
 
### 🚀 Added
- **Global Passport Support**: Integrated high-accuracy extraction for international passports using Vision LLM (`amazon/nova-2-lite-v1`) with specialized MRZ-aware prompting.
- **Passport Scan Mode**: Added a dedicated "GLOBAL PASSPORT" mode in the identity scanner UI, enabling compliant data capture for any country in the world.
- **Adaptive JSON Parsing**: Implemented robust JSON cleaning in the OCR service to handle varied LLM response formats (e.g., markdown code blocks).

### 🛠️ Changed
- **Unified OCR Architecture**: Consolidated identity extraction into a single, high-performance `OCRService` that intelligently routes between local PaddleOCR and Vision LLM.
- **Identity Schema Hardening**: Updated the business registration wizard to explicitly handle both QID and Passport identifiers for owners and signatories.
- **Validation Engine Upgrade**: Hardened the backend validation and duplicate detection logic to treat `passport_number` as a unique primary identifier.

### 🗑️ Removed
- **Legacy Research Bloat**: Purged the deprecated `d:\qfy\passporteye` and `d:\qfy\ocr` research directories to streamline the core repository.

### 🐞 Fixed
- **OCR Runtime Stability**: Resolved a critical `NameError` crash in the OCR service caused by missing library imports.
- **Missing Identification Fields**: Fixed a data mapping gap in `BusinessFormPage.tsx` where passport details were not being correctly persisted during registration.

## [v2.0.0-Forensic-Registration-MVP] - 2026-05-06
 
### 🚀 Added
- **Forensic Grouped Registration**: Overhauled the business registration UI into three specialized clusters: **Commercial License**, **Authorized Signatories**, and **Trade License**.
- **Integrated Identity Scanner**: Embedded the production-grade hardware scan flow (`/scan?embedded=true`) directly into the registration wizard via an Iframe bridge with `postMessage` synchronization.
- **Multi-Stakeholder Wizard**: A sophisticated "Add Owner" workflow supporting both Individual and Corporate entities with nested representative resolution.
- **Interactive Scan Modals**: High-visibility "SCAN ID" triggers with forensic animations (scan-line effect, progress tracking) for all identity search fields.
- **Identification Documents Gallery**: Added a sleek document preview section to `IndividualResultCard` supporting both front and back QID images.
- **Dynamic Expiry Status System**: Implemented high-visibility, color-coded expiry logic (**Red** for expired, **Gold** for <30 days, **Green** for active) across both QID and CR records.
- **LuxuryDropdown Component**: Custom-built glassmorphism dropdowns for Business Type, Nature, and Nationality with smooth focus states and hover effects.
- **Cinematic Feedback Engine**: Integrated `success-pulse` glows and `pop-in` entrance animations for visit logging and document uploads.
- **Backend Visit API**: Launched `POST /api/v1/businesses/{id}/visit` to track physical forensic activity and update business interaction counters.
 
### 🛠️ Changed
- **Unified Stakeholder Layout**: Reorganized result cards to show a 3-column grid featuring Mobile, Nationality, and high-visibility Expiry status.
- **Standardized Document Capture**: Aligned the Trade License upload box with Authorization Letters and Establishment Cards, including compact `.doc-upload-box` styling and expanded column-width layouts.
- **Visual Expiry Overhaul**: Upgraded date displays to `1.6rem` bold weight with high-contrast labels ("VALID UNTIL", "GRACE PERIOD") and demoted "days remaining" to a sub-line.
- **Status Badge Refinement**: Standardized active identity labels to "ID VALID" for clarity and authority.
- **Enhanced Document Previews**: Bumped document scan heights to `220px` with `objectFit: contain` for crystal-clear, non-cropped forensic inspection.
- **Compliance Sidebar Expansion**: The sidebar now tracks nested owner requirements and document statuses, dynamically gating the "Review & Submit" action.
 
### 🐞 Fixed
- **NameError Resolution**: Fixed missing `List` import from `typing` in `schemas.py` that was crashing the Uvicorn server.
- **Backend Router Patching**: Resolved a `TypeError` and 500 error in the visit logging route caused by malformed identifier strings.
- **Frontend Dependency Injection**: Installed the missing `uuid` dependency to resolve the registration form import error.
- **State Integrity Restoration**: Patched a UI state reset bug and pruned 20+ unused imports/variables in `BusinessFormPage.tsx` to stabilize the registration portal.
- **CORS & Silent Failures**: Squashed a silent `TypeError` that was incorrectly triggering CORS error messages during identity lookups.

## [v1.9.1-Deterministic-Identity] - 2026-05-05

### 🚀 Added
- **Deterministic Identity Engine**: Implemented a server-side "Self-Healing" sync that automatically detects and enforces the primary representative's `employer` status based on corporate links.
- **Document Preview Logic**: Added a high-fidelity "PREVIEW EXISTING DOC" feature in the Company Details modal, allowing operators to verify current CR files before replacement.
- **Enhanced Action Suite**: Upgraded the "People & Identities" modal with a dual-action system: `Eye` icons for instant document/profile viewing and `Edit3` (Pencil) icons for direct record modification.
- **Forensic Sync Tracking**: Connected the self-healing identity engine to the `BusinessActivity` timeline, logging `SYSTEM_SYNC` events whenever a representative's corporate affiliation is automatically corrected.
- **Comprehensive Audit Trail**: Hardened the activity engine to capture 100% of administrative mutations, including `MEMBER_LINK`, `MEMBER_UNLINK`, `STATUS_CHANGE`, and `REPORT_DOWNLOAD`, ensuring a complete paperless audit trail for every business.

### 🛠️ Changed
- **Identity Hierarchy Hardening**: Restricted corporate `employer` synchronization exclusively to the designated primary owner (`owner_id`), preventing "data drift" for secondary owners.
- **UI Labeling Precision**: Implemented a color-coded identity system: **REPRESENTATIVE (OWNER)** (Blue) for corporate reps and **INDIVIDUAL OWNER** (Gold) for linked individuals.
- **Workspace De-cluttering**: Centralized "Unlink" and "Edit" actions within the People Modal table, stripping redundant buttons from the dashboard stakeholder cards for a cleaner layout.
- **Icon Standardization**: Migrated all edit actions to use the `Edit3` Lucide icon for UI consistency across the platform.

### 🐞 Fixed
- **API Serialization Gap**: Resolved a critical bug in `person_to_dict` where the `employer` field was missing from stakeholder payloads, breaking frontend identity logic.
- **State Hydration Integrity**: Fixed a race condition where the UI would report "Record not found" during rapid business detail refreshes.
- **Lint & Hygiene**: Purged 10+ unused variables and non-functional methods (including `setSelectedPerson` and `handleSetRepresentative`) and standardized identity scanning logic to eliminate IDE errors.

---

## [v1.9.0-Intelligence-Dashboard-UX] - 2026-05-05

### 🚀 Added
- **BusinessActivity Engine**: Implemented a new forensic database table that captures every administrative action (visits, uploads, profile edits) with timestamps, operator IDs, and severity levels.
- **Tiered Compliance Logic**: Engineered a high-precision backend status engine using four distinct states: `INVALID` (Hard expiry), `NON_COMPLIANT` (Missing docs/stakeholders), `PARTIAL` (Grace Period), and `WARNING` (Proactive 60-day alert).
- **Grace Period Visual System**: Introduced high-fidelity orange badges with dynamic "Days Left" countdowns for records within the 30-day post-expiry window.
- **Executive Summary Header**: A sleek, architectural status bar consolidating Business Name, CR, and Expiry into the top-level viewport.
- **Dynamic Status Banner**: A high-severity alert system with "Fix Issues" CTAs that appears only when compliance failures or warnings are detected ("Silent Success" logic).
- **Embedded View Optimization**: Implemented `?embedded=true` routing support to hide sidebars and adjust padding for seamless iframe integration in scanning workflows.
- **Native People Management Modal**: A high-capacity roster aggregating all linked stakeholders and staff with a "Red/Amber/Blue/Dim" compliance color hierarchy.
- **Automated Contextual Scanning**: Upgraded the scanning engine to accept `link_business_id` and `link_role` parameters, enabling 1-click identity linking.
- **Luxury Confirmation Workflow**: Custom "Dark Luxury" glassmorphic modals for destructive actions, replacing native browser alerts.
- **Global Branded Scrollbars**: Sleek 5px gold-tinted scrollbars implemented across the entire application shell for a unified aesthetic.
- **PDF Intelligence Export**: Professional-grade compliance report generation using `reportlab` with robust binary stream handling.
- **Functional Visit Logging**: A "Log Physical Visit" system that updates interaction counters and injects "VISIT" events into the forensic timeline instantly.

### 🛠️ Changed
- **Triple-Column Intelligence Grid**: Reorganized the dashboard into a high-density layout: Left (Profile/Timeline), Middle (People & Identities), and Right (Document Checklist).
- **Minimalist Documents UI**: Refactored the checklist to use icon-only status markers (CheckCircle/XCircle/AlertTriangle) and replaced text buttons with compact `RotateCcw` action icons.
- **Glassmorphic Hardening**: Upgraded all cards with `backdrop-filter: blur(32px)` and consistent gold accents for a "mission-ready" feel.
- **Activity Timeline Expansion**: Removed item limits and implemented a scrollable container to support infinite forensic history.
- **Header Action Menu**: Replaced generic icons with a premium 3-dot dropdown menu featuring "Download PDF Report" and "Delete Record" actions.
- **Precision Metrics**: Hardened the "Checklist Summary" to scan across all linked personnel and mandatory documents for a unified 60-day warning tally.

### 🐞 Fixed
- **Note Management Lifecycle**: Resolved persistent deletion issues by standardizing UUID mapping and increasing hit areas for trash icons.
- **Reporting Headers**: Fixed critical PDF download issues by normalizing MIME types and `Content-Disposition` headers.
- **Visual Integrity**: Resolved transparency bleed in 3-dot menus and corrected alignment drift in the People cards using `flex-end` column logic.
- **Reactive Data Flows**: Synchronized `fetchBusiness` across all handlers to ensure zero-latency UI updates after any data modification.

---

## [v1.8.7-CR-Standardization] - 2026-05-04

### 🛠️ Fixed
- **Business Quick Search**: Resolved "Business Not Found" issue by standardizing on 8-digit zero-padded CR numbers.
- **Data Integrity**: Migrated existing numeric CRs in database to 8-digit zero-padded format.

### 🚀 Changed
- **Dashboard UI**: Re-implemented 8-digit entry grid for Business searches with automatic zero-padding.
- **Business Detail Visibility**: Enhanced Business search results to display CR Expiry, Owner/Manager names, and stakeholder status.
- **Business Visit Logging**: Implemented backend support and frontend controls to log visits for businesses, including visit counter and "Last Seen" tracking.
- **UI High-Fidelity Icons**: Replaced emojis with professional Lucide icons (CheckCircle2, AlertOctagon) across the compliance checklist.
- **Registration Workflow**: Added mandatory 8-digit zero-padding to the Business Registration form for consistent data entry.

---

## [v1.8.6-Admin-Workflow] - 2026-05-04

### 🚀 Added
- **Tabbed History & Lookup**: Refactored both Lookup and History pages with a dual-tab system (Individual/Business) for unified record management.
- **Re-scan Visual Feedback**: Added a "RENEWAL MODE" badge to the Scan page when updating existing records.
- **Business History API**: Enhanced the business lookup endpoint with date range filtering and interaction sorting.
- **UI Hardening**: Resolved missing icon imports and unused variable warnings in the frontend.

---

## [v1.8.5-Deletion-Lifecycle] - 2026-05-04

### 🚀 Added
- **User Deletion**: Implemented `DELETE` endpoint and fixed the non-functional delete button on `UserDetailPage`.
- **Business Deletion**: Added administrative deletion for businesses in `BusinessDetailPage` and backend.
- **Safety**: Integrated browser confirmation dialogs to prevent accidental data loss.

---

## [v1.8.4-Atomic-Registration] - 2026-05-04

### 🚀 Added
- **Atomic Registration**: Implemented deferred uploads in `BusinessFormPage` to ensure data integrity.
- **Frontend Feedback**: Added success pulse animations and filename previews to `DocumentUploadRow`.
- **Automatic Cleanup**: Discarded "Auto-Initialization" skeleton records in favor of atomic saves.

---

## [v1.8.3-Router-Hardening] - 2026-05-04

### 🚀 Added
- **Input Validation**: Added `400 Bad Request` handling for malformed date strings in business routers.
- **Auto-Initialization**: Introduced temporary skeleton creation for document uploads (v1).

---

## [v1.8.2-Multipart-Fix] - 2026-05-04

### 🚀 Added
- **Multipart Fix**: Resolved 'Missing boundary in multipart' error by removing manual Content-Type headers in `ApiClient` calls.
- **Upload Resilience**: Improved frontend-to-backend binary data serialization.

---

## [v1.8.1-System-Hardening] - 2026-05-04

### 🚀 Added
- **Rigorous Test Suite**: Created `test_rigorous.py` for chaos testing (malicious files, malformed data).
- **File Type Security**: Hardened storage utility to only allow PDF, JPG, and PNG extensions.
- **Input Validation**: Improved API error handling for date parsing, returning 400 instead of 500.
- **Compliance Propagation**: Verified real-time status recalculation on identity swaps.

---

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
