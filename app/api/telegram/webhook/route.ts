// app/api/telegram/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

async function sendTelegramMessage(chatId: number | bigint, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const message = body.message;
  if (!message || !message.chat) return NextResponse.json({ ok: true });

  const chat = message.chat;
  const chatId: bigint = BigInt(chat.id);

  await prisma.telegramUser.upsert({
    where: { chatId },
    update: {
      username: chat.username ?? null,
      firstName: chat.first_name ?? null,
      lastName: chat.last_name ?? null,
    },
    create: {
      chatId,
      username: chat.username ?? null,
      firstName: chat.first_name ?? null,
      lastName: chat.last_name ?? null,
    },
  });

  const text: string = message.text || "";

  if (text.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      "Salom! Siz Najot Nur dashboard botiga ulan dingiz.\n" +
        "Admin panelida sizni hisobotlar ro'yxatiga qo'shish mumkin."
    );
  }

  return NextResponse.json({ ok: true });
}