// app/api/telegram/webhook/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DOMAIN = process.env.REPLIT_DOMAIN || "localhost:5000";

async function sendTelegramText(
  chatId: number | bigint | string,
  text: string,
  replyMarkup?: any
) {
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
      parse_mode: "HTML",
      reply_markup: replyMarkup,
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

async function editTelegramMessage(
  chatId: number | bigint | string,
  messageId: number,
  text: string,
  replyMarkup?: any
) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[telegram webhook] TELEGRAM_BOT_TOKEN is missing");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: String(chatId),
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  });

  const body = await res.text().catch(() => "");
  console.log(
    "[telegram webhook] editMessageText result",
    res.status,
    res.statusText,
    body
  );
}

async function getCourseTypes(): Promise<string[]> {
  try {
    const url =
      process.env.NODE_ENV === "production"
        ? `https://${DOMAIN}/api/casosiy?types=true`
        : `http://localhost:5000/api/casosiy?types=true`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    return data.data?.courseTypes || [];
  } catch (error) {
    console.error("[telegram] Error fetching course types:", error);
    return [];
  }
}

async function getCourseData(courseType: string) {
  try {
    const url =
      process.env.NODE_ENV === "production"
        ? `https://${DOMAIN}/api/casosiy?courseType=${encodeURIComponent(
            courseType
          )}`
        : `http://localhost:5000/api/casosiy?courseType=${encodeURIComponent(
            courseType
          )}`;

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("[telegram] Error fetching course data:", error);
    return null;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

async function handleCourseListCommand(
  chatId: number | bigint | string,
  messageId?: number
) {
  const courses = await getCourseTypes();

  if (courses.length === 0) {
    const text = "❌ Kurslar topilmadi";
    if (messageId) {
      await editTelegramMessage(chatId, messageId, text);
    } else {
      await sendTelegramText(chatId, text);
    }
    return;
  }

  const buttons = courses.map((course: string) => [
    {
      text: course,
      callback_data: `course_${course}`,
    },
  ]);

  const replyMarkup = {
    inline_keyboard: buttons,
  };

  const text = "📚 <b>O'quv Kurslarni Tanlang:</b>";

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, replyMarkup);
  } else {
    await sendTelegramText(chatId, text, replyMarkup);
  }
}

async function handleCourseInfoCommand(
  chatId: number | bigint | string,
  courseType: string,
  messageId?: number
) {
  const courseData = await getCourseData(courseType);

  if (!courseData || !courseData.kpi) {
    const text = `❌ "${courseType}" kursi uchun ma'lumot topilmadi`;
    if (messageId) {
      await editTelegramMessage(chatId, messageId, text);
    } else {
      await sendTelegramText(chatId, text);
    }
    return;
  }

  const kpi = courseData.kpi;
  const tarifCounts = courseData.tarifCounts || {};

  let text = `<b>📚 ${courseType}</b>\n\n`;
  text += `<b>💰 KPI Ma'lumotlar:</b>\n`;
  text += `🤝 <b>Kelishuv Summasi:</b> <code>${formatCurrency(
    kpi.kelishuv
  )}</code> so'm\n`;
  text += `✅ <b>Tushum:</b> <code>${formatCurrency(kpi.tushum)}</code> so'm\n`;
  text += `⚠️ <b>Qarzdorlik:</b> <code>${formatCurrency(
    kpi.qarzdorlik
  )}</code> so'm\n\n`;

  const totalStudents = (Object.values(tarifCounts) as number[]).reduce(
    (sum: number, count: number) => sum + count,
    0
  );
  text += `<b>👥 O'quvchilar:</b> <code>${totalStudents}</code>\n\n`;

  if (Object.keys(tarifCounts).length > 0) {
    text += `<b>📊 Tariff Turi Bo'yicha:</b>\n`;
    for (const [tarif, count] of Object.entries(tarifCounts)) {
      text += `  ${tarif}: <code>${count}</code>\n`;
    }
  }

  const backButton = {
    inline_keyboard: [
      [
        {
          text: "◀️ Orqaga",
          callback_data: "back_to_courses",
        },
      ],
    ],
  };

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, backButton);
  } else {
    await sendTelegramText(chatId, text, backButton);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => null);
    console.log("[telegram webhook] incoming update:", JSON.stringify(update));

    // Handle text messages
    const msg = update?.message;
    if (msg && msg.chat && msg.chat.id != null) {
      const chatId = msg.chat.id;
      const chatIdBigInt = BigInt(String(chatId));
      const text: string = (msg.text || "").trim();
      const from = msg.from || {};

      // Handle commands
      if (/^\/start\b/i.test(text)) {
        const reply =
          "Assalomu alaykum. Najot Nur sotuv bo'limi hisobotlarini sizga kunlik taqdim etaman\n\n/courses - O'quv kurslar ma'lumotini ko'rish\n/help - Yordam";
        await sendTelegramText(chatId, reply);
      } else if (/^\/courses\b/i.test(text)) {
        await handleCourseListCommand(chatId);
      } else if (/^\/help\b/i.test(text)) {
        const helpText = `<b>O'quv Kurslar Bot</b>\n\nBunaqa buyruqlardan foydalaning:\n/courses - O'quv kurslarni ko'rish\n/help - Bu xabar`;
        await sendTelegramText(chatId, helpText);
      }

      // Save user in DB
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
    }

    // Handle callback queries (button clicks)
    const callbackQuery = update?.callback_query;
    if (callbackQuery) {
      const callbackData = callbackQuery.data || "";
      const chatId = callbackQuery.message?.chat.id || 0;
      const messageId = callbackQuery.message?.message_id || 0;

      if (callbackData === "back_to_courses") {
        await handleCourseListCommand(chatId, messageId);
      } else if (callbackData.startsWith("course_")) {
        const courseType = callbackData.substring(7);
        await handleCourseInfoCommand(chatId, courseType, messageId);
      }

      // Answer callback query to remove loading state
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQuery.id }),
          }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram webhook] fatal error:", err);
    return NextResponse.json({ ok: true });
  }
}
