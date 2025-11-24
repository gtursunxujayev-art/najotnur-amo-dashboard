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
*   **Data Aggregation & Transformation:** Extensive logic is in place for aggregating data from various sources (amoCRM, Google Sheets), cleaning it, and transforming it for display (e.g., enum field mapping, calculating conversion rates, sorting, and filtering).
*   **Scheduled Reports:** An automated scheduler (node-cron) is set up to send daily, weekly, and monthly reports via Telegram.
*   **Dashboard UI/UX:** Features redesigned chart layouts with two-column displays for detailed lists and filtered pie charts for better visualization. Professional styling is applied consistently across the dashboard and PDF reports.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data, including leads, sales, and manager statistics. Calls cached for 1 hour.
*   **OnlinePBX Webhooks:** Real-time call events pushed via webhooks to `/api/onlinepbx/webhook`. Stores calls in memory.
*   **Google Sheets API:** Integrates for call statistics and revenue data.
*   **Telegram Bot API:** Utilized for sending automated reports and user subscriptions.
*   **GitHub API:** (Optional) Planned for configuration management.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

### November 24, 2025 - OnlinePBX Webhook Integration Implemented
- **Created OnlinePBX webhook endpoint** - `/api/onlinepbx/webhook` receives real-time call events
  - **Setup**: Configure in panel.onlinepbx.ru to send webhook to `https://[REPLIT_DOMAIN]/api/onlinepbx/webhook`
  - **Data Formats**: Supports JSON, form-encoded, and multipart data from OnlinePBX
  - **Storage**: Calls stored in memory, accessible via GET requests
  - **Verification**: Check `/api/onlinepbx/webhook?limit=10` to see received calls
  - **Error Debugging**: Check `/api/onlinepbx/webhook?errors=true` if webhooks fail
  - Files created: `lib/onlinepbx.ts` (API client), `app/api/onlinepbx/calls/route.ts`, `app/api/onlinepbx/webhook/route.ts`
- **Dual Call Data Sources**: 
  - amoCRM: Cached calls (1 hour TTL), from 214 calls for Diyorbek, fetched from leads entity
  - OnlinePBX: Real-time webhook events, immediate push to dashboard
  - Benefit: Real-time data from OnlinePBX complements cached amoCRM for comprehensive call tracking

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