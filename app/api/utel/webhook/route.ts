import { NextResponse } from "next/server";
import { getManagerNameFromExtension, isPhoneNumber } from "@/lib/extensionMapping";

export const dynamic = "force-dynamic";

// In-memory storage for recent calls from Utel webhook
export let utelRecentCalls: any[] = [];

/**
 * Utel webhook endpoint
 * Receives real-time call events from Utel PBX
 * Stores calls in memory and maps extensions to manager names
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
      } else {
        const text = await request.text();
        try {
          data = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) {
            data[key] = value;
          }
        }
      }
    } catch (parseError) {
      console.error("[Utel/Webhook] Parse error:", parseError);
    }

    console.log("[Utel/Webhook] Received data:", JSON.stringify(data, null, 2).substring(0, 500));

    // Check if this is a call_saved event (most reliable for complete call data)
    const eventName = data.data?.name || data.event || data.name;
    const callHistory = data.data?.call_history;
    
    let isCallEvent = false;
    let callData: any = null;

    if (eventName === "call_saved" && callHistory) {
      // Utel sends complete call data in call_saved event
      isCallEvent = true;
      callData = callHistory;
      console.log("[Utel/Webhook] Processing call_saved event with history:", {
        id: callHistory.id,
        src: callHistory.src,
        dst: callHistory.dst,
        duration: callHistory.duration,
        conversation: callHistory.conversation,
      });
    } else if (eventName === "call_ended" && data.data?.call) {
      // Fallback: parse call_ended event
      isCallEvent = true;
      callData = data.data.call;
      console.log("[Utel/Webhook] Processing call_ended event");
    }

    if (isCallEvent && callData) {
      // Parse timestamp
      let callDate = new Date();
      if (callData.date_time) {
        // Try parsing the date_time string "2025-11-26 15:50:45"
        const parsed = new Date(callData.date_time);
        if (!isNaN(parsed.getTime())) {
          callDate = parsed;
        }
      } else if (callData.timestamp) {
        const timestamp = typeof callData.timestamp === "string" 
          ? parseInt(callData.timestamp) 
          : callData.timestamp;
        if (!isNaN(timestamp)) {
          callDate = new Date(timestamp * 1000);
        }
      }

      // Parse duration - use conversation (actual talk time) if available, otherwise total duration
      let duration = 0;
      const durationValue = callData.conversation || callData.duration;
      if (durationValue) {
        const dur = typeof durationValue === "string" 
          ? parseInt(durationValue) 
          : durationValue;
        duration = isNaN(dur) ? 0 : dur;
      }

      // Determine call direction based on src field
      // In call_history: src is the caller, dst is the receiver
      const src = callData.src || "Unknown";
      const dst = callData.dst || "Unknown";
      
      const direction = isPhoneNumber(src) ? "in" : "out";

      // Determine manager attribution
      let managerName = "Unknown";
      if (direction === "in") {
        // Incoming call: attribute to dst (the manager who received)
        managerName = getManagerNameFromExtension(dst);
      } else {
        // Outgoing call: attribute to src (the manager who made the call)
        managerName = getManagerNameFromExtension(src);
      }

      // Store call
      const callRecord = {
        id: callData.call_id || `utel-${callData.id}`,
        direction,
        date: callDate,
        duration,
        phone: direction === "in" ? src : (callData.external_number || src),
        extension: direction === "in" ? dst : src,
        manager: managerName,
        source: "utel_webhook",
        timestamp: Math.floor(Date.now() / 1000),
        rawData: callData,
      };

      utelRecentCalls.unshift(callRecord);
      
      // Keep only last 1000 calls in memory
      if (utelRecentCalls.length > 1000) {
        utelRecentCalls = utelRecentCalls.slice(0, 1000);
      }

      console.log(
        `[Utel/Webhook] ✅ Stored call: ${managerName} - ${direction === "in" ? "Incoming" : "Outgoing"} - ${duration}s. Total: ${utelRecentCalls.length}`
      );
    }

    return NextResponse.json({
      success: true,
      received: data,
      stored: isCallEvent,
    });
  } catch (error) {
    console.error("[Utel/Webhook] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve recent webhook calls
 * Useful for testing and debugging
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    totalCalls: utelRecentCalls.length,
    recentCalls: utelRecentCalls.slice(0, 50),
  });
}
