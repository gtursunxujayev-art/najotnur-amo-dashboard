# Najot Nur Dashboard

## Overview
This project is a Next.js-based sales dashboard and automation system for Najot Nur. Its primary purpose is to provide real-time sales statistics, automated reporting, and user management by integrating with amoCRM, Google Sheets, and Telegram. The business vision is to streamline sales operations, provide critical insights for decision-making, and automate repetitive reporting tasks for improved efficiency and market responsiveness.

## User Preferences
The agent should prioritize iterative development. Ask before making major changes to the core architecture or introducing new external dependencies. When explaining concepts, use clear and concise language.

## System Architecture
The application is built with Next.js 16 (App Router) and React 19, leveraging Tailwind CSS for styling. It uses a PostgreSQL database managed via Prisma ORM.

**UI/UX Decisions:**
*   Redesigned chart layouts, filtered pie charts, and consistent professional styling for the dashboard.
*   Implemented a responsive hamburger menu for navigation across all layouts.
*   Pie charts display percentages with a full legend below.

**Technical Implementations:**
*   **Real-time Data & Caching:** Utilizes `no-store` caching for external API calls and an in-memory caching layer for amoCRM data. Includes cache warming for active leads to improve performance.
*   **Error Handling:** Implements graceful error handling for external API rate limiting with exponential backoff and throttling.
*   **PDF Report Generation:** Generates professional-grade PDF reports with branding, KPI cards, dynamic tables, Unicode support, and automatic pagination.
*   **Data Aggregation & Transformation:** Aggregates, cleans, and transforms data from various sources (amoCRM, Google Sheets, OnlinePBX, UTel).
*   **Automated Scheduled Reports:** CLI scripts send daily, weekly, and monthly reports via Telegram, designed for Replit Scheduled Deployments.
*   **Call Data Integration:** Unifies call data from OnlinePBX and UTel PBX systems, attributing calls to managers and syncing OnlinePBX calls to amoCRM as notes. Includes an active webhook and hourly polling for OnlinePBX.
*   **CSV/XLSX Import:** An admin panel supports importing historical call data from CSV/XLSX files with auto-detection and pagination.
*   **Lead Management:** Features real-time active lead tracking with caching, and mechanisms to prevent double-counting of won leads by checking previous statuses. Integrates "Intensiv" pipeline for comprehensive sales tracking.
*   **Real-Time Lead Notifications:** Sends instant Telegram notifications for new or reassigned amoCRM leads, with user-configurable preferences for delivery times and manager filtering, and tracks response times.
*   **Deployment:** Configured for autoscale deployment on Replit.

## External Dependencies
*   **amoCRM API:** Used for CRM data (leads, sales, manager statistics) and webhooks for real-time lead events.
*   **OnlinePBX Webhooks & API:** Receives real-time call events, provides call analysis endpoints, and enables API polling.
*   **UTel PBX API:** Fetches CDR/call data for comprehensive call tracking.
*   **Google Sheets API:** Integrates for call statistics and revenue data, used in PDF reports and historical data import.
*   **Telegram Bot API:** Utilized for sending automated reports and real-time lead notifications.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.