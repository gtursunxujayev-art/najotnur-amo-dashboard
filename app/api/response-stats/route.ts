import { NextResponse } from "next/server";
import { getManagerResponseStats } from "@/lib/leadNotifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const managerFilter = searchParams.get("manager");

    let fromDate: Date;
    let toDate: Date;

    if (fromStr && toStr) {
      fromDate = new Date(fromStr);
      toDate = new Date(toStr);
    } else {
      toDate = new Date();
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
    }

    let stats = await getManagerResponseStats(fromDate, toDate);
    
    if (managerFilter) {
      stats = stats.filter(s => s.manager === managerFilter);
    }

    return NextResponse.json({
      ok: true,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      stats,
    });
  } catch (error: any) {
    console.error("[ResponseStats] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
