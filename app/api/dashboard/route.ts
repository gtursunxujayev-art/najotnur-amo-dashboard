// app/api/dashboard/route.ts
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

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("GET /api/dashboard error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}