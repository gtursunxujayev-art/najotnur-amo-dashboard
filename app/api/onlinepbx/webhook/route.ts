import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory storage for recent calls from webhook
let recentCalls: any[] = [];

/**
 * OnlinePBX webhook endpoint
 * Receives real-time call events from OnlinePBX panel
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();

    console.log("[OnlinePBX/Webhook] Received event:", {
      event: data.event,
      callId: data.callId,
      from: data.from,
      to: data.to,
      user: data.user,
      duration: data.duration,
      timestamp: data.timestamp,
    });

    // Store call events
    if (data.event === "call_end" || data.event === "call_finish") {
      const callRecord = {
        id: data.callId || `${Date.now()}`,
        type: data.direction === "in" ? "in" : "out",
        date: new Date((data.timestamp || Date.now() / 1000) * 1000),
        duration: parseInt(data.duration) || 0,
        phone: data.from || data.to || "Unknown",
        user: data.user || "Unknown",
        source: "webhook",
        timestamp: Date.now(),
      };

      recentCalls.push(callRecord);

      // Keep only last 1000 calls in memory
      if (recentCalls.length > 1000) {
        recentCalls = recentCalls.slice(-1000);
      }

      console.log(`[OnlinePBX/Webhook] Stored call event. Total calls: ${recentCalls.length}`);
    }

    return NextResponse.json({
      success: true,
      message: "Call event received",
      eventType: data.event,
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Webhook] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}

/**
 * GET endpoint to retrieve recently received calls
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Return recent calls, sorted by timestamp (newest first)
    const calls = recentCalls
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        totalCalls: recentCalls.length,
        recentCalls: calls,
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Webhook] GET Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
