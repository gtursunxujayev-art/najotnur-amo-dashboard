import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory storage for recent calls from webhook
export let recentCalls: any[] = [];
let webhookErrors: any[] = [];

/**
 * OnlinePBX webhook endpoint
 * Receives real-time call events from OnlinePBX panel
 * Handles multiple data formats (JSON, form-encoded, URL params)
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};

    // Try multiple ways to parse the request
    try {
      if (contentType.includes("application/json")) {
        data = await request.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          data[key] = value;
        }
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
      } else {
        // Try raw text and parse as JSON
        const text = await request.text();
        try {
          data = JSON.parse(text);
        } catch {
          // Fall back to treating as query-like parameters
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) {
            data[key] = value;
          }
        }
      }
    } catch (parseError) {
      console.error("[OnlinePBX/Webhook] Parse error:", parseError);
      data = { error: "Could not parse request body" };
    }

    console.log("[OnlinePBX/Webhook] Received data:", data);

    // Parse call data based on whatever fields are present
    const isCallEnd =
      (data.event === "call_end" ||
        data.event === "call_finish" ||
        data.type === "call_end" ||
        data.call_end) &&
      (data.call_id || data.callId || data.uuid);

    let stored = false;
    if (isCallEnd || data.duration) {
      const callRecord = {
        id: data.call_id || data.callId || data.uuid || `${Date.now()}`,
        type: data.direction === "in" || data.direction === "1" ? "in" : "out",
        date: new Date((data.timestamp || Date.now() / 1000) * 1000),
        duration: parseInt(data.duration) || 0,
        phone: data.from || data.phone || data.to || "Unknown",
        user: data.user || data.user_name || data.username || "Unknown",
        source: "webhook",
        timestamp: Date.now(),
      };

      recentCalls.push(callRecord);

      // Keep only last 1000 calls
      if (recentCalls.length > 1000) {
        recentCalls = recentCalls.slice(-1000);
      }

      console.log(`[OnlinePBX/Webhook] Stored call. Total: ${recentCalls.length}`);
      stored = true;
    }

    // Return 200 OK for all successful requests (OnlinePBX webhook requirement)
    return NextResponse.json({
      success: true,
      message: "Call event received and processed",
      eventType: data.event || data.type || "unknown",
      stored: stored,
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Webhook] Error:", error);
    
    const errorRecord = {
      timestamp: Date.now(),
      error: error.message,
      stack: error.stack?.substring(0, 200),
    };
    
    webhookErrors.push(errorRecord);
    if (webhookErrors.length > 50) {
      webhookErrors = webhookErrors.slice(-50);
    }

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
 * GET endpoint to retrieve recently received calls and errors
 * Supports filtering by date range
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");
    const showErrors = searchParams.get("errors") === "true";
    const fromDateStr = searchParams.get("from");
    const toDateStr = searchParams.get("to");

    let calls = recentCalls.sort((a, b) => b.timestamp - a.timestamp);

    // Apply date filtering if provided
    if (fromDateStr && toDateStr) {
      const fromDate = new Date(fromDateStr);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(toDateStr);
      toDate.setHours(23, 59, 59, 999);
      
      const fromTime = fromDate.getTime();
      const toTime = toDate.getTime();
      
      calls = calls.filter((call) => {
        const callTime = new Date(call.date).getTime();
        return callTime >= fromTime && callTime <= toTime;
      });
    }

    // Apply limit
    calls = calls.slice(0, limit);

    const response: any = {
      success: true,
      data: {
        totalCalls: recentCalls.length,
        filteredCount: calls.length,
        recentCalls: calls,
      },
    };

    if (showErrors) {
      response.errors = webhookErrors.slice(-20);
    }

    return NextResponse.json(response);
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
