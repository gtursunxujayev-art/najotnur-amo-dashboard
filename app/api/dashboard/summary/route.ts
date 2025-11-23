// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { getPeriodFromQuery } from "@/lib/period";
import { buildDashboardData } from "@/lib/dashboard";

export async function GET(req: Request) {
  try {
    const { from, to, label } = getPeriodFromQuery(req);

    const data = await buildDashboardData({ from, to });

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