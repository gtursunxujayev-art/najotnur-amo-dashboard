# Najot Nur Dashboard

## Overview
This project is a Next.js-based sales dashboard and automation system for Najot Nur. Its primary purpose is to provide real-time sales statistics, automated reporting, and user management by integrating with amoCRM, Google Sheets, and Telegram. The business vision is to streamline sales operations, provide critical insights for decision-making, and automate repetitive reporting tasks for improved efficiency and market responsiveness.

## User Preferences
The agent should prioritize iterative development. Ask before making major changes to the core architecture or introducing new external dependencies. When explaining concepts, use clear and concise language.

## System Architecture
The application is built with Next.js 16 (App Router) and React 19, leveraging Tailwind CSS for styling. It uses a PostgreSQL database managed via Prisma ORM.

**Technical Implementations & Design Choices:**
*   **Real-time Data:** External API calls use `no-store` caching.
*   **Asynchronous Loading:** The dashboard implements an asynchronous loading pattern where the main UI loads immediately, and data-intensive sections load in the background.
*   **Data Caching:** An in-memory caching layer is used for amoCRM calls data, reducing load times for repeated requests within an hour.
*   **Error Handling:** Includes graceful error handling for external API rate limiting with exponential backoff and throttling.
*   **PDF Report Generation:** Professional-grade PDF reports are generated with branding, KPI cards, dynamic tables, Unicode support, and automatic pagination, ensuring consistent styling for both manual and automated reports.
*   **Data Aggregation & Transformation:** Extensive logic aggregates, cleans, and transforms data from various sources (amoCRM, Google Sheets, OnlinePBX) for display and reporting.
*   **Scheduled Reports:** An automated scheduler (node-cron) sends daily, weekly, and monthly reports via Telegram.
*   **Dashboard UI/UX:** Features redesigned chart layouts with two-column displays, filtered pie charts, and a professional, consistent styling. The dashboard focuses on sales metrics, leads, and conversions, with call analytics moved to a dedicated page.
*   **Dual Call Data Sources:** Dashboard displays OnlinePBX calls via webhook (real-time) and amoCRM cached calls for comprehensive tracking.
*   **OnlinePBX Integration:** An active webhook endpoint receives real-time call events from OnlinePBX, stores data, and serves it to both webhook and dashboard endpoints. Includes mapping OnlinePBX extensions to manager names for proper call attribution.
*   **OnlinePBX to amoCRM Sync:** A system to sync OnlinePBX call data to amoCRM, logging calls as notes to associated leads.
*   **CSV/XLSX Import:** An admin panel supports importing historical OnlinePBX call data from CSV and XLSX files, with auto-detection of Russian/English formats.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data (leads, sales, manager statistics). Calls are cached for 1 hour. Supports syncing OnlinePBX calls.
*   **OnlinePBX Webhooks:** Receives real-time call events, stores data, and provides endpoints for call analysis.
*   **UTel PBX API:** Fetches CDR/call data from second PBX system. Integrates alongside OnlinePBX for comprehensive call tracking.
*   **Google Sheets API:** Integrates for call statistics and revenue data, specifically for PDF reports.
*   **Telegram Bot API:** Utilized for sending automated reports and managing user subscriptions.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

### November 26, 2025 - Fixed Utel Call Duration Storage
- **Problem**: Utel calls were showing 0 seconds duration on calls page
- **Root Cause**: 
  - Webhook was processing both `call_saved` (with proper duration) and `call_ended` (with 0 seconds), creating duplicate records
  - The 0-second record was overwriting the good one via upsert logic
- **Solution**:
  - ✅ Disabled `call_ended` event processing in webhook - now only processes `call_saved` events
  - ✅ Created `UtelCall` database table for persistent storage (survives server restarts)
  - ✅ Updated `/api/utel/calls` endpoint to fetch from database instead of in-memory
  - ✅ Deleted legacy duplicate records with 0-second duration from database
  - ✅ Added debug logging to trace duration calculation
- **Result**:
  - New Utel calls are stored only once with correct conversation duration
  - Call history persists across server restarts
  - Calls page displays accurate duration (HH:MM:SS format)
  - Both OnlinePBX and Utel are now reliable persistent call tracking sources

### November 26, 2025 - Added Google Sheets Call History Integration
- **New Feature**: Import historical call data from Google Sheets (January 1st onwards)
- **Implementation**:
  - ✅ Created `GoogleSheetCall` database model to store imported calls
  - ✅ Built `lib/googleSheetCalls.ts` to parse sheet data with flexible date/time formats
  - ✅ Created `/api/sheets/calls` endpoint to fetch and aggregate calls by caller
  - ✅ Parser handles:
    - Call types: Пропущенный (Missed), Входящий (Incoming), Исходящий (Outgoing)
    - Multiple date formats: "23:58:20 2025-11-24" or "2025-10-29 12:22:09"
    - Duration formats: "00:00:15" (HH:MM:SS) or "79" (seconds)
  - ✅ Added "Google Sheet Qo'ng'iroqlar bo'yicha abonentlar" section to /calls page
- **Sheet Columns**:
  - A: Call type (Пропущенный/Входящий/Исходящий)
  - B: Caller (phone/extension)
  - C: Call receiver
  - D: Inside number (gateway)
  - E: Date (various formats supported)
  - F: Call length
  - G: Successful call length
- **Display**: Shows by-caller summary with incoming/outgoing/missed counts and total duration
- **Spreadsheet**: https://docs.google.com/spreadsheets/d/10SpMBUxmNi4_ExGlJJwEycKDjg8VtyoH84CLcMgSbuY

### November 26, 2025 - Added UTel PBX Integration
- **New Integration**: Added support for UTel PBX system as second call tracking source
- **Implementation**:
  - ✅ Created `lib/utelCalls.ts` with flexible API endpoint detection (tries /cdr, /api/cdr, /v1/cdr, /calls)
  - ✅ Built `/api/utel/calls` endpoint that mirrors OnlinePBX API structure
  - ✅ Supports multiple UTel response formats (flat array, data wrapper, calls wrapper, records wrapper)
  - ✅ Manager attribution via extension mapping (same system as OnlinePBX)
  - ✅ Call aggregation by manager with duration formatting
  - ✅ Stored secrets: UTEL_API_TOKEN, UTEL_API_URL
- **Features**:
  - Automatic period filtering (today/week/month)
  - Manager summary with incoming/outgoing/total call counts
  - Formatted duration display (HH:MM:SS)
  - Recent calls list (last 100)
- **Files Created**: `lib/utelCalls.ts`, `app/api/utel/calls/route.ts`
- **Next Steps**: Calls page frontend component can now fetch from `/api/utel/calls` to display UTel data alongside OnlinePBX

### November 25, 2025 - Fixed Incoming Call Attribution to Manager Receivers
- **Problem**: Incoming calls were showing as "Unknown" instead of being attributed to the manager who received them
- **Two-Part Solution**:
  1. **Updated webhook handler** (`app/api/onlinepbx/webhook/route.ts`):
     - ✅ For **incoming calls**: Uses `extension` field (the manager who RECEIVED the call)
     - ✅ For **outgoing calls**: Uses `user`, `username`, `caller` fields (who made the call)
     - ✅ All NEW incoming calls properly attribute to receiving manager via extension mapping
  2. **Fixed existing database records** (5 calls updated):
     - ✅ 2 incoming calls from extension 100 → Mumtoza
     - ✅ 2 incoming calls from extension 104 → Marg'uba
     - ✅ 1 incoming call from extension 102 → Oyshaxon
     - ✅ 3 incoming calls from IVR (5000) remain as "Unknown" (can't determine receiver)
- **Result**: 
  - All incoming calls (both existing and new) now properly attribute to the receiving manager
  - Removed ~7 "Unknown" incoming calls by mapping extensions to managers
  - Dashboard now shows accurate incoming call attribution
- **Files Modified**: `app/api/onlinepbx/webhook/route.ts`, database migration applied