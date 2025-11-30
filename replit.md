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
*   **Scheduled Reports:** An automated scheduler (node-cron) sends daily, weekly, and monthly reports via Telegram with comprehensive execution tracking.
*   **Dashboard UI/UX:** Features redesigned chart layouts with two-column displays, filtered pie charts, and a professional, consistent styling. The dashboard focuses on sales metrics, leads, and conversions, with call analytics moved to a dedicated page.
*   **Unified Call Data Sources:** Both the Calls page and Sotuvchilar page now use the same API endpoints (`/api/onlinepbx/calls` and `/api/utel/calls`) for consistent call tracking across the entire dashboard.
*   **OnlinePBX Integration:** An active webhook endpoint receives real-time call events from OnlinePBX, stores data, and serves it to both webhook and dashboard endpoints. Includes mapping OnlinePBX extensions to manager names for proper call attribution.
*   **OnlinePBX to amoCRM Sync:** A system to sync OnlinePBX call data to amoCRM, logging calls as notes to associated leads.
*   **CSV/XLSX Import:** An admin panel supports importing historical OnlinePBX call data from CSV and XLSX files, with auto-detection of Russian/English formats.
*   **Deployment:** Configured for autoscale deployment on Replit.

## Automated Report Scheduler
**How It Works:**
- Reports are scheduled using node-cron with Asia/Tashkent timezone (GMT+5)
- Daily reports: Every day at **8:00 AM GMT+5** (sends yesterday's data)
- Weekly reports: Every Monday at **8:00 AM GMT+5** (sends last week's data)
- Monthly reports: 1st of each month at **8:00 AM GMT+5** (sends last month's data)
- Execution tracking: All scheduled jobs log their execution status for debugging

**Subscribers:**
- Users enable reports via Telegram bot or by contacting admin
- Each user in the database has `dailyReport`, `weeklyReport`, and `monthlyReport` boolean flags

## How to Check if Autoreports Are Working

### 1. Check Scheduler Status
Visit this endpoint to see the current scheduler state and subscribers:
```
GET https://your-replit-domain/api/scheduler/status
```

**Response includes:**
- `scheduler.initialized` - Whether scheduler is running
- `scheduler.lastExecutions` - Last execution time and success/failure status for each report type
- `subscribers` - Count of users subscribed to daily/weekly/monthly reports
- `subscribers_list` - List of all Telegram users with their report preferences

### 2. Manually Trigger Reports (For Testing)
Test that reports work correctly by manually triggering them:
```
GET https://your-replit-domain/api/scheduler/test?type=daily
GET https://your-replit-domain/api/scheduler/test?type=weekly
GET https://your-replit-domain/api/scheduler/test?type=monthly
```

**In development:** Replace `your-replit-domain` with `localhost:5000`

### 3. Check Console Logs
When reports execute (automatic or manual), watch the server logs for:
- `[Scheduler] ⏰ EXECUTING DAILY REPORT` - Shows report started
- `[Scheduler] ✅` - Report sent successfully
- `[Scheduler] ❌` - Report failed (check the error message)
- `[reports/daily]` - Detailed logs from the report endpoint

### 4. Database Check
View current subscribers:
```sql
SELECT id, "chatId", username, "dailyReport", "weeklyReport", "monthlyReport" FROM "TelegramUser";
```

### 5. Key Things to Verify
✅ **Scheduler is initialized** on server startup (check logs for "Scheduler initialized successfully")
✅ **At least one user has report enabled** (check database or `/api/scheduler/status`)
✅ **Reports can be manually triggered** without errors
✅ **Server stays running 24/7** (important for scheduled jobs to execute at 8:00 AM)

**Common Issues:**
- ❌ No subscribers enabled - Enable reports for users in database
- ❌ Server not running 24/7 - In production, verify autoscale is configured to keep app running
- ❌ Timezone mismatch - Schedule uses Asia/Tashkent (GMT+5), verify server time is correct
- ❌ Dev server reload kills jobs - In development, cron jobs restart with each hot reload

## External Dependencies
*   **amoCRM API:** Used for CRM data (leads, sales, manager statistics). Calls are cached for 1 hour. Supports syncing OnlinePBX calls.
*   **OnlinePBX Webhooks:** Receives real-time call events, stores data, and provides endpoints for call analysis.
*   **UTel PBX API:** Fetches CDR/call data from second PBX system. Integrates alongside OnlinePBX for comprehensive call tracking.
*   **Google Sheets API:** Integrates for call statistics and revenue data, specifically for PDF reports.
*   **Telegram Bot API:** Utilized for sending automated reports and managing user subscriptions.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

### November 30, 2025 - Unified Call Data Between Calls and Sotuvchilar Pages
- **Problem**: Calls page and Sotuvchilar page showed different call counts because they used different data sources with different timezone handling
- **Root Cause**: 
  - Calls page fetched from `/api/onlinepbx/calls` and `/api/utel/calls` (using UTC dates)
  - Sotuvchilar stats directly queried database tables (using local dates)
  - This caused date range mismatches and inconsistent call counts
- **Solution**:
  - ✅ Removed AmoCRM and Google Sheets call data from Calls page (now only OnlinePBX + UTel)
  - ✅ Updated `/api/sotuvchilar/stats` to fetch from same API endpoints as Calls page
  - ✅ Both pages now show identical call data with consistent date filtering
- **Files Modified**:
  - `app/calls/page.tsx` - Simplified to use only OnlinePBX and UTel data sources
  - `app/api/sotuvchilar/stats/route.ts` - Now fetches from API endpoints instead of direct database queries

### November 30, 2025 - Enhanced Scheduler with Execution Tracking
- **Problem**: Automated reports weren't sending; unclear why scheduler wasn't working
- **Solution Implemented**:
  - ✅ Enhanced `lib/scheduler.ts` with execution history tracking
  - ✅ Stores last execution time, success/failure status, and error messages for each report type
  - ✅ Created `/api/scheduler/status` endpoint to check:
    - Whether scheduler is initialized and running
    - Execution history (time, success, message)
    - Count of subscribers for each report type
    - List of all users with their report preferences
  - ✅ Created `/api/scheduler/test` endpoint to manually trigger reports for testing
  - ✅ Added comprehensive logging with visual indicators (⏰ executing, ✅ success, ❌ error)
  - ✅ Updated documentation with step-by-step verification instructions
- **How to Check**: Visit `/api/scheduler/status` or manually trigger with `/api/scheduler/test?type=daily`
- **Files Modified/Created**:
  - `lib/scheduler.ts` - Enhanced with state tracking
  - `app/api/scheduler/status/route.ts` - New status endpoint
  - `app/api/scheduler/test/route.ts` - New test endpoint
  - `replit.md` - Added debugging guide

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
  - ✅ Parser handles multiple date formats and call types
  - ✅ Added "Google Sheet Qo'ng'iroqlar bo'yicha abonentlar" section to /calls page
- **Sheet Columns**: Date, Caller, Call receiver, Inside number, Duration formats

### November 26, 2025 - Added UTel PBX Integration
- **New Integration**: Added support for UTel PBX system as second call tracking source
- **Implementation**:
  - ✅ Created `lib/utelCalls.ts` with flexible API endpoint detection
  - ✅ Built `/api/utel/calls` endpoint that mirrors OnlinePBX API structure
  - ✅ Supports multiple UTel response formats
  - ✅ Manager attribution via extension mapping
  - ✅ Stored secrets: UTEL_API_TOKEN, UTEL_API_URL

### November 25, 2025 - Fixed Incoming Call Attribution to Manager Receivers
- **Problem**: Incoming calls were showing as "Unknown" instead of being attributed to receiving managers
- **Solution**: Updated webhook handler to properly attribute incoming calls to receiving manager via extension mapping
