// app/api/dashboard/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildDashboardData } from "@/lib/dashboard";

function getPeriodFromQuery(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "today";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (period === "custom" && fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
    return { from, to, label: "Tanlangan davr" };
  }

  if (period === "week") {
    const day = now.getDay(); // 0–6
    const diffToMonday = (day + 6) % 7;
    from = new Date(now);
    from.setDate(now.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
    return { from, to, label: "Ushbu hafta" };
  }

  if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    to = now;
    return { from, to, label: "Ushbu oy" };
  }

  // default: today
  from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  from.setHours(0, 0, 0, 0);
  to = now;
  return { from, to, label: "Bugun" };
}

export async function GET(req: NextRequest) {
  try {
    const { from, to, label } = getPeriodFromQuery(req);
    const data = await buildDashboardData({ from, to }, label);
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: e.message || "Dashboard error" },
      { status: 500 }
    );
  }
}
