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

    console.log("[Utel/Webhook] Received data:", data);

    // Check if this is a call event
    const isCallEvent = data.event === "call_end" || data.call_id || data.duration;

    if (isCallEvent) {
      // Parse timestamp
      let callDate = new Date();
      if (data.timestamp) {
        const timestamp = typeof data.timestamp === "string" 
          ? parseInt(data.timestamp) 
          : data.timestamp;
        if (!isNaN(timestamp)) {
          callDate = new Date(timestamp * 1000);
        }
      }

      // Parse duration (convert to seconds if needed)
      let duration = 0;
      if (data.duration) {
        const dur = typeof data.duration === "string" 
          ? parseInt(data.duration) 
          : data.duration;
        duration = isNaN(dur) ? 0 : dur;
      }

      // Determine call direction
      const direction = 
        (data.direction === "in" || 
         data.direction === "1" || 
         data.direction === "inbound" ||
         data.type === "inbound")
          ? "in"
          : "out";

      // Get phone number and extension
      const phone = data.phone || data.caller || data.from || "Unknown";
      const extension = data.extension || data.ext || data.user || "Unknown";

      // Determine manager attribution
      let managerName = "Unknown";
      if (direction === "in" && isPhoneNumber(phone)) {
        // Incoming: attribute to extension (the manager who received)
        managerName = getManagerNameFromExtension(extension);
      } else if (direction === "out") {
        // Outgoing: attribute to extension (the manager who made the call)
        managerName = getManagerNameFromExtension(extension);
      }

      // Store call
      const callRecord = {
        id: data.call_id || `${Date.now()}-${extension}`,
        direction,
        date: callDate,
        duration,
        phone,
        extension,
        manager: managerName,
        source: "utel_webhook",
        timestamp: Math.floor(Date.now() / 1000),
        rawData: data,
      };

      utelRecentCalls.unshift(callRecord);
      
      // Keep only last 1000 calls in memory
      if (utelRecentCalls.length > 1000) {
        utelRecentCalls = utelRecentCalls.slice(0, 1000);
      }

      console.log(
        `[Utel/Webhook] Stored call. Total in memory: ${utelRecentCalls.length}`
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
