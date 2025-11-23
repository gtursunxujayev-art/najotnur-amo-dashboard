// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { getPeriodFromQuery } from "@/lib/period";
import { buildDashboardData } from "@/lib/dashboard";

export async function GET(req: Request) {
  try {
    const { from, to, label } = getPeriodFromQuery(req);
    const data = await buildDashboardData({ from, to }, label);

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("dashboard summary api error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "Summary API error" },
      { status: 500 }
    );
  }
}