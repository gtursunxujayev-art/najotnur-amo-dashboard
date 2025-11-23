// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getPeriodDates, PeriodKey } from "@/lib/period";
import { buildDashboardData } from "@/lib/dashboard";

const ALLOWED_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "custom",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("period") || "today";

    // ✅ force correct type + fallback
    const period: PeriodKey = ALLOWED_PERIODS.includes(raw as PeriodKey)
      ? (raw as PeriodKey)
      : "today";

    const { from, to, label } = getPeriodDates(period);

    const data = await buildDashboardData({ from, to });

    return NextResponse.json({
      success: true,
      periodLabel: label,
      data,
    });
  } catch (err: any) {
    console.error("DASHBOARD ERROR:", err);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err?.message || "Internal Server Error",
      }),
      { status: 500 }
    );
  }
}