// instrumentation.ts - Auto-starts on Next.js server initialization
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // DISABLED: Built-in scheduler is disabled because cron-job.org is used for scheduled reports
      // This prevents duplicate reports being sent at 8:00 AM
      // If you want to re-enable the built-in scheduler, uncomment the lines below:
      // const { initializeScheduler } = await import("@/lib/scheduler");
      // initializeScheduler();
      console.log("[instrumentation] Built-in scheduler DISABLED (using cron-job.org for reports)");
      
      // Pre-warm active leads cache in background
      const { warmActiveLeadsCache } = await import("@/lib/amocrm");
      warmActiveLeadsCache().catch((err: any) => {
        console.error("[instrumentation] Failed to warm active leads cache:", err?.message);
      });
    } catch (err: any) {
      console.error("[instrumentation] Failed to initialize:", err?.message);
    }
  }
}
