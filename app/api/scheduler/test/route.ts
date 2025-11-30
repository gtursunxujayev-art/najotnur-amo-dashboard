// app/api/scheduler/test/route.ts - Manually trigger reports for testing
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";

    if (!["daily", "weekly", "monthly"].includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid report type. Use: daily, weekly, or monthly",
        },
        { status: 400 }
      );
    }

    console.log(`[scheduler/test] 🧪 Manually triggering ${type} report...`);

    const reportEndpoint = `/api/reports/${type}`;
    const baseUrl =
      process.env.REPLIT_DOMAINS ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    const fullUrl =
      baseUrl.includes("http") || baseUrl.includes("localhost")
        ? `${baseUrl}${reportEndpoint}`
        : `http://localhost:5000${reportEndpoint}`;

    console.log(`[scheduler/test] Calling: ${fullUrl}`);

    const res = await fetch(fullUrl, { method: "GET" });
    const data = await res.json();

    console.log(`[scheduler/test] ✅ Response:`, data);

    return NextResponse.json({
      status: "ok",
      type,
      triggered_at: new Date().toISOString(),
      endpoint: reportEndpoint,
      result: data,
      message: `Manually triggered ${type} report. Check console logs for execution details.`,
    });
  } catch (err: any) {
    console.error("[scheduler/test] ❌ Error:", err?.message);
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
