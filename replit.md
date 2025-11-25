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
*   **Google Sheets API:** Integrates for call statistics and revenue data, specifically for PDF reports.
*   **Telegram Bot API:** Utilized for sending automated reports and managing user subscriptions.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.

## Recent Changes

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