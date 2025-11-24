import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Import OnlinePBX call data from CSV or JSON format
 * 
 * Expected CSV format:
 * Date,Time,Direction,Duration,Phone,Manager,CallID
 * 2025-11-24,10:30:45,in,120,+998901234567,Diyorbek,call-123
 * 
 * Or JSON POST body:
 * {
 *   "calls": [
 *     {
 *       "date": "2025-11-24",
 *       "time": "10:30:45",
 *       "direction": "in",
 *       "duration": 120,
 *       "phone": "+998901234567",
 *       "manager": "Diyorbek",
 *       "callId": "call-123"
 *     }
 *   ]
 * }
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type");
    let calls: any[] = [];

    if (contentType?.includes("application/json")) {
      // Parse JSON
      const body = await request.json();
      calls = body.calls || [];
    } else if (contentType?.includes("text/plain") || contentType?.includes("text/csv")) {
      // Parse CSV
      const text = await request.text();
      const lines = text.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const [date, time, direction, duration, phone, manager, callId] = line.split(",").map((v) => v.trim());

        if (!date || !manager || !callId) continue;

        const dateTime = `${date}T${time || "00:00:00"}`;
        calls.push({
          date: new Date(dateTime),
          direction: direction || "in",
          duration: parseInt(duration) || 0,
          phone: phone || "",
          manager,
          callId,
        });
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid content type. Use application/json or text/csv" },
        { status: 400 }
      );
    }

    if (calls.length === 0) {
      return NextResponse.json(
        { success: false, error: "No calls found in import data" },
        { status: 400 }
      );
    }

    console.log(`[OnlinePBX/Import] Importing ${calls.length} calls...`);

    // Import calls to database
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const call of calls) {
      try {
        // Check if already exists
        const existing = await prisma.onlinePBXCall.findUnique({
          where: { callId: call.callId },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        // Create new call
        await prisma.onlinePBXCall.create({
          data: {
            id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            callId: call.callId,
            direction: call.direction,
            date: new Date(call.date),
            duration: call.duration,
            phone: call.phone,
            user: call.manager,
            source: "import",
          },
        });

        imported++;
      } catch (err: any) {
        console.error(`[OnlinePBX/Import] Error importing call ${call.callId}:`, err.message);
        errors++;
      }
    }

    console.log(
      `[OnlinePBX/Import] Complete - Imported: ${imported}, Duplicates: ${duplicates}, Errors: ${errors}`
    );

    return NextResponse.json({
      success: true,
      data: {
        imported,
        duplicates,
        errors,
        total: calls.length,
        message: `Successfully imported ${imported} calls (${duplicates} duplicates skipped, ${errors} errors)`,
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Import] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
