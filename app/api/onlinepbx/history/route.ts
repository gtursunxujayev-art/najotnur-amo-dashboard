import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Query historical call data by date range
 * Supports:
 * - /api/onlinepbx/history?period=month - This month
 * - /api/onlinepbx/history?period=year - This year
 * - /api/onlinepbx/history?from=2025-01-01&to=2025-12-31 - Custom range
 * - /api/onlinepbx/history?manager=Diyorbek - Filter by manager
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // "month", "year", or custom
    const manager = searchParams.get("manager");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "1000");

    let fromDate: Date;
    let toDate: Date;
    let periodLabel = "";

    if (fromParam && toParam) {
      // Custom date range
      fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      periodLabel = `${fromParam} to ${toParam}`;
    } else if (period === "year") {
      // This year
      const now = new Date();
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      periodLabel = `This year (${now.getFullYear()})`;
    } else {
      // This month (default)
      const now = new Date();
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = `This month (${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`;
    }

    console.log(`[OnlinePBX/History] Querying calls for ${periodLabel}`);

    // Build query filters
    const where: any = {
      date: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (manager) {
      where.user = {
        contains: manager,
        mode: "insensitive",
      };
    }

    // Query from database
    const calls = await prisma.onlinePBXCall.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
    });

    // Calculate statistics
    const stats = {
      totalCalls: calls.length,
      totalDuration: calls.reduce((sum, call) => sum + call.duration, 0),
      averageDuration: calls.length > 0 ? Math.round(calls.reduce((sum, call) => sum + call.duration, 0) / calls.length) : 0,
      incomingCalls: calls.filter((c) => c.direction === "in").length,
      outgoingCalls: calls.filter((c) => c.direction === "out").length,
      uniqueManagers: [...new Set(calls.map((c) => c.user))].length,
      managers: [...new Set(calls.map((c) => c.user))],
    };

    return NextResponse.json({
      success: true,
      data: {
        period: periodLabel,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        statistics: stats,
        calls: calls.map((c) => ({
          id: c.callId,
          direction: c.direction,
          date: c.date,
          duration: c.duration,
          phone: c.phone,
          manager: c.user,
          source: c.source,
        })),
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/History] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
