// app/api/admin/init-scheduler/route.ts
import { NextResponse } from "next/server";
import { initializeScheduler } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    initializeScheduler();
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
    return NextResponse.json({
      ok: true,
      message: "Scheduler initialized successfully",
      schedule: {
        daily: "Every day at 9 AM",
        weekly: "Every Monday at 9 AM",
        monthly: "1st of each month at 9 AM",
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
