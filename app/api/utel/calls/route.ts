import { NextResponse } from "next/server";
import { fetchUtelCalls } from "@/lib/utelCalls";
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

    // Fetch from webhook endpoint to get stored calls
    const domain = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:5000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const webhookUrl = `${protocol}://${domain}/api/utel/webhook`;
    
    let utelCalls: any[] = [];
    try {
      const webhookResponse = await fetch(webhookUrl);
      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        utelCalls = (webhookData.recentCalls || [])
          .filter((call: any) => {
            const callDate = new Date(call.date);
            return callDate >= fromDate && callDate <= toDate;
          })
          .map((call: any) => ({
            id: call.id,
            direction: call.direction as "in" | "out",
            date: new Date(call.date),
            duration: call.duration,
            phone: call.phone,
            extension: call.extension,
            name: call.manager,
          }));
      }
    } catch (err) {
      console.error("[UtelCalls/API] Error fetching from webhook:", err);
    }

    // If no webhook calls found, try API as fallback
    if (utelCalls.length === 0) {
      console.log("[UtelCalls/API] No webhook calls found, trying API fallback...");
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
      data: {
        source: "utel",
        totalCalls: utelCalls.length,
        managerSummary: managerSummary.map((m) => ({
          ...m,
          formattedDuration: formatDuration(m.totalDurationSec),
        })),
        recentCalls: utelCalls
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 100)
          .map((call) => ({
            ...call,
            manager: call.name || getManagerNameFromExtension(call.extension),
            formattedDuration: formatDuration(call.duration),
          })),
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
