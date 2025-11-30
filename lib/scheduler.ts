// lib/scheduler.ts - Robust scheduler with execution tracking
import * as cron from "node-cron";
import { prisma } from "@/lib/prisma";
import type { ScheduledTask } from "node-cron";

let isSchedulerInitialized = false;
let schedulerTasks: ScheduledTask[] = [];

interface SchedulerStatus {
  initialized: boolean;
  isRunning: boolean;
  lastExecutions: {
    daily?: { time: string; success: boolean; message?: string };
    weekly?: { time: string; success: boolean; message?: string };
    monthly?: { time: string; success: boolean; message?: string };
  };
}

// Store execution history in memory
let executionHistory: SchedulerStatus = {
  initialized: false,
  isRunning: false,
  lastExecutions: {},
};

export function getSchedulerStatus(): SchedulerStatus {
  // Always return the current state, reflecting isSchedulerInitialized flag
  return {
    initialized: isSchedulerInitialized,
    isRunning: isSchedulerInitialized,
    lastExecutions: executionHistory.lastExecutions,
  };
}

export function initializeScheduler() {
  if (isSchedulerInitialized) {
    console.log("[Scheduler] Already initialized, skipping");
    return;
  }

  console.log("[Scheduler] Initializing automated report scheduler (GMT+5)...");

  // Daily reports at 8:00 AM GMT+5
  const dailyTask = cron.schedule(
    "0 8 * * *",
    async () => {
      const now = new Date().toISOString();
      console.log(`[Scheduler] ⏰ EXECUTING DAILY REPORT at ${now}`);
      try {
        const res = await fetch(`${getBaseUrl()}/api/reports/daily`, {
          method: "GET",
        });
        const data = await res.json();
        console.log("[Scheduler] ✅ Daily report result:", data);
        executionHistory.lastExecutions.daily = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Daily report error:", err?.message);
        executionHistory.lastExecutions.daily = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  schedulerTasks.push(dailyTask);

  // Weekly reports on Monday at 8:00 AM GMT+5
  const weeklyTask = cron.schedule(
    "0 8 * * 1",
    async () => {
      const now = new Date().toISOString();
      console.log(`[Scheduler] ⏰ EXECUTING WEEKLY REPORT at ${now}`);
      try {
        const res = await fetch(`${getBaseUrl()}/api/reports/weekly`, {
          method: "GET",
        });
        const data = await res.json();
        console.log("[Scheduler] ✅ Weekly report result:", data);
        executionHistory.lastExecutions.weekly = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Weekly report error:", err?.message);
        executionHistory.lastExecutions.weekly = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  schedulerTasks.push(weeklyTask);

  // Monthly reports on 1st of month at 8:00 AM GMT+5
  const monthlyTask = cron.schedule(
    "0 8 1 * *",
    async () => {
      const now = new Date().toISOString();
      console.log(`[Scheduler] ⏰ EXECUTING MONTHLY REPORT at ${now}`);
      try {
        const res = await fetch(`${getBaseUrl()}/api/reports/monthly`, {
          method: "GET",
        });
        const data = await res.json();
        console.log("[Scheduler] ✅ Monthly report result:", data);
        executionHistory.lastExecutions.monthly = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Monthly report error:", err?.message);
        executionHistory.lastExecutions.monthly = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  schedulerTasks.push(monthlyTask);

  // OnlinePBX sync every hour to catch missing webhook calls
  const onlinepbxSyncTask = cron.schedule(
    "0 * * * *", // Every hour at :00
    async () => {
      const now = new Date().toISOString();
      console.log(`[Scheduler] 📞 EXECUTING ONLINEPBX SYNC at ${now}`);
      try {
        const res = await fetch(`${getBaseUrl()}/api/onlinepbx/sync?period=today`, {
          method: "GET",
        });
        const data = await res.json();
        if (data.success) {
          console.log("[Scheduler] ✅ OnlinePBX sync result:", data.result || data);
          (executionHistory.lastExecutions as any).onlinepbxSync = {
            time: now,
            success: true,
            message: data.result ? `Fetched: ${data.result.fetched}, New: ${data.result.newCalls}` : 'Sync successful',
          };
        } else {
          console.log("[Scheduler] ⚠️ OnlinePBX sync skipped (API access blocked - relying on webhook):", data.hint || data.error);
          (executionHistory.lastExecutions as any).onlinepbxSync = {
            time: now,
            success: false,
            message: data.hint || data.error || 'API access blocked - webhook still active',
          };
        }
      } catch (err: any) {
        console.error("[Scheduler] ⚠️ OnlinePBX sync error (webhook still active):", err?.message);
        (executionHistory.lastExecutions as any).onlinepbxSync = {
          time: now,
          success: false,
          message: `${err?.message} - webhook still active`,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  schedulerTasks.push(onlinepbxSyncTask);

  isSchedulerInitialized = true;
  executionHistory.initialized = true;
  executionHistory.isRunning = true;

  console.log("[Scheduler] ✅ Scheduler initialized successfully");
  console.log("[Scheduler] 📋 Schedule (GMT+5 / Asia/Tashkent):");
  console.log("  ✓ Daily: Every day at 8:00 AM");
  console.log("  ✓ Weekly: Every Monday at 8:00 AM");
  console.log("  ✓ Monthly: 1st of each month at 8:00 AM");
  console.log("  ✓ OnlinePBX Sync: Every hour at :00");
  console.log("[Scheduler] 🔧 Use /api/scheduler/status to check execution history");
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }
  return "http://localhost:5000";
}
