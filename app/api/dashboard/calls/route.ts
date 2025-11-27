import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerNameFromExtension } from "@/lib/extensionMapping";

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
    const periodParam = (searchParams.get("period") || "week") as PeriodKey;

    const period: PeriodKey =
      periodParam === "today" || periodParam === "month"
        ? periodParam
        : "week";

    const { from: fromDate, to: toDate } = getPeriodDates(period);

    console.log(`[Dashboard/Calls] Fetching calls for period: ${period} (${fromDate.toISOString()} to ${toDate.toISOString()})`);

    // Fetch calls from OnlinePBX and Utel databases
    const [onlinepbxCalls, utelCalls] = await Promise.all([
      prisma.onlinePBXCall.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
      prisma.utelCall.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
    ]);

    // Aggregate calls by manager name
    const callsByManager = new Map<string, { callsAll: number; callsOutbound: number; totalDurationSec: number }>();

    // Process OnlinePBX calls
    onlinepbxCalls.forEach((call) => {
      const managerName = call.user || "Unknown";
      const existing = callsByManager.get(managerName) || { callsAll: 0, callsOutbound: 0, totalDurationSec: 0 };
      existing.callsAll++;
      if (call.duration > 0) {
        existing.callsOutbound++;
      }
      existing.totalDurationSec += call.duration || 0;
      callsByManager.set(managerName, existing);
    });

    // Process Utel calls
    utelCalls.forEach((call) => {
      const managerName = call.manager || "Unknown";
      const existing = callsByManager.get(managerName) || { callsAll: 0, callsOutbound: 0, totalDurationSec: 0 };
      existing.callsAll++;
      if (call.duration > 0) {
        existing.callsOutbound++;
      }
      existing.totalDurationSec += call.duration || 0;
      callsByManager.set(managerName, existing);
    });

    // Map to manager calls
    const managerCalls = Array.from(callsByManager.entries()).map(([managerName, stats]) => {
      return {
        managerId: 0, // Not used, but keeping for compatibility
        managerName,
        callsAll: stats.callsAll,
        callsOutbound: stats.callsOutbound,
        totalDurationSec: stats.totalDurationSec,
      };
    });

    const totalCalls = onlinepbxCalls.length + utelCalls.length;

    console.log(`[Dashboard/Calls] Returning ${totalCalls} calls (${onlinepbxCalls.length} OnlinePBX + ${utelCalls.length} Utel) for ${managerCalls.length} managers`);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        managerCalls,
      },
    });
  } catch (error: any) {
    console.error("[Dashboard/Calls] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: {
          totalCalls: 0,
          managerCalls: [],
        },
      },
      { status: 500 }
    );
  }
}
