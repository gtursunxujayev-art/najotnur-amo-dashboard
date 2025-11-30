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
*   **Automated Scheduled Reports:** A `node-cron` scheduler sends daily, weekly, and monthly reports via Telegram with comprehensive execution tracking and timezone support (Asia/Tashkent).
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