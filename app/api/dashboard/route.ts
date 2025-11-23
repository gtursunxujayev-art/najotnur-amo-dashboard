// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getPeriodDates } from "@/lib/period";
import { buildDashboardData } from "@/lib/dashboard";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    const { from, to, label } = getPeriodDates(period);

    // IMPORTANT: ONLY ONE ARGUMENT
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