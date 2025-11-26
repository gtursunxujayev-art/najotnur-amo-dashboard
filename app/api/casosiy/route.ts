import { NextResponse } from "next/server";
import { getCasosiyData } from "@/lib/casosiySheets";

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
      const period: PeriodKey =
        periodParam === "today" || periodParam === "month" ? periodParam : "week";
      const periodDates = getPeriodDates(period);
      fromDate = periodDates.from;
      toDate = periodDates.to;
    }

    console.log(
      `[CasosiyAPI] Fetching data from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    const data = await getCasosiyData(fromDate, toDate);

    // Group by manager and course type
    const managerStats = new Map<
      string,
      {
        manager: string;
        courseTypes: Map<
          string,
          { courseType: string; totalPayment: number; totalDebt: number }
        >;
        totalPayment: number;
        totalDebt: number;
      }
    >();

    for (const row of data) {
      if (!managerStats.has(row.manager)) {
        managerStats.set(row.manager, {
          manager: row.manager,
          courseTypes: new Map(),
          totalPayment: 0,
          totalDebt: 0,
        });
      }

      const manager = managerStats.get(row.manager)!;
      manager.totalPayment += row.paymentSum;
      manager.totalDebt += row.debtSum;

      if (!manager.courseTypes.has(row.courseType)) {
        manager.courseTypes.set(row.courseType, {
          courseType: row.courseType,
          totalPayment: 0,
          totalDebt: 0,
        });
      }

      const course = manager.courseTypes.get(row.courseType)!;
      course.totalPayment += row.paymentSum;
      course.totalDebt += row.debtSum;
    }

    const managerSummary = Array.from(managerStats.values())
      .map((m) => ({
        manager: m.manager,
        totalPayment: m.totalPayment,
        totalDebt: m.totalDebt,
        courses: Array.from(m.courseTypes.values()),
      }))
      .sort((a, b) => b.totalPayment - a.totalPayment);

    console.log(`[CasosiyAPI] Returning ${data.length} records for ${managerSummary.length} managers`);

    return NextResponse.json({
      success: true,
      data: {
        source: "casosiy",
        totalRecords: data.length,
        managerSummary,
        allRecords: data.sort((a, b) => b.date.getTime() - a.date.getTime()),
      },
    });
  } catch (error: any) {
    console.error("[CasosiyAPI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
