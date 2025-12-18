// lib/scheduler.ts - Robust scheduler with execution tracking
import * as cron from "node-cron";
import { prisma } from "@/lib/prisma";
import type { ScheduledTask } from "node-cron";
import { getBaseUrl } from "@/lib/baseUrl";

interface SchedulerStatus {
  initialized: boolean;
  isRunning: boolean;
  tasksRegistered: boolean;
  lastExecutions: {
    daily?: { time: string; success: boolean; message?: string };
    weekly?: { time: string; success: boolean; message?: string };
    monthly?: { time: string; success: boolean; message?: string };
    onlinepbxSync?: { time: string; success: boolean; message?: string };
  };
}

// Use globalThis to persist state across module reloads in Next.js dev mode
declare global {
  var __schedulerState: SchedulerStatus | undefined;
  var __schedulerTasks: ScheduledTask[] | undefined;
}

function getGlobalState(): SchedulerStatus {
  if (!globalThis.__schedulerState) {
    globalThis.__schedulerState = {
      initialized: false,
      isRunning: false,
      tasksRegistered: false,
      lastExecutions: {},
    };
  }
  return globalThis.__schedulerState;
}

function getGlobalTasks(): ScheduledTask[] {
  if (!globalThis.__schedulerTasks) {
    globalThis.__schedulerTasks = [];
  }
  return globalThis.__schedulerTasks;
}

export function getSchedulerStatus(): SchedulerStatus {
  const state = getGlobalState();
  return {
    initialized: state.initialized,
    isRunning: state.isRunning,
    tasksRegistered: state.tasksRegistered,
    lastExecutions: state.lastExecutions,
  };
}

export function initializeScheduler() {
  const state = getGlobalState();
  const tasks = getGlobalTasks();

  if (state.initialized) {
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
        state.lastExecutions.daily = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Daily report error:", err?.message);
        state.lastExecutions.daily = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  tasks.push(dailyTask);

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
        state.lastExecutions.weekly = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Weekly report error:", err?.message);
        state.lastExecutions.weekly = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  tasks.push(weeklyTask);

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
        state.lastExecutions.monthly = {
          time: now,
          success: data.ok === true,
          message: data.message || `Sent to ${data.sent} users`,
        };
      } catch (err: any) {
        console.error("[Scheduler] ❌ Monthly report error:", err?.message);
        state.lastExecutions.monthly = {
          time: now,
          success: false,
          message: err?.message,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  tasks.push(monthlyTask);

  // OnlinePBX sync every hour to catch missing webhook calls
  const onlinepbxSyncTask = cron.schedule(
    "0 * * * *",
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
          state.lastExecutions.onlinepbxSync = {
            time: now,
            success: true,
            message: data.result ? `Fetched: ${data.result.fetched}, New: ${data.result.newCalls}` : 'Sync successful',
          };
        } else {
          console.log("[Scheduler] ⚠️ OnlinePBX sync skipped (API access blocked - relying on webhook):", data.hint || data.error);
          state.lastExecutions.onlinepbxSync = {
            time: now,
            success: false,
            message: data.hint || data.error || 'API access blocked - webhook still active',
          };
        }
      } catch (err: any) {
        console.error("[Scheduler] ⚠️ OnlinePBX sync error (webhook still active):", err?.message);
        state.lastExecutions.onlinepbxSync = {
          time: now,
          success: false,
          message: `${err?.message} - webhook still active`,
        };
      }
    },
    { timezone: "Asia/Tashkent" }
  );
  tasks.push(onlinepbxSyncTask);

  state.initialized = true;
  state.isRunning = true;
  state.tasksRegistered = true;

  console.log("[Scheduler] ✅ Scheduler initialized successfully");
  console.log("[Scheduler] 📋 Schedule (GMT+5 / Asia/Tashkent):");
  console.log("  ✓ Daily: Every day at 8:00 AM");
  console.log("  ✓ Weekly: Every Monday at 8:00 AM");
  console.log("  ✓ Monthly: 1st of each month at 8:00 AM");
  console.log("  ✓ OnlinePBX Sync: Every hour at :00");
  console.log("[Scheduler] 🔧 Use /api/scheduler/status to check execution history");
}

