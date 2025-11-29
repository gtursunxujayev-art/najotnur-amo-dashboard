// instrumentation.ts - Auto-starts on Next.js server initialization
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import and initialize scheduler on server startup
    import("@/lib/scheduler").then(({ initializeScheduler }) => {
      initializeScheduler();
    }).catch((err) => {
      console.error("[instrumentation] Failed to initialize scheduler:", err);
    });
  }
}
