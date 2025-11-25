import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Import OnlinePBX call data from CSV or JSON format
 * 
 * Supports multiple CSV formats:
 * 
 * Format 1 (English):
 * Date,Time,Direction,Duration,Phone,Manager,CallID
 * 2025-11-24,10:30:45,in,120,+998901234567,Diyorbek,call-123
 * 
 * Format 2 (Russian/OnlinePBX export):
 * Тип звонка,Кто,Кому,Внешний номер,Дата,Продолжительность,Время разговора,Примечание,Оценка качества
 * Пропущенный,9989936676666,10,781130650,(23:58:20),70,0,,0
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
      const lines = text.split("\n").filter(l => l.trim());
      
      console.log(`[OnlinePBX/Import] Received ${lines.length} lines`);
      if (lines.length > 0) {
        console.log(`[OnlinePBX/Import] Header: ${lines[0].substring(0, 100)}`);
      }
      
      if (lines.length < 1) {
        return NextResponse.json(
          { success: false, error: "CSV file is empty" },
          { status: 400 }
        );
      }

      const header = lines[0];
      const isRussianFormat = header.includes("Тип звонка") || header.includes("Внешний номер");
      console.log(`[OnlinePBX/Import] Format detected: ${isRussianFormat ? "Russian" : "English"}`);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          let date, time, direction, duration, phone, manager, callId;

          if (isRussianFormat) {
            // Parse Russian format: Тип звонка,Кто,Кому,Внешний номер,Дата,Продолжительность,Время разговора,Примечание,Оценка качества
            const cols = line.split(",").map((v) => v.trim());
            
            if (i === 1) {
              console.log(`[OnlinePBX/Import] Sample data row has ${cols.length} columns:`, cols.slice(0, 6).join(" | "));
            }
            
            const callType = cols[0]; // Пропущенный, Входящий, Исходящий
            const who = cols[1]; // Caller phone
            const manager_ext = cols[2]; // Manager extension (Кому)
            phone = cols[3]; // External number (customer phone)
            
            // Parse date: (23:58:20) - time only, need to use today's date
            const timeStr = cols[4]?.replace(/[()]/g, "") || "00:00:00";
            const today = new Date().toISOString().split("T")[0];
            
            duration = parseInt(cols[5]) || 0; // Duration in seconds
            
            // Map call type to direction
            if (callType.includes("Входящий")) direction = "in";
            else if (callType.includes("Исходящий")) direction = "out";
            else direction = "missed";
            
            manager = manager_ext; // Use extension from column 2
            callId = `import-${manager_ext}-${timeStr}-${Math.random().toString(36).substr(2, 5)}`;
            date = `${today}T${timeStr}`;
          } else {
            // Parse English format: Date,Time,Direction,Duration,Phone,Manager,CallID
            const [d, t, dir, dur, ph, mgr, cid] = line.split(",").map((v) => v.trim());
            
            date = `${d}T${t || "00:00:00"}`;
            direction = dir || "in";
            duration = parseInt(dur) || 0;
            phone = ph || "";
            manager = mgr || "";
            callId = cid || `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          }

          if (!manager || !phone) {
            if (i <= 3) console.log(`[OnlinePBX/Import] Skipping line ${i}: manager=${manager}, phone=${phone}`);
            continue;
          }

          calls.push({
            date: new Date(date),
            direction: direction || "in",
            duration,
            phone,
            manager,
            callId,
          });
        } catch (err) {
          console.warn(`[OnlinePBX/Import] Warning parsing line ${i}: ${err}`);
          continue;
        }
      }
      
      console.log(`[OnlinePBX/Import] Parsed ${calls.length} calls from ${lines.length - 1} data rows`);
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

        // Validate date before insertion
        const parsedDate = new Date(call.date);
        if (isNaN(parsedDate.getTime())) {
          console.error(`[OnlinePBX/Import] Invalid date for call ${call.callId}:`, call.date);
          errors++;
          continue;
        }

        // Create new call
        await prisma.onlinePBXCall.create({
          data: {
            id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            callId: call.callId,
            direction: call.direction,
            date: parsedDate,
            duration: call.duration,
            phone: call.phone,
            user: call.manager,
            source: "import",
          },
        });

        imported++;
      } catch (err: any) {
        console.error(`[OnlinePBX/Import] Error importing call ${call.callId}:`, err.message, call);
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
