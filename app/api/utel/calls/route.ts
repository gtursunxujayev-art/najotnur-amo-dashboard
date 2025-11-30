import { NextResponse } from "next/server";
import { fetchUtelCalls } from "@/lib/utelCalls";
import { getManagerNameFromExtension } from "@/lib/extensionMapping";
import { prisma } from "@/lib/prisma";
import { getNowGMT5, getTodayStartGMT5, getTodayEndGMT5, getWeekStartGMT5, getMonthStartGMT5, debugGMT5 } from "@/lib/timezoneGMT5";

export const dynamic = "force-dynamic";

type PeriodKey = "today" | "week" | "month";

function getPeriodDates(
  period: PeriodKey
): { from: Date; to: Date; label: string } {
  // Use GMT+5 (Asia/Tashkent) for all period calculations
  // These dates are now proper UTC timestamps representing GMT+5 boundaries
  const now = getNowGMT5();
  const todayStart = getTodayStartGMT5();
  const todayEnd = getTodayEndGMT5();

  if (period === "today") {
    return { from: todayStart, to: todayEnd, label: "Bugun" };
  }

  if (period === "week") {
    const weekStart = getWeekStartGMT5();
    return { from: weekStart, to: now, label: "Bu hafta" };
  }

  const monthStart = getMonthStartGMT5();
  return { from: monthStart, to: now, label: "Bu oy" };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const periodParam = searchParams.get("period") as PeriodKey | null;
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "500"), 1), 2000); // Min 1, Max 2000 for performance
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1); // Min page 1
    const offset = (page - 1) * limit;

    let fromDate: Date;
    let toDate: Date;

    if (fromParam && toParam) {
      fromDate = new Date(fromParam);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
    } else {
      const period: PeriodKey = periodParam === "today" || periodParam === "month" ? periodParam : "week";
      const periodDates = getPeriodDates(period);
      fromDate = periodDates.from;
      toDate = periodDates.to;
    }

    console.log(
      `[UtelCalls/API] Fetching calls from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // Fetch from database with proper date filtering
    // The fromDate and toDate are now correct UTC timestamps representing GMT+5 boundaries
    let utelCalls: any[] = [];
    let totalCount = 0;
    try {
      console.log(`[UtelCalls/API] Debug: ${debugGMT5()}`);
      
      // Get count first (fast with index on date)
      totalCount = await prisma.utelCall.count({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });

      // Then fetch paginated data
      const dbCalls = await prisma.utelCall.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
        orderBy: {
          date: "desc",
        },
        take: limit,
        skip: offset,
      });

      utelCalls = dbCalls.map((call: any) => ({
        id: call.id,
        direction: call.direction as "in" | "out",
        date: call.date,
        duration: call.duration,
        phone: call.phone,
        extension: call.extension,
        name: call.manager,
      }));

      console.log(`[UtelCalls/API] Found ${utelCalls.length} calls in database (total: ${totalCount}, page: ${page})`);
    } catch (dbErr) {
      console.error("[UtelCalls/API] Error fetching from database:", dbErr);
    }

    // If no database calls, try API as fallback
    if (utelCalls.length === 0) {
      console.log("[UtelCalls/API] No database calls found, trying API fallback...");
      const apiCalls = await fetchUtelCalls(fromDate, toDate);
      utelCalls = apiCalls;
    }

    // Group by manager (extension -> name mapping)
    const managerStats = new Map<
      string,
      {
        manager: string;
        totalCalls: number;
        incomingCount: number;
        outgoingCount: number;
        totalDurationSec: number;
      }
    >();

    for (const call of utelCalls) {
      const managerName =
        call.name || getManagerNameFromExtension(call.extension);

      if (!managerStats.has(managerName)) {
        managerStats.set(managerName, {
          manager: managerName,
          totalCalls: 0,
          incomingCount: 0,
          outgoingCount: 0,
          totalDurationSec: 0,
        });
      }

      const stats = managerStats.get(managerName)!;
      stats.totalCalls++;
      stats.totalDurationSec += call.duration;
      if (call.direction === "in") {
        stats.incomingCount++;
      } else {
        stats.outgoingCount++;
      }
    }

    const managerSummary = Array.from(managerStats.values()).sort(
      (a, b) => b.totalCalls - a.totalCalls
    );

    return NextResponse.json({
      success: true,
      calls: utelCalls
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((call) => ({
          ...call,
          manager: call.name || getManagerNameFromExtension(call.extension),
          formattedDuration: formatDuration(call.duration),
        })),
      totalCalls: totalCount || utelCalls.length,
      managerSummary: managerSummary.map((m) => ({
        ...m,
        formattedDuration: formatDuration(m.totalDurationSec),
      })),
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((totalCount || utelCalls.length) / limit),
        hasMore: page * limit < (totalCount || utelCalls.length),
      },
    });
  } catch (error: any) {
    console.error("[UtelCalls/API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
