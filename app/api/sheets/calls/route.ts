import { NextResponse } from "next/server";
import { fetchGoogleSheetCalls } from "@/lib/googleSheetCalls";
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

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");
    const sheetName = searchParams.get("sheetName") || "Sheet1";
    const periodParam = (searchParams.get("period") || "week") as PeriodKey;

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: "Missing spreadsheetId parameter" },
        { status: 400 }
      );
    }

    const { from: fromDate, to: toDate } = getPeriodDates(periodParam);

    console.log(
      `[GoogleSheetCalls/API] Fetching calls from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // Fetch from Google Sheets
    const sheetCalls = await fetchGoogleSheetCalls(
      spreadsheetId,
      sheetName,
      fromDate,
      toDate
    );

    // Group by manager name (not caller number)
    const managerStats = new Map<
      string,
      {
        manager: string;
        incomingCount: number;
        outgoingCount: number;
        missedCount: number;
        totalDurationSec: number;
      }
    >();

    for (const call of sheetCalls) {
      const managerName = call.manager;

      if (!managerStats.has(managerName)) {
        managerStats.set(managerName, {
          manager: managerName,
          incomingCount: 0,
          outgoingCount: 0,
          missedCount: 0,
          totalDurationSec: 0,
        });
      }

      const stats = managerStats.get(managerName)!;
      stats.totalDurationSec += call.duration;
      if (call.direction === "in") {
        stats.incomingCount++;
      } else if (call.direction === "out") {
        stats.outgoingCount++;
      } else if (call.direction === "missed") {
        stats.missedCount++;
      }
    }

    const managerSummary = Array.from(managerStats.values()).sort(
      (a, b) =>
        b.incomingCount +
        b.outgoingCount +
        b.missedCount -
        (a.incomingCount + a.outgoingCount + a.missedCount)
    );

    return NextResponse.json({
      success: true,
      data: {
        source: "google_sheet",
        totalCalls: sheetCalls.length,
        managerSummary: managerSummary.map((c) => ({
          ...c,
          totalCalls: c.incomingCount + c.outgoingCount + c.missedCount,
          formattedDuration: formatDuration(c.totalDurationSec),
        })),
        recentCalls: sheetCalls
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 100),
      },
    });
  } catch (error: any) {
    console.error("[GoogleSheetCalls/API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch calls",
      },
      { status: 500 }
    );
  }
}
