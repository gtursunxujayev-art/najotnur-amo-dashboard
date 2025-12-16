// instrumentation.ts - Auto-starts on Next.js server initialization
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // Import and initialize scheduler on server startup
      const { initializeScheduler } = await import("@/lib/scheduler");
      initializeScheduler();
      
      // Pre-warm active leads cache in background
      const { warmActiveLeadsCache } = await import("@/lib/amocrm");
      warmActiveLeadsCache().catch((err: any) => {
        console.error("[instrumentation] Failed to warm active leads cache:", err?.message);
      });
    } catch (err: any) {
      console.error("[instrumentation] Failed to initialize scheduler:", err?.message);
    }
  }
}
