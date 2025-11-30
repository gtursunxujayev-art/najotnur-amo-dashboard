// instrumentation.ts - Auto-starts on Next.js server initialization
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // Import and initialize scheduler on server startup
      const { initializeScheduler } = await import("@/lib/scheduler");
      initializeScheduler();
    } catch (err: any) {
      console.error("[instrumentation] Failed to initialize scheduler:", err?.message);
    }
  }
}
