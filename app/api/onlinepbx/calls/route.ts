import { NextResponse } from "next/server";
import { recentCalls } from "@/app/api/onlinepbx/webhook/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

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
    const day = from.getDay();
    const diffToMonday = (day + 6) % 7;
    from.setDate(from.getDate() - diffToMonday);
    return { from, to: now, label: "Bu hafta" };
  }

  const from = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  return { from, to: now, label: "Bu oy" };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Support both period parameter and from/to date parameters
    const periodParam = searchParams.get("period") as PeriodKey | null;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "1000");

    let fromDate: Date;
    let toDate: Date;

    if (fromParam && toParam) {
      // Use explicit date range if provided
      fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
    } else {
      // Use period-based dates
      const period: PeriodKey = periodParam === "today" || periodParam === "month" ? periodParam : "week";
      const periodDates = getPeriodDates(period);
      fromDate = periodDates.from;
      toDate = periodDates.to;
    }

    console.log(
      `[OnlinePBX/Calls] Fetching calls from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // First, try to get calls from database for historical data
    let dbCalls: any[] = [];
    try {
      dbCalls = await prisma.onlinePBXCall.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: { date: "desc" },
        take: limit,
      });
      
      console.log(`[OnlinePBX/Calls] Retrieved ${dbCalls.length} calls from database`);
    } catch (dbError) {
      console.error("[OnlinePBX/Calls] Database query error (table may not exist yet):", dbError);
      // Fall back to in-memory storage if DB query fails
    }

    // Convert DB records to same format as in-memory storage
    let calls = dbCalls.map((call) => ({
      id: call.callId,
      type: call.direction,
      date: call.date,
      duration: call.duration,
      phone: call.phone,
      user: call.user,
      source: call.source,
      timestamp: call.createdAt.getTime(),
    }));

    // If no DB results, fall back to in-memory storage
    if (calls.length === 0) {
      calls = Array.from(recentCalls).sort((a, b) => b.timestamp - a.timestamp);

      // Apply date filtering if provided
      if (fromDate && toDate) {
        const fromTime = fromDate.getTime();
        const toTime = toDate.getTime();
        
        calls = calls.filter((call) => {
          const callTime = new Date(call.date).getTime();
          return callTime >= fromTime && callTime <= toTime;
        });
      }

      // Apply limit
      calls = calls.slice(0, limit);
      console.log(`[OnlinePBX/Calls] Falling back to ${calls.length} calls from in-memory storage (total: ${recentCalls.length})`);
    }

    const totalCount = dbCalls.length > 0 ? dbCalls.length : recentCalls.length;

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: totalCount,
        filteredCount: calls.length,
        recentCalls: calls,
        source: dbCalls.length > 0 ? "database" : "memory",
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Calls] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: {
          totalCalls: 0,
          filteredCount: 0,
          recentCalls: [],
        },
      },
      { status: 500 }
    );
  }
}
