// app/api/reports/manual/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDashboardPdf } from "@/lib/reportPdf";
import { sendTelegramPdf } from "@/lib/telegram";
import { resolveReportPeriod } from "@/lib/reportPeriod";
import type { Period } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManualPeriodKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";

const VALID_KEYS: ManualPeriodKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
];

function resolveManualPeriod(
  key: ManualPeriodKey
): { period: Period; label: string } {
  const now = new Date();

  // Helper to clone date cleanly
  const start = new Date(now);
  const end = new Date(now);

  switch (key) {
    case "today": {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        period: { from: start, to: end },
        label: "Bugun (kunlik hisobot)",
      };
    }

    case "yesterday": {
      // reuse existing logic for "daily" which is yesterday
      return resolveReportPeriod("daily");
    }

    case "thisWeek": {
      // Monday of current week → Sunday of current week
      const day = now.getDay(); // 0-6 (Sun=0)
      const diffToMonday = (day + 6) % 7; // 0 for Mon, 1 for Tue, ...
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return {
        period: { from: start, to: end },
        label: "Joriy hafta (dushanba-yakshanba)",
      };
    }

    case "lastWeek": {
      // reuse existing "weekly" (last full week)
      return resolveReportPeriod("weekly");
    }

    case "thisMonth": {
      // first → last day of current month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(start.getMonth() + 1);
      end.setDate(0); // last day of current month
      end.setHours(23, 59, 59, 999);

      return {
        period: { from: start, to: end },
        label: "Joriy oy (oylik hisobot)",
      };
    }

    case "lastMonth": {
      // reuse existing "monthly" (previous month)
      return resolveReportPeriod("monthly");
    }

    default: {
      // fallback – yesterday
      return resolveReportPeriod("daily");
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || !body.chatId || !body.periodKey) {
      return NextResponse.json(
        { ok: false, error: "chatId and periodKey are required" },
        { status: 400 }
      );
    }

    const chatIdRaw = body.chatId;
    const periodKey: ManualPeriodKey = body.periodKey;

    if (!VALID_KEYS.includes(periodKey)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid periodKey. Allowed: today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth",
        },
        { status: 400 }
      );
    }

    const chatIdBigInt = BigInt(String(chatIdRaw));

    const user = await prisma.telegramUser.findUnique({
      where: { chatId: chatIdBigInt },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found for this chatId" },
        { status: 404 }
      );
    }

    const { period, label } = resolveManualPeriod(periodKey);
    const pdfBytes = await generateDashboardPdf(period, label);

    const caption = `Najot Nur sotuv hisobot (${label})`;

    await sendTelegramPdf(chatIdBigInt, pdfBytes, caption);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[reports/manual] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}