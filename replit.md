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
*   **amoCRM API:** Used for CRM data, including leads, sales, and manager statistics.
*   **Google Sheets API:** Integrates for call statistics and revenue data.
*   **Telegram Bot API:** Utilized for sending automated reports and user subscriptions.
*   **GitHub API:** (Optional) Planned for configuration management.
*   **PostgreSQL:** The primary database, accessed via Prisma ORM.