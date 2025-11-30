import { NextResponse } from "next/server";
import { getManagerNameFromExtension, isPhoneNumber } from "@/lib/extensionMapping";
import { prisma } from "@/lib/prisma";

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
      // Utel sends complete call data in call_saved event - use this as primary source
      isCallEvent = true;
      callData = callHistory;
      console.log("[Utel/Webhook] Processing call_saved event with history:", {
        id: callHistory.id,
        src: callHistory.src,
        dst: callHistory.dst,
        duration: callHistory.duration,
        conversation: callHistory.conversation,
      });
    }
    // Skip call_ended event - it doesn't have duration and overwrites call_saved data
    // Only process call_saved events which have complete call information

    if (isCallEvent && callData) {
      // Parse timestamp
      // IMPORTANT: Utel sends date_time in GMT+5 local time (Uzbekistan)
      // We need to convert to UTC for proper database storage
      const GMT5_OFFSET_MS = 5 * 60 * 60 * 1000;
      
      let callDate = new Date();
      if (callData.date_time) {
        // Parse the date_time string "2025-11-26 15:50:45" (this is GMT+5 local time!)
        const parsed = new Date(callData.date_time);
        if (!isNaN(parsed.getTime())) {
          // CRITICAL FIX: The string is in GMT+5 local time, but JavaScript parses it as UTC
          // We need to subtract 5 hours to get the actual UTC time
          callDate = new Date(parsed.getTime() - GMT5_OFFSET_MS);
          console.log(`[Utel/Webhook] Date conversion: "${callData.date_time}" (GMT+5) → ${callDate.toISOString()} (UTC)`);
        }
      } else if (callData.timestamp) {
        // Unix timestamp is already in UTC, no conversion needed
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
      console.log(`[Utel/Webhook] Duration calculation - conversation: ${callData.conversation}, duration: ${callData.duration}, selected: ${durationValue}`);
      if (durationValue) {
        const dur = typeof durationValue === "string" 
          ? parseInt(durationValue) 
          : durationValue;
        duration = isNaN(dur) ? 0 : dur;
      }
      console.log(`[Utel/Webhook] Final duration value: ${duration}`);

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

      // Determine extension properly
      const extensionNum = direction === "in" ? dst : src;
      
      // Store to database
      try {
        const dbCall = await prisma.utelCall.upsert({
          where: { callId: callData.call_id || `utel-${callData.id}` },
          update: {
            duration,
            date: callDate,
          },
          create: {
            callId: callData.call_id || `utel-${callData.id}`,
            direction,
            date: callDate,
            duration,
            phone: direction === "in" ? src : (callData.external_number || dst),
            extension: extensionNum,
            manager: managerName,
            source: "webhook",
          },
        });
        
        console.log(
          `[Utel/Webhook] ✅ Stored to DB: ${managerName} - ${direction === "in" ? "Incoming" : "Outgoing"} - ${duration}s`
        );
      } catch (dbError) {
        console.error("[Utel/Webhook] Error saving to database:", dbError);
      }

      // Also store in memory for immediate access
      const callRecord = {
        id: callData.call_id || `utel-${callData.id}`,
        direction,
        date: callDate,
        duration,
        phone: direction === "in" ? src : (callData.external_number || dst),
        extension: extensionNum,
        manager: managerName,
        source: "webhook",
      };

      utelRecentCalls.unshift(callRecord);
      if (utelRecentCalls.length > 100) {
        utelRecentCalls = utelRecentCalls.slice(0, 100);
      }
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
