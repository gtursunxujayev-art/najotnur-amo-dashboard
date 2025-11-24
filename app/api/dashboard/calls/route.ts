import { NextResponse } from "next/server";
import { getAmoCalls } from "@/lib/amoCalls";
import { getUsers } from "@/lib/amocrm";

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

    // Fetch calls and users in parallel
    const [calls, users] = await Promise.all([
      getAmoCalls(fromDate, toDate),
      getUsers(),
    ]);

    // Group calls by manager
    const callsByManager = new Map<number, { callsAll: number; callsOutbound: number }>();
    
    for (const call of calls) {
      const existing = callsByManager.get(call.managerId) || { callsAll: 0, callsOutbound: 0 };
      existing.callsAll++;
      if (call.durationSec > 0) {
        existing.callsOutbound++;
      }
      callsByManager.set(call.managerId, existing);
    }

    // Map to manager calls with names
    const managerCalls = Array.from(callsByManager.entries()).map(([managerId, stats]) => {
      const user = users.find((u) => u.id === managerId);
      return {
        managerId,
        managerName: user?.name || "Unknown",
        callsAll: stats.callsAll,
        callsOutbound: stats.callsOutbound,
      };
    });

    console.log(`[Dashboard/Calls] Returning ${calls.length} calls for ${managerCalls.length} managers`);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: calls.length,
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
