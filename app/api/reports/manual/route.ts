// app/api/reports/manual/route.ts
import { NextResponse } from "next/server";
import type { Period } from "@/lib/dashboard";

const ALLOWED_PERIODS: Period[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
];

function periodLabel(p: Period) {
  switch (p) {
    case "today":
      return "Bugun (kunlik hisobot)";
    case "yesterday":
      return "Kecha (kunlik hisobot)";
    case "thisWeek":
      return "Bu hafta (haftalik hisobot)";
    case "lastWeek":
      return "O‘tgan hafta (haftalik hisobot)";
    case "thisMonth":
      return "Bu oy (oylik hisobot)";
    case "lastMonth":
      return "O‘tgan oy (oylik hisobot)";
    default:
      return "Hisobot";
  }
}

async function buildPdfBytes(period: Period, label: string) {
  // reportPdf ichida export nomlari sizda biroz boshqacha bo‘lishi mumkin
  const mod: any = await import("@/lib/reportPdf");

  const buildFn =
    mod.buildReportPdf ||
    mod.buildDashboardPdf ||
    mod.buildReportPDF ||
    mod.default;

  if (typeof buildFn !== "function") {
    throw new Error(
      "lib/reportPdf.ts ichidan PDF builder topilmadi. buildReportPdf/buildDashboardPdf exportini tekshiring."
    );
  }

  // agar funksiya 2 argument qabul qilsa (period, label) yuboramiz, bo‘lmasa faqat period
  if (buildFn.length >= 2) {
    return await buildFn(period, label);
  }

  return await buildFn(period);
}

async function sendPdfToTelegram(chatId: number, pdfBytes: Uint8Array, caption: string) {
  // Avval helper bo‘lsa ishlatamiz
  try {
    const tmod: any = await import("@/lib/telegram");
    const sendFn =
      tmod.sendPdfToTelegram ||
      tmod.sendPdf ||
      tmod.sendTelegramPdfReport;

    if (typeof sendFn === "function") {
      return await sendFn(chatId, pdfBytes, caption);
    }
  } catch (_) {
    // helper topilmasa pastdagi raw Telegram API ishlaydi
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN env topilmadi");

  const url = `https://api.telegram.org/bot${token}/sendDocument`;

  // pdfBytes -> Buffer -> Blob muammosini oldini olish uchun Buffer ishlatamiz
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append(
    "document",
    new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" }),
    "dashboard-report.pdf"
  );

  const res = await fetch(url, { method: "POST", body: form });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.description || "Telegram sendDocument failed");
  }
  return json;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Users page’dan keladigan payload:
    // { chatId: number, period: "today" | "yesterday" | ... }
    const chatId = Number(body.chatId);
    const periodParam = (body.period || "today") as Period;

    if (!chatId || Number.isNaN(chatId)) {
      return NextResponse.json(
        { ok: false, error: "chatId required" },
        { status: 400 }
      );
    }

    const period: Period = ALLOWED_PERIODS.includes(periodParam)
      ? periodParam
      : "today";

    const label = periodLabel(period);

    const pdfBytes = await buildPdfBytes(period, label);
    await sendPdfToTelegram(chatId, pdfBytes, label);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/reports/manual error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}