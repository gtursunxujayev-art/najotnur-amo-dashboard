import { NextResponse } from "next/server";
import { recentCalls } from "@/app/api/onlinepbx/webhook/route";
import { logCallsByPhone, getManagerIdByName } from "@/lib/amoLogCalls";

export const dynamic = "force-dynamic";

/**
 * Sync OnlinePBX webhook calls to amoCRM
 * Takes recent calls from OnlinePBX webhook storage and logs them as call notes in amoCRM
 * Groups calls by phone number and finds corresponding leads
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const daysBack = parseInt(searchParams.get("days") || "7", 10);

    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - daysBack);

    // Filter recent calls from the specified period
    const callsToSync = recentCalls.filter((c) => new Date(c.date) > cutoffTime).slice(0, limit);

    console.log(`[SyncToAmoCRM] Found ${callsToSync.length} calls to sync (from last ${daysBack} days)`);

    if (callsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No calls to sync",
        synced: 0,
        total: recentCalls.length,
      });
    }

    // Group calls by phone number
    const callsByPhone = new Map<string, any[]>();
    for (const call of callsToSync) {
      if (!callsByPhone.has(call.phone)) {
        callsByPhone.set(call.phone, []);
      }
      callsByPhone.get(call.phone)!.push(call);
    }

    // Sync each phone's calls to amoCRM
    let synced = 0;
    let failed = 0;
    const results: any[] = [];

    for (const [phone, calls] of callsByPhone.entries()) {
      try {
        // Get manager ID if available
        let managerId: number | undefined;
        if (calls[0]?.user) {
          const id = await getManagerIdByName(calls[0].user);
          if (id) managerId = id;
        }

        // Convert to call format for amoCRM
        const callsForAmo = calls.map((c) => ({
          phone: c.phone,
          direction: c.type as "in" | "out",
          duration: c.duration,
          managerId,
          date: new Date(c.date),
          callId: c.id,
        }));

        const logged = await logCallsByPhone(phone, callsForAmo);
        if (logged) {
          synced += calls.length;
          results.push({
            phone,
            count: calls.length,
            status: "synced",
          });
        } else {
          failed += calls.length;
          results.push({
            phone,
            count: calls.length,
            status: "no_lead_found",
          });
        }
      } catch (err: any) {
        console.error(`[SyncToAmoCRM] Error syncing ${phone}:`, err.message);
        failed += calls.length;
        results.push({
          phone,
          count: calls.length,
          status: "error",
          error: err.message,
        });
      }
    }

    console.log(`[SyncToAmoCRM] Sync complete: ${synced} synced, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} calls to amoCRM`,
      synced,
      failed,
      attempted: callsToSync.length,
      total: recentCalls.length,
      details: results,
    });
  } catch (error: any) {
    console.error("[SyncToAmoCRM] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sync status
 */
export async function GET(request: Request) {
  return NextResponse.json({
    success: true,
    message: "Use POST to sync OnlinePBX calls to amoCRM",
    endpoint: "POST /api/onlinepbx/sync-to-amocrm",
    parameters: {
      limit: "Number of recent calls to sync (default: 100)",
      days: "Number of days back to sync (default: 7)",
    },
    example:
      "POST /api/onlinepbx/sync-to-amocrm?days=7&limit=100",
    totalCallsAvailable: recentCalls.length,
  });
}
