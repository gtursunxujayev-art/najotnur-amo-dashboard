import { NextResponse } from "next/server";
import { getCasosiyData } from "@/lib/casosiySheets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseTypeFilter = searchParams.get("courseType") || null;
    const typesOnly = searchParams.get("types") === "true";

    // Fetch all data without date filtering
    const fromDate = new Date("2025-01-01");
    const toDate = new Date("2099-12-31");

    const allData = await getCasosiyData(fromDate, toDate);
    
    // Get unique course types
    const courseTypes = Array.from(new Set(allData.map(r => r.courseType))).sort();

    // If only requesting course types list (for initial dropdown), return immediately
    if (typesOnly) {
      console.log(`[CasosiyAPI] Returning ${courseTypes.length} course types`);
      return NextResponse.json({
        success: true,
        data: {
          courseTypes,
          totalRecords: 0,
          allRecords: [],
        },
      });
    }

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
        totalRecords: data.length,
        courseTypes,
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
