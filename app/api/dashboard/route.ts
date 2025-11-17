// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { buildDashboardData } from "@/lib/dashboard";

type PeriodKey = "today" | "week" | "month";

function getPeriodDates(
  period: PeriodKey
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (period === "today") {
    return { from: todayStart, to: now, label: "Bugun" };
  }

  if (period === "week") {
    const from = new Date(todayStart);
    const day = from.getDay(); // 0–6, Mon = 1
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to: now, label: "Bu hafta" };
  }

  // "month"
  const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  return { from, to: now, label: "Bu oy" };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = (searchParams.get("period") ||
      "week") as PeriodKey;

    const period: PeriodKey =
      periodParam === "today" || periodParam === "month"
        ? periodParam
        : "week";

    const { from, to, label } = getPeriodDates(period);

    const data = await buildDashboardData({ from, to }, label);

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}