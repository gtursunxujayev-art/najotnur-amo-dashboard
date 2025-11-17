// app/api/telegram/webhook/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramText(chatId: number | bigint | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[telegram webhook] TELEGRAM_BOT_TOKEN is missing");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(chatId),
      text,
    }),
  });

  const body = await res.text().catch(() => "");
  console.log(
    "[telegram webhook] sendMessage result",
    res.status,
    res.statusText,
    body
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);
    console.log("[telegram webhook] incoming update:", JSON.stringify(update));

    const msg = update?.message;
    if (!msg || !msg.chat || msg.chat.id == null) {
      return NextResponse.json({ ok: true });
    }

    const chatId = msg.chat.id;
    const chatIdBigInt = BigInt(String(chatId));
    const text: string = (msg.text || "").trim();
    const from = msg.from || {};

    // 1) Always try to send reply for /start FIRST
    if (/^\/start\b/i.test(text)) {
      const reply =
        "Assalomu alaykum. Najot Nur sotuv bo'limi hisobotlarini sizga kunlik taqdim etaman";
      await sendTelegramText(chatId, reply);
    }

    // 2) Then, separately, try to save user in DB (do not break response)
    try {
      const user = await prisma.telegramUser.upsert({
        where: { chatId: chatIdBigInt },
        create: {
          chatId: chatIdBigInt,
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
        },
        update: {
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
        },
      });
      console.log(
        "[telegram webhook] upserted TelegramUser",
        user.id,
        user.chatId.toString()
      );
    } catch (dbErr) {
      console.error("[telegram webhook] prisma upsert error:", dbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram webhook] fatal error:", err);
    // Always 200 so Telegram doesn't retry forever
    return NextResponse.json({ ok: true });
  }
}
