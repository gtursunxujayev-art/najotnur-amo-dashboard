// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { buildDashboardData, Period } from "@/lib/dashboard";

const ALLOWED_PERIODS: Period[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get("period") || "today") as Period;

    const period: Period = ALLOWED_PERIODS.includes(periodParam)
      ? periodParam
      : "today";

    const data = await buildDashboardData(period);

    // summary route oldin "success: true" qaytarardi — UI buzilmasin deb saqlab qoldim
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("GET /api/dashboard/summary error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}