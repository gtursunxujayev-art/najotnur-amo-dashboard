// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getPeriodDates } from "@/lib/period";
import { buildDashboardData } from "@/lib/dashboard";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("period") || "today";

    const { from, to, label } = getPeriodDates(periodKey);

    // ✅ buildDashboardData now takes only one argument
    const data = await buildDashboardData({ from, to });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("dashboard api error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Dashboard API error",
      },
      { status: 500 }
    );
  }
}