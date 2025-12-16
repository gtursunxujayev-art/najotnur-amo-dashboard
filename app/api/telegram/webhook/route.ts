// app/api/telegram/webhook/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCasosiyData, CasosiyRow } from "@/lib/casosiySheets";
import { recordButtonClick } from "@/lib/leadNotifications";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const MANAGERS = [
  "Madina",
  "Zilola",
  "Sabrina",
  "Oyshaxon",
  "Marg'uba",
  "Mumtoza",
  "Matluba",
  "Mohinur",
  "sabina",
  "Gulchehra",
  "Orzugul",
];

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
    console.log("[telegram] Fetching course types directly from Google Sheets...");
    
    // Fetch all data without date filtering
    const fromDate = new Date("2025-01-01");
    const toDate = new Date("2099-12-31");
    
    const allData = await getCasosiyData(fromDate, toDate);
    
    // Get unique course types
    const courseTypes = Array.from(new Set(allData.map(r => r.courseType))).sort();
    
    console.log(`[telegram] Found ${courseTypes.length} course types:`, courseTypes);
    return courseTypes;
  } catch (error) {
    console.error("[telegram] Error fetching course types:", error);
    return [];
  }
}

async function getCourseData(courseType: string) {
  try {
    console.log(`[telegram] Fetching course data for "${courseType}" directly from Google Sheets...`);
    
    // Fetch all data without date filtering
    const fromDate = new Date("2025-01-01");
    const toDate = new Date("2099-12-31");
    
    const allData = await getCasosiyData(fromDate, toDate);
    
    // Filter by course type
    const data = allData.filter(r => r.courseType === courseType);
    
    // Calculate KPIs for selected course type
    let tushum = 0, qarzdorlik = 0, kelishuv = 0;
    const tarifCounts = new Map<string, number>();

    for (const row of data) {
      tushum += row.paymentSum;
      qarzdorlik += row.debtSum;
      kelishuv += row.kelishuv;
      
      const tarif = row.paymentType || "Unknown";
      tarifCounts.set(tarif, (tarifCounts.get(tarif) || 0) + 1);
    }

    console.log(`[telegram] Found ${data.length} records for course type: ${courseType}`);

    return {
      totalRecords: data.length,
      kpi: {
        tushum,
        qarzdorlik,
        kelishuv,
      },
      tarifCounts: Object.fromEntries(tarifCounts),
    };
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
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "🔄 Qayta urinish",
            callback_data: "refresh_courses",
          },
        ],
      ],
    };
    if (messageId) {
      await editTelegramMessage(chatId, messageId, text, replyMarkup);
    } else {
      await sendTelegramText(chatId, text, replyMarkup);
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

  const totalStudents = Object.values(tarifCounts).reduce(
    (sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0),
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

async function handleNotificationSettings(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: chatIdBigInt },
  });

  const isEnabled = user?.leadNotifications ?? false;
  const managers = user?.notifyManagers ?? [];
  const startTime = user?.notifyStartTime;
  const endTime = user?.notifyEndTime;

  let statusText = isEnabled ? "✅ Yoqilgan" : "❌ O'chirilgan";
  let managerText = managers.length === 0 ? "Barcha menejerlar" : managers.join(", ");
  let hoursText = !startTime || !endTime ? "24/7 (to'xtovsiz)" : `${startTime} - ${endTime}`;

  const text = `<b>🔔 Lid bildirishnomalari sozlamalari</b>\n\n` +
    `<b>Holat:</b> ${statusText}\n` +
    `<b>Menejerlar:</b> ${managerText}\n` +
    `<b>Vaqt:</b> ${hoursText}`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: isEnabled ? "🔕 O'chirish" : "🔔 Yoqish", callback_data: "notif_toggle" }],
      [{ text: "👥 Menejerlarni tanlash", callback_data: "notif_managers" }],
      [{ text: "⏰ Vaqtni sozlash", callback_data: "notif_hours" }],
    ],
  };

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, replyMarkup);
  } else {
    await sendTelegramText(chatId, text, replyMarkup);
  }
}

async function handleNotificationToggle(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: chatIdBigInt },
  });

  const newValue = !(user?.leadNotifications ?? false);

  await prisma.telegramUser.update({
    where: { chatId: chatIdBigInt },
    data: { leadNotifications: newValue },
  });

  await handleNotificationSettings(chatId, messageId);
}

async function handleManagerSelection(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: chatIdBigInt },
  });

  const selectedManagers = user?.notifyManagers ?? [];

  const managerButtons = MANAGERS.map((manager) => {
    const isSelected = selectedManagers.includes(manager);
    return [{
      text: `${isSelected ? "✅" : "⬜️"} ${manager}`,
      callback_data: `notif_mgr_${manager}`,
    }];
  });

  const replyMarkup = {
    inline_keyboard: [
      ...managerButtons,
      [{ text: "🔄 Barchasini tanlash", callback_data: "notif_mgr_all" }],
      [{ text: "◀️ Orqaga", callback_data: "notif_back" }],
    ],
  };

  const text = `<b>👥 Qaysi menejerlar lidlari haqida xabar olmoqchisiz?</b>\n\n` +
    `Tanlangan: ${selectedManagers.length === 0 ? "Barcha menejerlar" : selectedManagers.join(", ")}`;

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, replyMarkup);
  } else {
    await sendTelegramText(chatId, text, replyMarkup);
  }
}

async function toggleManagerFilter(
  chatId: number | bigint | string,
  manager: string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: chatIdBigInt },
  });

  let managers = user?.notifyManagers ?? [];
  
  if (managers.includes(manager)) {
    managers = managers.filter((m) => m !== manager);
  } else {
    managers = [...managers, manager];
  }

  await prisma.telegramUser.update({
    where: { chatId: chatIdBigInt },
    data: { notifyManagers: managers },
  });

  await handleManagerSelection(chatId, messageId);
}

async function clearManagerFilter(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));

  await prisma.telegramUser.update({
    where: { chatId: chatIdBigInt },
    data: { notifyManagers: [] },
  });

  await handleManagerSelection(chatId, messageId);
}

async function handleHoursSelection(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));
  const user = await prisma.telegramUser.findUnique({
    where: { chatId: chatIdBigInt },
  });

  const startTime = user?.notifyStartTime;
  const endTime = user?.notifyEndTime;
  const currentSetting = !startTime || !endTime ? "24/7" : `${startTime} - ${endTime}`;

  const text = `<b>⏰ Bildirishnomalar vaqti</b>\n\n` +
    `Hozirgi sozlama: <b>${currentSetting}</b>\n\n` +
    `Ish vaqtidan tashqarida kelgan lidlar keyingi ish kuni boshida yuboriladi.`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🕘 09:00 - 18:00", callback_data: "notif_hours_9_18" }],
      [{ text: "🕗 08:00 - 20:00", callback_data: "notif_hours_8_20" }],
      [{ text: "🔄 24/7 (to'xtovsiz)", callback_data: "notif_hours_nonstop" }],
      [{ text: "◀️ Orqaga", callback_data: "notif_back" }],
    ],
  };

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, replyMarkup);
  } else {
    await sendTelegramText(chatId, text, replyMarkup);
  }
}

async function setNonStopHours(
  chatId: number | bigint | string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));

  await prisma.telegramUser.update({
    where: { chatId: chatIdBigInt },
    data: { notifyStartTime: null, notifyEndTime: null },
  });

  await handleNotificationSettings(chatId, messageId);
}

async function setWorkingHours(
  chatId: number | bigint | string,
  startTime: string,
  endTime: string,
  messageId?: number
) {
  const chatIdBigInt = BigInt(String(chatId));

  await prisma.telegramUser.update({
    where: { chatId: chatIdBigInt },
    data: { notifyStartTime: startTime, notifyEndTime: endTime },
  });

  await handleNotificationSettings(chatId, messageId);
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
          "Assalomu alaykum. Najot Nur sotuv bo'limi hisobotlarini sizga kunlik taqdim etaman\n\n" +
          "/courses - O'quv kurslar ma'lumotini ko'rish\n" +
          "/notifications - Yangi lid bildirishnomalari sozlamalari\n" +
          "/help - Yordam";
        await sendTelegramText(chatId, reply);
      } else if (/^\/courses\b/i.test(text)) {
        await handleCourseListCommand(chatId);
      } else if (/^\/notifications\b/i.test(text)) {
        await handleNotificationSettings(chatId);
      } else if (/^\/help\b/i.test(text)) {
        const helpText = `<b>O'quv Kurslar Bot</b>\n\nBunaqa buyruqlardan foydalaning:\n/courses - O'quv kurslarni ko'rish\n/notifications - Lid bildirishnomalari\n/help - Bu xabar`;
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
      } else if (callbackData.startsWith("lead_open_")) {
        const notificationId = callbackData.substring(10);
        const chatIdBigInt = BigInt(String(chatId));
        const user = await prisma.telegramUser.findUnique({
          where: { chatId: chatIdBigInt },
        });
        if (user) {
          await recordButtonClick(notificationId, user.id);
        }
      } else if (callbackData === "notif_toggle") {
        await handleNotificationToggle(chatId, messageId);
      } else if (callbackData === "notif_managers") {
        await handleManagerSelection(chatId, messageId);
      } else if (callbackData.startsWith("notif_mgr_")) {
        const manager = callbackData.substring(10);
        await toggleManagerFilter(chatId, manager, messageId);
      } else if (callbackData === "notif_mgr_all") {
        await clearManagerFilter(chatId, messageId);
      } else if (callbackData === "notif_hours") {
        await handleHoursSelection(chatId, messageId);
      } else if (callbackData === "notif_hours_nonstop") {
        await setNonStopHours(chatId, messageId);
      } else if (callbackData === "notif_hours_9_18") {
        await setWorkingHours(chatId, "09:00", "18:00", messageId);
      } else if (callbackData === "notif_hours_8_20") {
        await setWorkingHours(chatId, "08:00", "20:00", messageId);
      } else if (callbackData === "notif_back") {
        await handleNotificationSettings(chatId, messageId);
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
