import { NextResponse } from "next/server";
import { getOnlinePBXCalls, groupCallsByUser } from "@/lib/onlinepbx";

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

    console.log(
      `[OnlinePBX/Calls] Fetching calls for period: ${period} (${fromDate.toISOString()} to ${toDate.toISOString()})`
    );

    // Fetch calls from OnlinePBX
    const calls = await getOnlinePBXCalls(fromDate, toDate);

    // Group by user
    const userCalls = groupCallsByUser(calls);

    // Sort by total calls descending
    userCalls.sort((a, b) => b.totalCalls - a.totalCalls);

    console.log(`[OnlinePBX/Calls] Returning ${calls.length} calls for ${userCalls.length} users`);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: calls.length,
        userCalls,
        calls: calls.slice(0, 100), // Return last 100 calls for detail view
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
          userCalls: [],
          calls: [],
        },
      },
      { status: 500 }
    );
  }
}
