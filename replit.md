# Najot Nur Dashboard - Replit Setup

## Overview
This is a Next.js-based sales dashboard and automation system for Najot Nur. The application integrates with amoCRM, Google Sheets, and Telegram to provide real-time sales statistics, automated reporting, and user management.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **External Integrations**:
  - amoCRM API (CRM data)
  - Google Sheets API (call statistics)
  - Telegram Bot API (automated reports)
  - GitHub API (configuration management)

## Project Structure
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── admin/        # Admin configuration endpoints
│   │   ├── dashboard/    # Dashboard data endpoints
│   │   ├── reports/      # Report generation endpoints
│   │   └── telegram/     # Telegram webhook handler
│   ├── dashboard/        # Dashboard page
│   ├── admin/           # Admin configuration page
│   ├── users/           # User management page
│   └── lib/             # App-specific utilities
├── config/              # Application configuration
├── lib/                # Shared utilities and API clients
├── prisma/             # Database schema and migrations
└── public/             # Static assets
```

## Environment Variables

### Required for Core Functionality
- `DATABASE_URL`: PostgreSQL connection string (already configured)

### Required for amoCRM Integration
- `AMO_BASE_URL`: Base URL for amoCRM API (e.g., https://yourcompany.amocrm.ru)
- `AMO_LONG_LIVED_TOKEN`: Long-lived access token for amoCRM API

### Required for Google Sheets Integration
- `SHEETS_API_KEY`: Google Sheets API key
- `SHEETS_SPREADSHEET_ID`: ID of the Google Spreadsheet containing call data
- `SHEETS_CALLS_RANGE`: (Optional) Range for call data, defaults to "Calls!A:D"

### Required for Telegram Bot
- `TELEGRAM_BOT_TOKEN`: Telegram bot token for sending reports

### Required for GitHub Configuration Management
- `GITHUB_TOKEN`: GitHub personal access token
- `GITHUB_OWNER`: GitHub repository owner
- `GITHUB_REPO`: GitHub repository name
- `GITHUB_BRANCH`: (Optional) Git branch, defaults to "main"

**Note**: Most of these environment variables are optional for development. The app will function with limited features if they're not set.

## Development Setup

### Running Locally
The project is configured to run on port 5000 with the Next.js development server:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Database Setup
The database is already configured and migrations have been applied. To reset or modify the database:
```bash
npx prisma migrate dev
npx prisma studio  # To view/edit database in browser
```

## Deployment
The project is configured for autoscale deployment on Replit:
- **Build**: `npm run build`
- **Start**: `npm start`
- **Deployment Type**: Autoscale (stateless)

## Features
1. **Dashboard**: Real-time sales statistics with charts and metrics
2. **Admin Panel**: Configure dashboard settings and API integrations
3. **User Management**: View and manage Telegram bot subscribers
4. **Automated Reports**: Scheduled daily, weekly, and monthly reports via Telegram
5. **Telegram Bot**: Interactive bot for report subscriptions

## Recent Changes

### November 24, 2025 - Critical Lead Fetching Fix: Pagination for 1000+ Leads
- **Fixed lead fetching to paginate through ALL results** - Was limited to first 250 leads only
  - Old: `limit=250` (single API call) - showed only 242 leads instead of 1022
  - New: Paginated loop fetching 250 leads per page until all fetched
  - Now correctly fetches and processes all 1022 leads for November
  - Metrics now match amoCRM: 32 won deals, 78,222,000 so'm total revenue
  - Added logging to track pagination: `[AmoCRM] Fetched page X: Y leads (total: Z)`

### November 24, 2025 - Chart Layout Redesign with Data List, Sorting & Filtering
- **Redesigned both "Sifatsiz lid sabablari" and "Lid manbalari" sections** - New two-column layout with smart filtering
  - Left column (25%): Text list showing ALL data sorted by count (biggest to smallest)
    - Sheet-style format with labels and numbers
    - Example: Ko'tarmadi  54
    - Example: Dubl  14
    - Example: Sifatsiz lid  10
  - Right column (75%): Pie chart with smart <5% filtering
    - Only shows items with ≥5% of total value (clutter-free visualization)
    - Small items (< 5%) still appear in left list for full transparency
    - Labels connected with lines to pie segments
    - Pie centered in container for balanced layout
    - Data sorted descending for consistency
  - Applied to both loss reasons and lead sources charts
  - Uses flexbox layout for better responsiveness
  - Improved readability and data visibility

### November 24, 2025 - Sifatsiz Lid Sabablari & Count Fixes  
- **Fixed "Sifatsiz lid sabablari" chart** - Now grouped by E'tiroz sababi field (1121759) instead of status name
  - Chart displays actual objection reasons from field 1121759 (e.g., "Dubl", "Ko'tarmadi", "Sifatsiz lid")
  - Shows 126 lost leads with objection reasons (vs 143 total non-qualified before fix)
- **Fixed "Sifatsiz lidlar" count** - Now only counts lost leads that have field 1121759 populated
  - Before: 143 (all non-qualified = total - qualified)
  - After: 126 (only lost leads WITH objection field filled)
  - Ensures consistency: chart shows reasons from the same 126 leads
- **Enhanced enum field handling** - Created `getFieldEnumMapping()` and `getStatusMapping()` functions
  - Converts enum_id to text labels for proper display across charts

### November 24, 2025 - Lead Sources (Lid manbalari) Text Display Fix
- **Fixed chart to show text names instead of numbers** - Now displays "Target", "Community menejer", etc instead of enum IDs
  - Chart shows 7 different lead sources: Target (174), Community menejer (13), Bizning ijtimoiy tarmoq (34), etc
  - Created enum mapping system to convert amoCRM field enum_id → text value

### November 24, 2025 - Sotuv Online/Offline Display Update
- **Changed Sotuv Online and Sotuv Offline metrics** - Now displays both count and revenue
  - Top number: Count of won deals from amoCRM (by course type)
  - Bottom number: Revenue from Google Sheets (filtered by Column C: "Online" or "Offline")
  - Example November data: 8 online sales, 59,273,000 so'm online revenue
  - Added onlineSalesCount, offlineSalesCount, onlineRevenue, offlineRevenue fields
  - Revenue calculation uses case-insensitive matching for "Online"/"Offline" in Google Sheets

### November 24, 2025 - Kelishuv Summasi Calculation Update
- **Changed kelishuvSummasi calculation source** - Now uses custom field 1416675 instead of standard price field
  - Only applies to leads with status 79190542 ("Qisman to'lov qildi")
  - Other won statuses (142) continue using standard price field
  - Before: 9,866,000 so'm (from price field)
  - After: 24,446,000 so'm (from field 1416675 - partial payment amounts)
  - Added getCustomFieldNumber() helper function for numeric field extraction

### November 24, 2025 - Critical Bug Fixes for Dashboard Metrics
- **FIXED: Non-qualified leads counting** - Changed from checking specific loss_reason_ids to: `total leads - qualified leads`
  - Before: 0 non-qualified (incorrect logic)
  - After: 143 non-qualified from 242 total (correct: 242 - 99 = 143)
- **FIXED: Custom field extraction for dropdowns** - Now reads `enum_id` instead of `value` for amoCRM dropdown fields
  - Before: Online/Offline sales showed 0 despite required field being filled
  - After: Correctly shows 9,866,000 so'm for online sales
  - This fixes Course Type field (ID: 1119699) detection
- **FIXED: Google Sheets date parsing** - Added support for dd.mm.yyyy format (e.g., "24.11.2025")
  - Before: 0 revenue rows found (dates not parsed)
  - After: 149 revenue rows found for November with 503,145,000 so'm total revenue ✅

### November 24, 2025 - Async Call Loading Architecture
- **Implemented async loading pattern** - Main dashboard loads immediately, calls fetch separately in background
- **Created separate API endpoint** - `/api/dashboard/calls` handles call data independently from main dashboard
- **Added skipCalls parameter** - Main dashboard API now accepts `skipCalls=true` to bypass expensive call fetching
- **Improved user experience** - Dashboard shows data instantly (~1-2 seconds), calls section shows "loading" state while fetching
- **Performance optimization** - Main dashboard load time reduced from 4-5 minutes to ~2 seconds
- **Call fetching performance** - Unchanged (~4-5 minutes first fetch, ~9 seconds cached), but runs asynchronously without blocking UI
- **Architecture**: Client-side state management with separate loading states for dashboard and calls data
- **Bug fixes applied**:
  - Fixed period calculation consistency - calls endpoint now uses same Monday-based weekly range as main dashboard
  - Added race condition protection - AbortController prevents stale responses when users switch periods quickly

### November 24, 2025 - Multi-Entity Call Fetching
- **Implemented comprehensive call data fetching** from all amoCRM entity types (leads, contacts, companies, customers)
- **Added smart deduplication** using `params.uniq` field to identify unique physical calls across entities
- **Enhanced data integrity** by retaining calls without `uniq` field instead of discarding them
- **Improved logging** to show total records fetched, duplicates removed, and calls kept without deduplication keys
- **Graceful error handling** for amoCRM rate limiting - dashboard continues working with partial data
- **Performance**: First fetch ~4-5 minutes (uncached), subsequent fetches ~9 seconds (cached)
- **Known**: Dashboard shows ~28K calls/month vs amoCRM UI showing ~5.7K - likely due to different filtering (call status, duration, etc.)

### November 23, 2025 - Initial Replit Setup
- Configured Next.js for Replit environment (port 5000 with 0.0.0.0 host)
- Applied Prisma migrations to existing Neon PostgreSQL database
- Configured deployment settings for autoscale production deployment
- Added cache control headers to prevent browser caching issues
- Configured allowedDevOrigins for Replit proxy support

## Architecture Notes
- Uses Next.js App Router with React Server Components
- Database queries are optimized with Prisma
- External API calls use no-store caching for real-time data
- Scheduled reports configured via Vercel cron (needs adaptation for Replit)

## Known Considerations
- The `vercel.json` file contains cron configurations that won't work on Replit directly
- Some features require external API credentials to function fully
- The app gracefully handles missing API credentials by showing empty data or disabling features
