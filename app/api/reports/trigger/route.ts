// app/api/reports/trigger/route.ts
// Manual endpoint to trigger specific reports for testing

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportType = "daily" | "weekly" | "monthly";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "daily") as ReportType;

    if (!["daily", "weekly", "monthly"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid report type. Must be: daily, weekly, or monthly" },
        { status: 400 }
      );
    }

    console.log(`[reports/trigger] Manually triggering ${type} report`);

    // Call the appropriate report endpoint
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS}`
      : "http://localhost:5000";

    const reportUrl = `${baseUrl}/api/reports/${type}`;
    const res = await fetch(reportUrl, { method: "GET" });
    const data = await res.json();

    console.log(`[reports/trigger] ${type} report response:`, data);

    return NextResponse.json({
      ok: true,
      type,
      report_response: data,
      message: `${type} report triggered successfully`,
    });
  } catch (err: any) {
    console.error("[reports/trigger] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
