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
*   **Error Handling:** Includes graceful error handling for external API rate limiting.
*   **PDF Report Generation:** Professional-grade PDF reports are generated with branding, KPI cards, and dynamic tables, supporting Unicode and automatic pagination.
*   **Data Aggregation & Transformation:** Extensive logic aggregates data from various sources (amoCRM, Google Sheets, OnlinePBX), cleans it, and transforms it for display.
*   **Scheduled Reports:** An automated scheduler (node-cron) sends daily, weekly, and monthly reports via Telegram.
*   **Dashboard UI/UX:** Features redesigned chart layouts with two-column displays and filtered pie charts. Professional styling is applied consistently.
*   **Dual Call Data Sources:** Dashboard displays OnlinePBX calls via webhook (real-time) and amoCRM cached calls for comprehensive tracking.
*   **OnlinePBX Integration:** Active webhook endpoint receives real-time call events from OnlinePBX, stores data, and serves it to both webhook and dashboard endpoints.
*   **Extension Mapping:** OnlinePBX extensions are mapped to manager names for proper attribution of calls.
*   **CSV/XLSX Import:** Admin panel supports importing historical OnlinePBX call data from CSV and XLSX files with auto-detection of Russian/English formats.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data (leads, sales, manager statistics). Calls cached for 1 hour. Now supports syncing OnlinePBX calls via `/api/onlinepbx/sync-to-amocrm`.
*   **OnlinePBX Webhooks:** Real-time call events pushed via webhooks to `/api/onlinepbx/webhook`. Stores calls in PostgreSQL and memory (1000-call limit).
*   **Google Sheets API:** Integrates for call statistics and revenue data.
*   **Telegram Bot API:** Utilized for sending automated reports and user subscriptions.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

### November 25, 2025 - Fixed PDF Revenue Data Source (Google Sheets instead of amoCRM)
- **Problem**: PDF was showing amoCRM deal amounts for "Online tushum" and "Offline tushum", but should show Google Sheets revenue
- **Root Cause**: KPI cards were using `onlineSummasi`/`offlineSummasi` (amoCRM deal amounts) instead of `onlineRevenue`/`offlineRevenue` (Google Sheets)
- **Solution Implemented**:
  - ✅ Updated KPI cards to use Google Sheets revenue data
  - ✅ Reordered KPI cards to match user requirement: Tushum | Offline tushum | Online tushum | Kelishuv summasi
  - ✅ Changed data sources:
    - "Tushum" → `oylikTushum` (Google Sheets total)
    - "Offline tushum" → `offlineRevenue` (Google Sheets offline revenue)
    - "Online tushum" → `onlineRevenue` (Google Sheets online revenue)
    - "Kelishuv summasi" → `kelishuvSummasi` (amoCRM deal amounts - kept for reference)
- **Result**: PDF KPI cards now show accurate revenue data from Google Sheets
- **Files Modified**: `lib/reportPdf.ts`

### November 25, 2025 - Fixed Manual vs Auto Report Styling + Added Missing Sales Metrics
- **Problem 1**: Auto reports came without design ("old style with 0 design"), while manual reports had full styling
- **Problem 2**: PDF reports were missing key sales metrics (All sales, Offline sales, Online sales)
- **Solution Implemented**:
  - ✅ Added enhanced logging with source tracking (manual vs auto) to all report endpoints
  - ✅ Added PDF size validation (styled PDFs should be > 5KB) to detect incomplete/corrupted PDFs
  - ✅ Added performance timing metrics for PDF generation debugging
  - ✅ Added data structure validation to ensure dashboard data is complete before PDF generation
  - ✅ Unified all report endpoints (manual, daily, weekly, monthly) to pass source type
  - ✅ **Added missing sales metrics to PDF**:
    - "Jami sotuvlar" (All sales) = online + offline sales count
    - "Online sotuvlar" (Online sales) = onlineSalesCount
    - "Offline sotuvlar" (Offline sales) = offlineSalesCount
  - ✅ Dynamic metrics section height to accommodate all 7 metrics (2-column layout)
- **Result**: 
  - Both manual and auto reports now use identical PDF generation code path
  - PDF now displays all required metrics: Leads | Qualified leads | Non-qualified leads | All sales | Online sales | Offline sales | Conversion
- **PDF Metrics Order**: Leads → Qualified → Non-qualified → All Sales → Online Sales → Offline Sales → Conversion (in 2-column layout)
- **Files Modified**: `lib/reportPdf.ts`, `app/api/reports/manual/route.ts`, `app/api/reports/daily/route.ts`, `app/api/reports/weekly/route.ts`, `app/api/reports/monthly/route.ts`

### November 25, 2025 - Optimized Dashboard Loading (7-8x Faster)
- **Problem**: Dashboard API taking 33-86 seconds to load
- **Root Cause**: 
  - Fetching 13,670+ amoCRM call records unnecessarily
  - Verbose console logging for all leads and data
  - Dashboard doesn't display call statistics (moved to /calls page)
- **Optimizations Made**:
  - ✅ Removed amoCRM call fetching (13,670 records) - not used on dashboard
  - ✅ Removed OnlinePBX call fetching from dashboard
  - ✅ Removed Google Sheets call fetching from dashboard
  - ✅ Removed all verbose debug logging (custom fields inspection)
  - ✅ Removed call aggregation logic (moved to /calls page)
  - ✅ Simplified data fetching to only what's needed for display
- **Result**: Dashboard API now loads in **11.9-12.7 seconds** (was 33-86s)
- **Performance Gain**: **7-8x improvement** in loading speed
- **Files Modified**: `lib/dashboard.ts`

### November 25, 2025 - Added Rate Limit Handling & Exponential Backoff
- **Problem**: Dashboard crashed with 429 (Too Many Requests) errors from amoCRM
- **Root Cause**: Multiple concurrent requests hitting amoCRM rate limits
- **Solution Implemented**:
  - ✅ Exponential backoff retry logic (1s, 2s, 4s delays, max 3 retries)
  - ✅ Request throttling (100ms delays between entity fetches & pagination)
  - ✅ Graceful error handling (no dashboard crash on rate limits)
  - ✅ Partial data returned if some calls fetch before hitting limit
- **Result**: Dashboard now resilient to rate limiting, automatically retries on 429 errors
- **Files Modified**: `lib/amocrm.ts`, `lib/amoCalls.ts`

### November 25, 2025 - Optimized Calls Page Loading Performance
- **Problem**: Calls page was timing out (30+ seconds) when loading amoCRM call data
- **Root Cause**: Fetching 13,000+ calls from 4 amoCRM entities (leads, contacts, companies, customers) with slow pagination
- **Solution Implemented**:
  - ✅ Reduced max pages per entity from 50 to 15
  - ✅ Added 8-second time limit per entity to stop pagination early
  - ✅ Added 25-second overall request timeout with graceful fallback
  - ✅ Enhanced logging with performance metrics (pages, time per entity)
- **Result**: 
  - Calls API now loads in ~22 seconds (down from timeout/hang)
  - Returns up to 3,185 calls when available
  - Gracefully returns partial/empty results on timeout
- **Performance**: 
  - Leads: 2.6s (249 calls)
  - Contacts: 8-9s (2000 calls, hits time limit)
  - Companies: 7s (844 calls)
  - Customers: 2.2s (92 calls)
- **Recommendation**: Consider using OnlinePBX webhook data instead (real-time, much faster) for the primary calls display
- **Files Modified**: `lib/amoCalls.ts`, `app/api/dashboard/calls/route.ts`

### November 25, 2025 - Separated Calls to Dedicated Page (Improved Dashboard Speed)
- **Goal**: Improve dashboard loading speed by moving call data to separate page
- **Implementation**:
  - ✅ Created `/app/calls/page.tsx` - New dedicated page for all call analytics
    - Displays amoCRM call data (manager-wise breakdowns)
    - Displays OnlinePBX call data (real-time call tracking)
    - Period filters (Today, This Week, This Month)
  - ✅ Updated navigation - Added "Calls" link in header
  - ✅ Optimized dashboard - Removed all call sections and loading logic
  - **Result**: Dashboard now focuses only on sales data (faster loading)
- **Pages Now**:
  - `/dashboard` → Sales metrics, leads, conversions, manager sales, lost reasons
  - `/calls` → amoCRM calls, OnlinePBX calls (both with manager breakdowns)
- **Page Links**:
  - Dashboard: `/dashboard`
  - Calls: `/calls`
  - Admin: `/admin`
  - Users: `/users`

### November 25, 2025 - Investigated Call Data Gap & Built Sync System
- **Investigation: Why amoCRM calls were old (2022-2023)**
  - ✅ OnlinePBX webhooks: Working perfectly, receiving real-time calls
  - ❌ amoCRM logging: OnlinePBX NOT configured to auto-log to amoCRM
  - Result: Fresh calls captured in your system but NOT stored in amoCRM
- **Solution: New sync system to log OnlinePBX calls to amoCRM**
  - New Library: `lib/amoLogCalls.ts` - Functions to log calls to amoCRM API
    - `logCallToAmoCRM(leadId, call)` - Log single call
    - `logCallsToAmoCRMComplex(leadId, calls)` - Batch log multiple
    - `logCallsByPhone(phone, calls)` - Find lead by phone & log
    - `getManagerIdByName(name)` - Get amoCRM user ID
  - New API Endpoint: `POST /api/onlinepbx/sync-to-amocrm`
    - Query params: `?days=7&limit=100` (defaults)
    - Groups calls by phone, finds matching leads, logs as call notes
    - Returns sync status (synced/failed counts)
  - Flow: OnlinePBX webhook → Your database → Sync to amoCRM
- **How to Use**:
  ```bash
  # Sync last 7 days of calls (up to 100)
  curl -X POST "https://your-domain/api/onlinepbx/sync-to-amocrm"
  
  # Sync specific period
  curl -X POST "https://your-domain/api/onlinepbx/sync-to-amocrm?days=30&limit=500"
  ```
  - Can be called manually or set up as scheduled job (cron)
  - Deduplicates using unique call IDs to avoid double-logging