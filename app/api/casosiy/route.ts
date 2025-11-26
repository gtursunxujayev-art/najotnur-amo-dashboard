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
    const courseTypeFilter = searchParams.get("courseType") || null;

    // Fetch all data without date filtering
    const fromDate = new Date("2025-01-01");
    const toDate = new Date("2099-12-31");

    console.log(
      `[CasosiyAPI] Fetching all data from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    const allData = await getCasosiyData(fromDate, toDate);
    
    // Get unique course types
    const courseTypes = Array.from(new Set(allData.map(r => r.courseType))).sort();

    // Filter by course type if specified
    const data = courseTypeFilter 
      ? allData.filter(r => r.courseType === courseTypeFilter)
      : allData;

    // Calculate KPIs for selected course type
    let tushum = 0, qarzdorlik = 0, kelishuv = 0;
    const tarifCounts = new Map<string, number>();

    for (const row of data) {
      tushum += row.paymentSum;
      qarzdorlik += row.debtSum;
      kelishuv += row.kelishuv;
      
      const tarif = row.paymentType || "Unknown";
      tarifCounts.set(tarif, (tarifCounts.get(tarif) || 0) + 1);
    }

    console.log(`[CasosiyAPI] Returning ${data.length} records for course type: ${courseTypeFilter || "all"}`);

    return NextResponse.json({
      success: true,
      data: {
        source: "casosiy",
        totalRecords: data.length,
        courseTypes,
        selectedCourseType: courseTypeFilter,
        kpi: {
          tushum,
          qarzdorlik,
          kelishuv,
        },
        tarifCounts: Object.fromEntries(tarifCounts),
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
