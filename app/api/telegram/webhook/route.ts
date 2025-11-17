// app/api/telegram/webhook/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramText(chatId: number | bigint, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[telegram webhook] TELEGRAM_BOT_TOKEN is missing");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: String(chatId),
      text,
    }),
  }).catch((err) => {
    console.error("[telegram webhook] sendMessage error", err);
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);
    const msg = update?.message;

    if (!msg) {
      return NextResponse.json({ ok: true });
    }

    const chat = msg.chat;
    const text: string = (msg.text || "").trim();

    if (!chat || !chat.id) {
      return NextResponse.json({ ok: true });
    }

    const chatIdBigInt = BigInt(chat.id);

    // Upsert telegram user into DB
    const from = msg.from || {};
    await prisma.telegramUser.upsert({
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

    // Handle /start command
    if (/^\/start\b/i.test(text)) {
      const reply =
        "Assalomu alaykum. Najot Nur sotuv bo'limi hisobotlarini sizga kunlik taqdim etaman";
      await sendTelegramText(chatIdBigInt, reply);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram webhook] error", err);
    // Always answer 200 so Telegram doesn’t see 500
    return NextResponse.json({ ok: true });
  }
}
