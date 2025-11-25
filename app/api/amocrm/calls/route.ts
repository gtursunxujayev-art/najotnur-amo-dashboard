import { NextResponse } from "next/server";
import { getAmoCalls } from "@/lib/amoCalls";
import { getUsers } from "@/lib/amocrm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    console.log(`[API] Fetching amoCRM calls for ${days} day(s): ${from.toISOString()} to ${to.toISOString()}`);

    // Fetch calls and users in parallel
    const [calls, users] = await Promise.all([
      getAmoCalls(from, to),
      getUsers(),
    ]);

    // Create manager name map
    const managerMap = new Map(users.map(u => [u.id, u.name]));

    // Format calls with manager names
    const formattedCalls = calls.slice(0, limit).map((call, idx) => ({
      index: idx + 1,
      managerId: call.managerId,
      managerName: managerMap.get(call.managerId) || `User ${call.managerId}`,
      dateTime: call.datetime.toISOString(),
      durationSeconds: call.durationSec,
      durationMinutes: (call.durationSec / 60).toFixed(2),
      callUniq: call.callUniq || "unknown",
    }));

    // Calculate statistics
    const stats = {
      totalCalls: calls.length,
      uniqueCalls: new Set(calls.map(c => c.callUniq)).size,
      callsByManager: {} as Record<string, { count: number; totalSeconds: number; avgSeconds: number }>,
      totalDuration: calls.reduce((sum, c) => sum + c.durationSec, 0),
      averageDuration: calls.length > 0 ? Math.round(calls.reduce((sum, c) => sum + c.durationSec, 0) / calls.length) : 0,
    };

    // Calculate per-manager stats
    for (const call of calls) {
      const managerName = managerMap.get(call.managerId) || `User ${call.managerId}`;
      if (!stats.callsByManager[managerName]) {
        stats.callsByManager[managerName] = { count: 0, totalSeconds: 0, avgSeconds: 0 };
      }
      stats.callsByManager[managerName].count++;
      stats.callsByManager[managerName].totalSeconds += call.durationSec;
    }

    // Calculate averages
    for (const manager of Object.values(stats.callsByManager)) {
      manager.avgSeconds = Math.round(manager.totalSeconds / manager.count);
    }

    return NextResponse.json({
      success: true,
      meta: {
        period: { from: from.toISOString(), to: to.toISOString() },
        limit,
        returned: Math.min(limit, calls.length),
        total: calls.length,
      },
      stats,
      calls: formattedCalls,
    });
  } catch (error: any) {
    console.error("[API] Error fetching amoCRM calls:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
