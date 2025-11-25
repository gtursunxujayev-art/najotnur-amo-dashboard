import { NextResponse } from "next/server";
import { amoRequest } from "@/lib/amocrm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const debug = searchParams.get("debug") === "true";

    // Calculate date range
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(to.getTime() / 1000);

    console.log(`[Diagnostic] Checking all entities for calls: ${from.toISOString()} to ${to.toISOString()}`);

    const entities = ["leads", "contacts", "companies", "customers"];
    const results: Record<string, any> = {};

    for (const entity of entities) {
      try {
        const callsByPage: any[] = [];
        let totalCalls = 0;
        let pageNum = 0;
        let url = `/api/v4/${entity}/notes?limit=250&filter[note_type][]=call_in&filter[note_type][]=call_out&filter[created_at][from]=${fromUnix}&filter[created_at][to]=${toUnix}`;

        while (url && pageNum < 20) {
          // Safety: max 20 pages
          pageNum++;
          console.log(`[Diagnostic] ${entity} page ${pageNum}`);

          const data = await amoRequest(url);
          const notes = data?._embedded?.notes || [];
          totalCalls += notes.length;
          callsByPage.push({ pageNum, count: notes.length });

          // Show sample dates if debug
          if (debug && notes.length > 0) {
            const dates = notes.map((n: any) => new Date((n.created_at as number) * 1000).toISOString().split("T")[0]);
            const uniqueDates = Array.from(new Set(dates));
            console.log(`[Diagnostic] ${entity} page ${pageNum} dates: ${uniqueDates.slice(0, 3).join(", ")}...`);
          }

          const nextHref = data?._links?.next?.href;
          if (nextHref && notes.length === 250) {
            url = nextHref;
          } else {
            url = "";
          }
        }

        results[entity] = {
          totalCalls,
          pagesScanned: pageNum,
          pageBreakdown: callsByPage,
          note: totalCalls === 0 ? "No calls found" : `${pageNum} page(s) fetched`,
        };

        console.log(`[Diagnostic] ${entity}: ${totalCalls} calls in ${pageNum} pages`);
      } catch (err: any) {
        results[entity] = {
          error: err.message,
          totalCalls: 0,
        };
        console.error(`[Diagnostic] ${entity} error:`, err.message);
      }
    }

    // Summary
    const totalAllEntities = Object.values(results).reduce((sum: number, r: any) => sum + (r.totalCalls || 0), 0);
    const entitiesWithCalls = Object.entries(results).filter(([_, r]: [string, any]) => r.totalCalls && r.totalCalls > 0);

    return NextResponse.json({
      success: true,
      meta: {
        period: { from: from.toISOString(), to: to.toISOString() },
        daysRequested: days,
      },
      summary: {
        totalCallsAllEntities: totalAllEntities,
        entitiesWithCalls: entitiesWithCalls.length,
        paginationLimit: 250,
        note: totalAllEntities === 0 ? "No calls found - may need to check if OnlinePBX is integrated with amoCRM" : "Calls found - pagination working",
      },
      details: results,
    });
  } catch (error: any) {
    console.error("[Diagnostic] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
