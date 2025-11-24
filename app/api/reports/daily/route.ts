// app/api/reports/daily/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDashboardPdf } from "@/lib/reportPdf";
import { resolveReportPeriod } from "@/lib/reportPeriod";
import { sendTelegramPdf } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("[reports/daily] Starting daily report generation...");
    const { period, label } = resolveReportPeriod("daily");

    console.log("[reports/daily] Fetching users with daily report enabled...");
    const users = await prisma.telegramUser.findMany({
      where: { dailyReport: true },
      orderBy: { createdAt: "asc" },
    });

    console.log(`[reports/daily] Found ${users.length} daily subscribers`);
    if (!users.length) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        message: "No daily subscribers",
      });
    }

    console.log("[reports/daily] Generating PDF...");
    let pdfBytes;
    try {
      pdfBytes = await generateDashboardPdf(period, label);
      console.log(`[reports/daily] PDF generated: ${pdfBytes.length} bytes`);
    } catch (pdfErr: any) {
      console.error("[reports/daily] PDF generation failed:", pdfErr?.message || pdfErr);
      throw pdfErr;
    }

    console.log("[reports/daily] Sending PDFs to all users...");
    try {
      await Promise.all(
        users.map((u) => {
          console.log(`[reports/daily] Sending to user ${u.chatId}...`);
          return sendTelegramPdf(
            u.chatId,
            pdfBytes,
            `📊 Najot Nur — Kunlik sotuv hisobot\n${label}`
          ).catch(telegramErr => {
            console.error(`[reports/daily] Failed to send to user ${u.chatId}:`, telegramErr?.message);
            throw telegramErr;
          });
        })
      );
    } catch (telegramErr: any) {
      console.error("[reports/daily] Telegram sending failed:", telegramErr?.message || telegramErr);
      throw telegramErr;
    }

    console.log(`[reports/daily] Successfully sent reports to ${users.length} users`);
    return NextResponse.json({ ok: true, sent: users.length });
  } catch (err: any) {
    console.error("[reports/daily] FINAL ERROR:", err?.message || String(err));
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
