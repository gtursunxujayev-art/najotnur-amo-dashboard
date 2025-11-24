// lib/scheduler.ts
import cron from "node-cron";

let isSchedulerInitialized = false;

export function initializeScheduler() {
  if (isSchedulerInitialized) {
    console.log("[Scheduler] Already initialized, skipping");
    return;
  }

  console.log("[Scheduler] Initializing automated report scheduler...");

  // Daily reports at 9 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("[Scheduler] Triggering daily report at 9 AM");
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/reports/daily`,
        {
          method: "GET",
        }
      );
      const data = await res.json();
      console.log("[Scheduler] Daily report result:", data);
    } catch (err) {
      console.error("[Scheduler] Daily report error:", err);
    }
  });

  // Weekly reports on Monday at 9 AM
  cron.schedule("0 9 * * 1", async () => {
    console.log("[Scheduler] Triggering weekly report on Monday at 9 AM");
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/reports/weekly`,
        {
          method: "GET",
        }
      );
      const data = await res.json();
      console.log("[Scheduler] Weekly report result:", data);
    } catch (err) {
      console.error("[Scheduler] Weekly report error:", err);
    }
  });

  // Monthly reports on 1st of month at 9 AM
  cron.schedule("0 9 1 * *", async () => {
    console.log("[Scheduler] Triggering monthly report on 1st at 9 AM");
    try {
      const res = await fetch(
        `${getBaseUrl()}/api/reports/monthly`,
        {
          method: "GET",
        }
      );
      const data = await res.json();
      console.log("[Scheduler] Monthly report result:", data);
    } catch (err) {
      console.error("[Scheduler] Monthly report error:", err);
    }
  });

  isSchedulerInitialized = true;
  console.log("[Scheduler] Scheduler initialized successfully");
  console.log("[Scheduler] Schedule:");
  console.log("  ✓ Daily: Every day at 9 AM");
  console.log("  ✓ Weekly: Every Monday at 9 AM");
  console.log("  ✓ Monthly: 1st of each month at 9 AM");
}

function getBaseUrl(): string {
  // For internal calls, use localhost
  // In production, this will be the Replit domain
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }
  return "http://localhost:5000";
}
