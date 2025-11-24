import { NextResponse } from "next/server";

// Store all webhook requests for debugging
let allRequests: any[] = [];

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to see what OnlinePBX is actually sending
 * Shows raw request data, parsed fields, and why calls are/aren't being stored
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const timestamp = new Date().toISOString();
    let rawBody = "";
    let parsedData: any = {};

    // Get raw body
    try {
      const text = await request.text();
      rawBody = text;

      // Try to parse based on content type
      if (contentType.includes("application/json")) {
        parsedData = JSON.parse(text);
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          parsedData[key] = value;
        }
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          parsedData[key] = value;
        }
      } else {
        try {
          parsedData = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          for (const [key, value] of params.entries()) {
            parsedData[key] = value;
          }
        }
      }
    } catch (e) {
      console.error("[Debug] Body parse error:", e);
    }

    // Analyze what fields are present
    const analysis = {
      timestamp,
      contentType,
      rawBodyLength: rawBody.length,
      rawBodyPreview: rawBody.substring(0, 200),
      parsedFields: Object.keys(parsedData),
      hasCallId: !!(parsedData.call_id || parsedData.callId || parsedData.uuid),
      hasEvent: !!(parsedData.event || parsedData.type),
      hasUser: !!(parsedData.user || parsedData.user_name || parsedData.username),
      hasDuration: !!(parsedData.duration),
      hasPhone: !!(parsedData.from || parsedData.phone || parsedData.to),
      hasDirection: !!(parsedData.direction),
      fullData: parsedData,
    };

    allRequests.push(analysis);

    // Keep only last 100 requests
    if (allRequests.length > 100) {
      allRequests = allRequests.slice(-100);
    }

    console.log("[OnlinePBX/Debug] Webhook received:", analysis);

    return NextResponse.json({
      success: true,
      message: "Debug request logged",
      analysis,
    });
  } catch (error: any) {
    console.error("[Debug] Error:", error);
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
 * GET to view all debug requests
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const clearLog = searchParams.get("clear") === "true";

  if (clearLog) {
    allRequests = [];
    return NextResponse.json({ success: true, message: "Debug log cleared" });
  }

  return NextResponse.json({
    success: true,
    data: {
      totalRequests: allRequests.length,
      recentRequests: allRequests.slice(-limit),
      analysisFields: [
        "timestamp",
        "contentType",
        "rawBodyLength",
        "rawBodyPreview",
        "parsedFields",
        "hasCallId",
        "hasEvent",
        "hasUser",
        "hasDuration",
        "hasPhone",
        "hasDirection",
        "fullData",
      ],
    },
  });
}
