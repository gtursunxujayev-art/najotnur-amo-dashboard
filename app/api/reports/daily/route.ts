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
    const { period, label } = resolveReportPeriod("daily");

    const users = await prisma.telegramUser.findMany({
      where: { dailyReport: true },
      orderBy: { createdAt: "asc" },
    });

    if (!users.length) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        message: "No daily subscribers",
      });
    }

    const pdfBytes = await generateDashboardPdf(period, label);

    await Promise.all(
      users.map((u) =>
        sendTelegramPdf(
          u.chatId,
          pdfBytes,
          `📊 Najot Nur — Kunlik sotuv hisobot\n${label}`
        )
      )
    );

    return NextResponse.json({ ok: true, sent: users.length });
  } catch (err: any) {
    console.error("[reports/daily] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
