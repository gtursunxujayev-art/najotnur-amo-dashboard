# Najot Nur Dashboard

## Overview
This project is a Next.js-based sales dashboard and automation system for Najot Nur. Its primary purpose is to provide real-time sales statistics, automated reporting, and user management by integrating with amoCRM, Google Sheets, and Telegram. The business vision is to streamline sales operations, provide critical insights for decision-making, and automate repetitive reporting tasks for improved efficiency and market responsiveness.

## User Preferences
The agent should prioritize iterative development. Ask before making major changes to the core architecture or introducing new external dependencies. When explaining concepts, use clear and concise language.

## System Architecture
The application is built with Next.js 16 (App Router) and React 19, leveraging Tailwind CSS for styling. It uses a PostgreSQL database managed via Prisma ORM.

**Technical Implementations & Design Choices:**
*   **Real-time Data:** External API calls use `no-store` caching for real-time data retrieval.
*   **Asynchronous Loading:** The dashboard implements an asynchronous loading pattern where the main UI loads immediately, and data-intensive sections (like call fetching) load in the background, improving perceived performance.
*   **Data Caching:** An in-memory caching layer is used for amoCRM calls data, significantly reducing load times for repeated requests within an hour.
*   **Error Handling:** The system includes graceful error handling for external API rate limiting, allowing the dashboard to function with partial data.
*   **PDF Report Generation:** Professional-grade PDF reports are generated with branding, KPI cards, and dynamic tables, supporting Unicode characters and automatic pagination.
*   **Data Aggregation & Transformation:** Extensive logic is in place for aggregating data from various sources (amoCRM, Google Sheets, OnlinePBX), cleaning it, and transforming it for display (e.g., enum field mapping, calculating conversion rates, sorting, and filtering).
*   **Scheduled Reports:** An automated scheduler (node-cron) is set up to send daily, weekly, and monthly reports via Telegram.
*   **Dashboard UI/UX:** Features redesigned chart layouts with two-column displays for detailed lists and filtered pie charts for better visualization. Professional styling is applied consistently across the dashboard and PDF reports.
*   **Dual Call Data Sources:** Dashboard displays OnlinePBX calls via webhook (real-time) AND amoCRM cached calls for comprehensive call tracking with all managers.
*   **OnlinePBX Integration:** Active webhook endpoint receives real-time call events from OnlinePBX panel, stores in database (persistent) and memory (1000-call limit), serves data to both webhook and dashboard endpoints.
*   **Extension Mapping:** OnlinePBX extensions (100-110) are mapped to manager names for proper attribution of calls in dashboard and reports.
*   **CSV Import:** Admin panel supports importing historical OnlinePBX call data from CSV files.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data, including leads, sales, and manager statistics. Calls cached for 1 hour.
*   **OnlinePBX Webhooks:** Real-time call events pushed via webhooks to `/api/onlinepbx/webhook`. Stores calls in PostgreSQL (persistent) and memory (1000-call limit). Webhook URL: `https://[REPLIT_DOMAIN]/api/onlinepbx/webhook`
*   **Google Sheets API:** Integrates for call statistics and revenue data.
*   **Telegram Bot API:** Utilized for sending automated reports and user subscriptions.
*   **GitHub API:** (Optional) Planned for configuration management.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

### November 25, 2025 - OnlinePBX Extension Mapping & Admin CSV Import
- **Added extension-to-manager name mapping** - Extensions (100-110) now map to manager names
  - **New Feature**: Created `lib/extensionMapping.ts` for extension → manager name mapping
  - **Mapping Endpoint**: `/api/config/extension-mapping` supports GET (view) and POST (add/update)
  - **All 11 Managers Mapped**: 
    - 100: Mumtoza, 101: Madina, 102: Oyshaxon, 103: Zilola, 104: Marg'uba
    - 105: Sabrina, 106: Matluba, 107: Sabina, 108: Mohinur, 109: Gulchehra, 110: Orzugul
  - **Dashboard Impact**: Webhook calls now show manager names instead of extension numbers
- **Added CSV Import to Admin Panel** - Administrators can now upload historical call data
  - **Admin Tab**: New "📥 CSV Import" tab in admin panel at `/admin`
  - **File Upload**: Accept CSV with columns: call_id, date, direction, duration, phone, user
  - **Import Endpoint**: `/api/onlinepbx/import` handles file processing
  - **User Benefit**: Can import all 2871 historical calls at once, then new calls come via webhook in real-time
  - **Files Updated/Created**: 
    - `lib/extensionMapping.ts` (new mapping system)
    - `app/api/config/extension-mapping/route.ts` (mapping API endpoint)
    - `app/api/onlinepbx/webhook/route.ts` (updated to use extension mapping)
    - `app/admin/page.tsx` (added CSV import tab)

### November 25, 2025 - Fixed OnlinePBX Webhook Data Parsing
- **Fixed webhook parser to recognize OnlinePBX field names** - Webhook was ignoring real call data
  - **Issue**: OnlinePBX sends `caller`, `callee`, `call_duration` fields, but code was looking for `user`, `phone`, `duration`
  - **Solution**: Updated `app/api/onlinepbx/webhook/route.ts` to parse OnlinePBX fields correctly
  - **Date Parsing**: Fixed Unix timestamp parsing (OnlinePBX sends `date` as Unix timestamp string)
  - **Result**: Real webhook calls now show correct phone numbers and durations
  - **Verified**: 5+ real calls now captured with proper data extraction

### November 24, 2025 - OnlinePBX Webhook Calls Integrated into Dashboard
- **Added OnlinePBX webhook calls to dashboard display** - Dashboard now aggregates both amoCRM and OnlinePBX calls
  - **New Function**: Created `getOnlinePBXWebhookCalls()` in `lib/onlinepbx.ts` to fetch webhook-stored calls via internal API endpoint
  - **Dashboard Integration**: Updated `lib/dashboard.ts` to:
    - Import and fetch OnlinePBX webhook calls in parallel with other data sources
    - Aggregate OnlinePBX calls per manager (user field from webhook)
    - Combine with amoCRM calls for comprehensive manager call statistics
  - **Data Flow**: OnlinePBX webhook → internal storage → `/api/onlinepbx/calls` → dashboard fetch → manager aggregation → display
  - **Result**: Dashboard now shows all managers from both amoCRM and OnlinePBX with combined call counts
  - **Verification**: Tested with 120 OnlinePBX test calls across 8 managers + 249 amoCRM calls = 369 total calls across 9 managers
  - **Files Updated**: `lib/onlinepbx.ts` (new function), `lib/dashboard.ts` (integration)

### November 24, 2025 - Fixed OnlinePBX Dashboard Data Mismatch (API Type Error)
- **Fixed TypeScript error in OnlinePBX calls endpoint** - `.size` property used on array instead of `.length`
  - **Issue**: LSP diagnostics showed "Property 'size' does not exist on type 'any[]'" on lines 79, 84
  - **Solution**: Changed `recentCalls.size` to `recentCalls.length` to correctly reference array length
  - **Result**: API now returns correct call counts without type errors
  - **File Updated**: `app/api/onlinepbx/calls/route.ts`

### November 24, 2025 - OnlinePBX Webhook Integration Implemented
- **Created OnlinePBX webhook endpoint** - `/api/onlinepbx/webhook` receives real-time call events
  - **Setup**: Configure in pbx13532.onpbx.ru to send webhook to `https://[REPLIT_DOMAIN]/api/onlinepbx/webhook`
  - **Data Formats**: Supports JSON, form-encoded, and multipart data from OnlinePBX
  - **Storage**: Calls stored in memory (1000-call limit), accessible via GET requests with filtering
  - **Verification**: Check `/api/onlinepbx/webhook?limit=10` to see received calls
  - **Error Debugging**: Check `/api/onlinepbx/webhook?errors=true` if webhooks fail
  - Files created: `lib/onlinepbx.ts` (API client), `app/api/onlinepbx/calls/route.ts`, `app/api/onlinepbx/webhook/route.ts`
- **Dual Call Data Sources**: 
  - amoCRM: Cached calls (1 hour TTL), 249 calls from leads for multiple managers, fetched from leads entity
  - OnlinePBX: Real-time webhook events, immediate push to dashboard, can store up to 1000 calls in memory

### November 24, 2025 - Fixed Period-Based Cache Keys for Calls
- **Fixed cache key differentiation for different periods** - Today, week, and month now use distinct cache keys
  - **Issue**: All periods were using same cache key "calls-2025-11-24", causing same cached data to return
  - **Solution**: Changed cache key to include both start and end dates: `calls-{fromDate}-to-{toDate}`
  - **Result**: Today/Week use `calls-2025-11-24-to-2025-11-24`, Month uses `calls-2025-11-01-to-2025-11-24`
  - **Note**: Today and week show same 249 calls because Nov 24 is Monday (both start from same date)
  - Files updated: `lib/amoCalls.ts` - improved cache key logic with date range

### November 24, 2025 - Smart Call Data Caching & Dashboard Integration
- **Implemented in-memory call caching layer** - Dramatically improves dashboard performance
  - **Performance**: First load 11.6s → Subsequent loads ~1s (caching returns data instantly)
  - **Cache TTL**: 1 hour per day, invalidates automatically after expiration
  - **Result**: 90% faster dashboard loading on repeat visits
  - Files: `lib/callsCache.ts` (caching manager), updated `lib/amoCalls.ts` integration
- **Fixed dashboard calls fetching** - Re-enabled managerCalls in dashboard API
  - Changed `app/api/dashboard/route.ts` - Removed `skipCalls: true` flag to include calls data
  - Dashboard now displays manager statistics: call count, average duration, manager names
  - Fetches from leads entity type only to avoid amoCRM 429 rate limit errors
- **Design decision**: Sequential single-entity fetch prevents rate limiting errors
  - Parallel fetching from all 4 entity types caused 429 errors, defeating the purpose
  - Single-source approach is faster and more reliable than failing requests
  - Trade-off: May miss calls from contacts/companies/customers if applicable

## How to Verify Webhook is Working

### Quick Check
```bash
curl "https://[REPLIT_DOMAIN]/api/onlinepbx/calls?limit=1"
```
If you see calls with manager names and phone numbers → webhook is working!

### Setup
1. Configure webhook in pbx13532.onpbx.ru Settings
2. Webhook URL: `https://[REPLIT_DOMAIN]/api/onlinepbx/webhook`
3. Make a real call through OnlinePBX
4. Check API within 5 seconds - you should see your call

## Admin Panel Features

### Extension Mapping
- **URL**: `/api/config/extension-mapping`
- **GET**: View all current mappings
- **POST**: Add or update extension mapping
  ```bash
  curl -X POST "https://[REPLIT_DOMAIN]/api/config/extension-mapping" \
    -H "Content-Type: application/json" \
    -d '{"extension": "102", "managerName": "Oyshaxon"}'
  ```

### CSV Import
- **URL**: `/admin` → CSV Import tab
- **File Format**: CSV with columns: call_id, date, direction, duration, phone, user
- **Usage**: Upload 2871 historical calls from January 1 to today
- **Result**: All historical calls appear in dashboard immediately

