import { NextResponse } from "next/server";
import { fetchUtelCalls } from "@/lib/utelCalls";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = process.env.UTEL_API_TOKEN;
    const baseUrl = process.env.UTEL_API_URL;

    // Check if credentials are set
    if (!token || !baseUrl) {
      return NextResponse.json({
        status: "error",
        message: "Missing UTEL_API_TOKEN or UTEL_API_URL",
        credentials: {
          hasToken: !!token,
          hasUrl: !!baseUrl,
          url: baseUrl || "not set",
        },
      });
    }

    // Get period from query params (default to today)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";

    let fromDate: Date;
    let toDate = new Date();

    if (period === "today") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      const day = fromDate.getDay();
      const diffToMonday = (day + 6) % 7;
      fromDate.setDate(fromDate.getDate() - diffToMonday);
    } else {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
      fromDate.setDate(1);
    }

    console.log(
      `[UTel/Debug] Testing connection from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // Try fetching
    const calls = await fetchUtelCalls(fromDate, toDate);

    return NextResponse.json({
      status: "success",
      message: "UTel API connection test",
      credentials: {
        url: baseUrl,
        hasToken: true,
      },
      testParams: {
        period,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      },
      result: {
        callsReceived: calls.length,
        calls: calls.slice(0, 10), // Show first 10 calls
        totalRetrieved: calls.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[UTel/Debug] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Unknown error",
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
