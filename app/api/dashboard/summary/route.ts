// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { getPeriodDates, PeriodKey } from "@/lib/period";
import { buildDashboardData, Period } from "@/lib/dashboard";

const ALLOWED_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("period") || "today";

    const periodKey: PeriodKey = ALLOWED_PERIODS.includes(raw as PeriodKey)
      ? (raw as PeriodKey)
      : "today";

    const { label } = getPeriodDates(periodKey);

    const data = await buildDashboardData(periodKey as unknown as Period);

    return NextResponse.json({
      success: true,
      periodLabel: label,
      data,
    });
  } catch (err: any) {
    console.error("SUMMARY ERROR:", err);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: err?.message || "Internal Server Error",
      }),
      { status: 500 }
    );
  }
}