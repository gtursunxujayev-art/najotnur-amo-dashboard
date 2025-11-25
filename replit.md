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