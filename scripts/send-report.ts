#!/usr/bin/env npx tsx
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type ReportType = "daily" | "weekly" | "monthly";

interface Period {
  from: Date;
  to: Date;
}

function resolveReportPeriod(type: ReportType): { period: Period; label: string } {
  const now = new Date();

  if (type === "daily") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return {
      period: { from: start, to: end },
      label: "Kecha (kunlik hisobot)",
    };
  }

  if (type === "weekly") {
    const end = new Date(now);
    const todayDay = end.getDay() === 0 ? 7 : end.getDay();

    end.setDate(end.getDate() - todayDay);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return {
      period: { from: start, to: end },
      label: "O'tgan hafta (haftalik hisobot)",
    };
  }

  const start = new Date(now);
  start.setDate(1);
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);

  return {
    period: { from: start, to: end },
    label: "O'tgan oy (oylik hisobot)",
  };
}

async function sendTelegramPdf(
  chatId: bigint | number,
  pdfBytes: Uint8Array,
  caption: string
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[telegram] Missing TELEGRAM_BOT_TOKEN env");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);

  const bytesForBlob: any = pdfBytes;
  const blob = new Blob([bytesForBlob], { type: "application/pdf" });
  form.append("document", blob, "dashboard-report.pdf");

  const res = await fetch(url, {
    method: "POST",
    body: form as any,
  });

  if (!res.ok) {
    const responseText = await res.text().catch(() => "");
    throw new Error(`Telegram API error ${res.status}: ${responseText}`);
  }

  console.log(`[telegram] PDF sent successfully to chat ${chatId}`);
}

async function generateDashboardPdf(period: Period, label: string): Promise<Uint8Array> {
  const { generateDashboardPdf: generate } = await import("../lib/reportPdf");
  return generate(period, label, "auto");
}

async function sendReport(reportType: ReportType) {
  console.log(`[send-report] Starting ${reportType} report generation...`);
  console.log(`[send-report] Time: ${new Date().toISOString()}`);

  const { period, label } = resolveReportPeriod(reportType);
  console.log(`[send-report] Period: ${period.from.toISOString()} - ${period.to.toISOString()}`);
  console.log(`[send-report] Label: ${label}`);

  const reportField = `${reportType}Report` as "dailyReport" | "weeklyReport" | "monthlyReport";
  const users = await prisma.telegramUser.findMany({
    where: { [reportField]: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[send-report] Found ${users.length} ${reportType} subscribers`);

  if (!users.length) {
    console.log(`[send-report] No ${reportType} subscribers, exiting`);
    await prisma.$disconnect();
    return;
  }

  console.log(`[send-report] Generating PDF...`);
  const pdfBytes = await generateDashboardPdf(period, label);
  console.log(`[send-report] PDF generated: ${pdfBytes.length} bytes`);

  const captions: Record<ReportType, string> = {
    daily: `📊 Najot Nur — Kunlik sotuv hisobot\n${label}`,
    weekly: `📊 Najot Nur — Haftalik sotuv hisobot\n${label}`,
    monthly: `📊 Najot Nur — Oylik sotuv hisobot\n${label}`,
  };

  console.log(`[send-report] Sending PDFs to ${users.length} users...`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      await sendTelegramPdf(user.chatId, pdfBytes, captions[reportType]);
      successCount++;
    } catch (err: any) {
      console.error(`[send-report] Failed to send to ${user.chatId}: ${err?.message}`);
      errorCount++;
    }
  }

  console.log(`[send-report] Complete! Sent: ${successCount}, Failed: ${errorCount}`);
  await prisma.$disconnect();
}

const reportType = process.argv[2] as ReportType;

if (!reportType || !["daily", "weekly", "monthly"].includes(reportType)) {
  console.error("Usage: npx tsx scripts/send-report.ts <daily|weekly|monthly>");
  process.exit(1);
}

sendReport(reportType)
  .then(() => {
    console.log(`[send-report] ${reportType} report completed successfully`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[send-report] Fatal error: ${err?.message || err}`);
    process.exit(1);
  });
