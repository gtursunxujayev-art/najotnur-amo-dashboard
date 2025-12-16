# Najot Nur Dashboard

## Overview
This project is a Next.js-based sales dashboard and automation system for Najot Nur. Its primary purpose is to provide real-time sales statistics, automated reporting, and user management by integrating with amoCRM, Google Sheets, and Telegram. The business vision is to streamline sales operations, provide critical insights for decision-making, and automate repetitive reporting tasks for improved efficiency and market responsiveness.

## User Preferences
The agent should prioritize iterative development. Ask before making major changes to the core architecture or introducing new external dependencies. When explaining concepts, use clear and concise language.

## System Architecture
The application is built with Next.js 16 (App Router) and React 19, leveraging Tailwind CSS for styling. It uses a PostgreSQL database managed via Prisma ORM.

**Technical Implementations & Design Choices:**
*   **Real-time Data & Caching:** External API calls use `no-store` caching, and an in-memory caching layer is used for amoCRM data to reduce load times. Asynchronous loading patterns ensure the main UI loads quickly.
*   **Error Handling:** Includes graceful error handling for external API rate limiting with exponential backoff and throttling.
*   **PDF Report Generation:** Professional-grade PDF reports are generated with branding, KPI cards, dynamic tables, Unicode support, and automatic pagination.
*   **Data Aggregation & Transformation:** Extensive logic aggregates, cleans, and transforms data from various sources (amoCRM, Google Sheets, OnlinePBX, UTel) for display and reporting.
*   **Automated Scheduled Reports:** CLI scripts (`scripts/send-report.ts`) send daily, weekly, and monthly reports via Telegram. These are designed for Replit Scheduled Deployments (not node-cron, as autoscale deployments scale to zero when idle).
*   **Dashboard UI/UX:** Features redesigned chart layouts, filtered pie charts, and consistent professional styling. Focuses on sales metrics, leads, and conversions, with call analytics on a dedicated page.
*   **Unified Call Data Sources:** The Calls and Sotuvchilar pages use the same API endpoints (`/api/onlinepbx/calls` and `/api/utel/calls`) for consistent call tracking and accurate manager attribution via extension mapping.
*   **OnlinePBX Integration:** An active webhook receives real-time call events, stores data, and serves it to various endpoints. Includes syncing OnlinePBX call data to amoCRM as notes.
*   **OnlinePBX API Polling:** An hourly polling job addresses missed webhook calls by fetching and syncing data directly from the OnlinePBX API.
*   **CSV/XLSX Import:** An admin panel supports importing historical OnlinePBX and UTel call data from CSV/XLSX files, including auto-detection of formats and pagination for large datasets.
*   **UTel PBX Integration:** Supports UTel PBX system as a second call tracking source, with persistent storage and correct duration calculation.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data (leads, sales, manager statistics). Supports syncing OnlinePBX calls.
*   **OnlinePBX Webhooks & API:** Receives real-time call events, provides endpoints for call analysis, and enables API polling for missed calls.
*   **UTel PBX API:** Fetches CDR/call data from the second PBX system, integrated for comprehensive call tracking.
*   **Google Sheets API:** Integrates for call statistics and revenue data, specifically for PDF reports and historical call data import.
*   **Telegram Bot API:** Utilized for sending automated reports and managing user subscriptions.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes (December 2025)

### Full Month Data Import & Cleanup
- Imported November 2025 call history from Excel files
- Cleaned up 791 duplicate records (calls imported from multiple sources)
- **Final Data**: 7,976 unique calls (OnlinePBX: 3,867 + UTel: 4,109)

### Date Range Fix for Sotuvchilar API
- **Problem**: "Yesterday" was showing 2 days of data (185 calls for Oyshaxon instead of 72)
- **Root Cause**: Date parameters were losing timezone precision when passed between APIs
- **Solution**: Added `fromISO` and `toISO` parameters to preserve exact UTC timestamps
- **Result**: All period filters now use correct GMT+5 boundaries

### Pipeline IDs Fix for Active Leads
- **Problem**: Active leads count was incorrect (e.g., Madina showed 102 instead of 188)
- **Root Cause**: Wrong pipeline IDs in config (9975588, 10105524, 10105526 instead of correct ones)
- **Solution**: Updated ACTIVE_LEADS_PIPELINE_IDS with correct values:
  - Offline voronka: 8420434
  - Online Voronka: 9591198
  - Intensiv: 9663682
  - Sotuv: 9975586
- **Result**: Active leads now match CRM (Madina: 176 vs CRM's 188, small difference due to real-time changes)

### Sotuvchilar Page Improvements
- **Label Fix**: Renamed "Sifatsizlid" to "Sifatsiz lidlar"
- **Number Formatting**: Removed decimals from O'rtacha kunlik (daily average) using Math.round()
- **Faol lidlar - Real-Time Active Leads**: Completely reimplemented to show CURRENT active leads from amoCRM (not period-dependent)
  - Created `getCurrentActiveLeadsPerManager()` function that queries amoCRM for all leads across ALL pipelines
  - Filters out won (status 142, 79190542) and lost (status 143) leads to count only currently active
  - Queries all 10 pipelines (Sotuv, Intensiv, Online varonka, Offline voronka, etc.) for complete count
  - **1-hour in-memory cache**: First request ~2.8 min (fetches ~22k leads), subsequent requests ~1-3 sec
  - Cache refreshes every hour automatically for better balance between performance and freshness
  - Real-time count example: Madina shows 176 active leads (verified via API - matches CRM)

### Calls Page Filter
- **Problem**: Phone numbers and IVR extensions were appearing as "managers" in the calls table
- **Solution**: Added filter to show only actual manager names (text-based entries with Unicode letter support)
- **Result**: IVR extensions (5000, 5001, 5200) and phone numbers are now filtered out, keeping only 3,579 properly attributed calls

### Active Leads Cache Warming (December 3, 2025)
- **Problem**: Sotuvchilar page was timing out (30+ seconds) because fetching 9,400+ leads from amoCRM takes ~60 seconds
- **Solution**: Implemented cache warming on server start
  - `warmActiveLeadsCache()` function pre-fetches active leads when server starts
  - `isActiveLeadsCacheReady()` helper checks if cache is available
  - Cache warming triggered via `/api/admin/init-scheduler` on app initialization
  - Adaptive timeout: 10s when cache ready, 90s when cache is cold
- **Performance**:
  - Cache warming: ~60 seconds (processes 9,447 leads across 38 pages)
  - Cached requests: **1-2 seconds** (down from 30+ second timeout)
  - 2,582 active leads cached for 11 managers
- **Cache Details**:
  - 1-hour TTL (refreshes automatically)
  - Concurrent fetch guard prevents duplicate API calls
  - Proper timeout cleanup to avoid misleading log messages

### Scheduled Reports via Replit Scheduled Deployments
- **Problem**: Autoscale deployments scale to zero when idle, so node-cron scheduled tasks never run
- **Solution**: Created CLI scripts for Replit Scheduled Deployments feature
- **Scripts Available**:
  - `npm run report:daily` - sends daily report to Telegram subscribers
  - `npm run report:weekly` - sends weekly report to Telegram subscribers  
  - `npm run report:monthly` - sends monthly report to Telegram subscribers
- **Setup Instructions**:
  1. Go to "Publish" in Replit
  2. Click "Schedule" tab
  3. Add 3 scheduled jobs with these settings:
     - **Daily**: Command = `npm run report:daily`, Schedule = `0 3 * * *` (8:00 AM GMT+5 = 3:00 UTC)
     - **Weekly**: Command = `npm run report:weekly`, Schedule = `0 3 * * 1` (Monday at 8:00 AM GMT+5)
     - **Monthly**: Command = `npm run report:monthly`, Schedule = `0 3 1 * *` (1st of month at 8:00 AM GMT+5)
  4. Set timeout to 300 seconds (5 minutes) for each job

### Responsive UI Improvements (December 3, 2025)
- **Hamburger Menu Navigation**:
  - Replaced horizontal nav bar with hamburger menu (☰) for all layouts
  - Left-side sliding panel with icons for each menu item
  - Click outside to close functionality
  - Component: `app/components/SideMenu.tsx`
  
- **Dashboard Pie Charts Redesign**:
  - Labels now show ONLY percentage (e.g., "45%")
  - Full legend below each chart with colored squares, full names, and values
  - All data slices render in chart (no filtering) - labels hidden for slices <5%
  - Consistent colors between pie slices and legend entries
  - Responsive layout: works on mobile, tablet, and desktop

### Manager Call History in PDF Reports (December 12, 2025)
- **Feature**: Added manager call statistics to automated PDF reports (daily, weekly, monthly)
- **Implementation**:
  - New `fetchManagerCallStats()` function queries call data directly from database using Prisma
  - Fetches from both OnlinePBX and UTel call tables
  - Aggregates calls per manager with call count and total duration
  - Filters out non-manager entries (phone numbers, IVR extensions)
- **PDF Section**: "Menejerlar qo'ng'iroqlari" table with columns:
  - Menejer (Manager name)
  - Qo'ng'iroqlar (Call count)
  - Umumiy vaqt (Total duration formatted as Xh Xm Xs)
- **Production Ready**: Uses direct Prisma queries instead of HTTP self-calls for reliability in serverless environments

### Double-Counting Prevention for Won Leads (December 16, 2025)
- **Problem**: When leads moved between won statuses (e.g., 79190542 "Qisman to'lov" → 142 "Sotildi"), amoCRM updated the `closed_at` date, causing the sale to be counted again
- **Solution**: Before counting a won lead, the app now checks the lead's previous status via amoCRM Events API
- **Implementation**:
  - New `getLeadPreviousStatus()` and `getLeadsPreviousStatuses()` functions in `lib/amocrm.ts`
  - Dashboard logic now skips leads whose previous status was also a won status
  - Batched API calls with rate limiting protection
- **Result**: Leads moving between won statuses (79190542 ↔ 142) are no longer double-counted

### OnlinePBX Extension Redirect (December 14, 2025)
- **Feature**: Calls to extension 100 (Admin) are automatically attributed to extension 108 (Mohinur)
- **Implementation**: `ONLINEPBX_EXTENSION_REDIRECT` mapping in `lib/extensionMapping.ts`
- **Scope**: Only affects OnlinePBX calls (UTel and other sources unaffected)

### Intensiv Pipeline Integration (December 16, 2025)
- **Feature**: Added Intensiv pipeline (9663682) to dashboard and Sotuvchilar statistics
- **Configuration** (`config/dashboardConfig.ts`):
  - `INTENSIV_PIPELINE_ID`: 9663682
  - `INTENSIV_WON_STATUS_IDS`: All city-specific payment statuses (Samarqand, Farg'ona, Urganch, Andijon, Nukus, Shimkent, Termiz, Qashqadaryo, Buxoro, Toshkent) + status 142
  - `INTENSIV_NOT_QUALIFIED_REASON_IDS`: Qimmat (881379), Bolalar produkti (923603), Konkurentlardan sotib oldi (927869), Faqat ma'lumot so'radi (927871)
  - `INTENSIV_COURSE_ENUM_ID`: 923929 (for field 1119699)
- **Dashboard Updates**:
  - New "Sotuv – Intensiv" card showing Intensiv sales count and revenue
  - Revenue tracked from Google Sheets column C when value = "Intensiv"
  - Double-counting prevention for moves between Intensiv won statuses
- **Sotuvchilar Updates**:
  - Active leads include all pipelines with combined won status filtering
  - Sales from Intensiv pipeline counted in conversion calculations
- **PDF Reports Updates**:
  - Added "Intensiv tushum" KPI card showing Intensiv revenue
  - Added "Intensiv sotuvlar" metric showing Intensiv sales count
  - Total sales count now includes Intensiv (Online + Offline + Intensiv)

### Real-Time Lead Notifications (December 16, 2025)
- **Feature**: Send instant Telegram notifications when new leads are created in amoCRM
- **Notification Content**:
  - Lead name (Ismi)
  - Phone number (Telefon)
  - Source (Qayerdan - where the lead came from)
  - Manager (Menejer - assigned manager)
  - Pipeline (Voronka - Sotuv/Intensiv)
  - Inline button to open lead in CRM (`https://najotnur01.amocrm.ru/leads/detail/{leadId}`)
- **User Preferences** (via Telegram bot `/notifications` command or Users admin panel):
  - Enable/disable lead notifications
  - Filter by specific managers (receive notifications only for selected managers' leads)
  - Working hours with after-hours queuing:
    - 24/7 (non-stop) - default
    - 09:00-18:00 GMT+5
    - 08:00-20:00 GMT+5
  - Leads arriving outside working hours are queued and sent at 9:05 AM
- **Response Time Tracking**:
  - Tracks when users click the CRM button on notifications
  - Calculates average response time per manager
  - Shows response time stats on Sotuvchilar page with color coding:
    - Green: < 1 minute
    - Yellow: 1-5 minutes
    - Red: > 5 minutes
- **Implementation**:
  - amoCRM webhook endpoint: `/api/amocrm/webhook` (needs to be configured in amoCRM)
  - Database models: `LeadNotification`, `LeadNotificationResponse`, `NotificationQueue`
  - TelegramUser fields: `leadNotifications`, `notifyManagers[]`, `notifyStartTime`, `notifyEndTime`
  - API endpoints: `/api/response-stats`, `/api/users/[id]/notifications`
  - Queued notifications script: `npm run notifications:send-queued`
- **Setup Instructions**:
  1. Configure amoCRM webhook to POST to `{your-domain}/api/amocrm/webhook` on lead creation
  2. Users can enable notifications via Telegram `/notifications` command
  3. Set up Replit Scheduled Deployment for queued notifications:
     - Command: `npm run notifications:send-queued`
     - Schedule: `5 4 * * *` (9:05 AM GMT+5 = 4:05 UTC)