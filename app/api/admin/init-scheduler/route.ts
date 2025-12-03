// app/api/admin/init-scheduler/route.ts
import { NextResponse } from "next/server";
import { initializeScheduler } from "@/lib/scheduler";
import { warmActiveLeadsCache, isActiveLeadsCacheReady } from "@/lib/amocrm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    initializeScheduler();
    
    // Warm active leads cache in background (don't block response)
    if (!isActiveLeadsCacheReady()) {
      console.log("[init-scheduler] Starting background cache warming...");
      warmActiveLeadsCache().catch(err => {
        console.error("[init-scheduler] Background cache warming failed:", err);
      });
    } else {
      console.log("[init-scheduler] Active leads cache already ready");
    }
    
    return NextResponse.json({
      ok: true,
      message: "Scheduler initialized successfully",
    });
  } catch (err) {
    console.error("[init-scheduler] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    initializeScheduler();
    
    // Warm active leads cache in background (don't block response)
    const cacheReady = isActiveLeadsCacheReady();
    if (!cacheReady) {
      console.log("[init-scheduler] Starting background cache warming...");
      warmActiveLeadsCache().catch(err => {
        console.error("[init-scheduler] Background cache warming failed:", err);
      });
    } else {
      console.log("[init-scheduler] Active leads cache already ready");
    }
    
    return NextResponse.json({
      ok: true,
      message: "Scheduler initialized successfully",
      cacheStatus: cacheReady ? "ready" : "warming",
      schedule: {
        daily: "Every day at 8:00 AM GMT+5",
        weekly: "Every Monday at 8:00 AM GMT+5",
        monthly: "1st of each month at 8:00 AM GMT+5",
      },
    });
  } catch (err) {
    console.error("[init-scheduler] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: String(err),
      },
      { status: 500 }
    );
  }
}
