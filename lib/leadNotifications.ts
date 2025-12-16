import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIMEZONE_OFFSET = 5; // GMT+5

interface LeadData {
  leadId: number;
  leadName: string;
  phone?: string;
  source?: string;
  manager: string;
  pipeline: string;
  pipelineId: number;
  createdAt?: number;
}

function getCurrentTimeInGMT5(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + TIMEZONE_OFFSET * 3600000);
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

function isWithinWorkingHours(
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) {
    return true;
  }

  const now = getCurrentTimeInGMT5();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function getNextMorningAt905(): Date {
  const nowGMT5 = getCurrentTimeInGMT5();
  const target = new Date(nowGMT5);
  target.setHours(9, 5, 0, 0);
  
  if (nowGMT5 >= target) {
    target.setDate(target.getDate() + 1);
  }

  const utc =
    target.getTime() -
    target.getTimezoneOffset() * 60000 -
    TIMEZONE_OFFSET * 3600000;
  return new Date(utc);
}

export async function sendTelegramNotification(
  chatId: bigint | number,
  lead: LeadData,
  notificationId: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[LeadNotifications] Missing TELEGRAM_BOT_TOKEN");
    return false;
  }

  const leadUrl = `https://najotnur01.amocrm.ru/leads/detail/${lead.leadId}`;

  let createdTimeStr = "";
  if (lead.createdAt) {
    const createdDate = new Date(lead.createdAt * 1000);
    const gmt5Date = new Date(createdDate.getTime() + TIMEZONE_OFFSET * 3600000);
    createdTimeStr = gmt5Date.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  let message = `🆕 <b>Yangi lid!</b>\n\n`;
  message += `👤 <b>Ismi:</b> ${lead.leadName}\n`;
  if (lead.phone) {
    message += `📞 <b>Telefon:</b> ${lead.phone}\n`;
  }
  if (lead.source) {
    message += `📍 <b>Qayerdan:</b> ${lead.source}\n`;
  }
  message += `👨‍💼 <b>Menejer:</b> ${lead.manager}\n`;
  message += `📊 <b>Voronka:</b> ${lead.pipeline}\n`;
  if (createdTimeStr) {
    message += `🕐 <b>Yaratilgan:</b> ${createdTimeStr}\n`;
  }

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📋 CRM da ochish",
          url: leadUrl,
        },
      ],
      [
        {
          text: "✅ Ko'rdim",
          callback_data: `lead_resp_${notificationId}`,
        },
      ],
    ],
  };

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(
        `[LeadNotifications] Failed to send to ${chatId}:`,
        res.status,
        body
      );
      return false;
    }

    console.log(`[LeadNotifications] Sent notification to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[LeadNotifications] Error sending to ${chatId}:`, error);
    return false;
  }
}

export async function notifyUsersAboutLead(lead: LeadData): Promise<void> {
  console.log(
    `[LeadNotifications] Processing lead ${lead.leadId} - ${lead.leadName}`
  );

  const notification = await prisma.leadNotification.create({
    data: {
      leadId: lead.leadId,
      leadName: lead.leadName,
      phone: lead.phone,
      source: lead.source,
      manager: lead.manager,
      pipeline: lead.pipeline,
      pipelineId: lead.pipelineId,
      isQueued: false,
    },
  });

  const users = await prisma.telegramUser.findMany({
    where: {
      leadNotifications: true,
    },
  });

  console.log(
    `[LeadNotifications] Found ${users.length} users with lead notifications enabled`
  );

  for (const user of users) {
    const managerLower = lead.manager.toLowerCase();
    const userManagersLower = (user.notifyManagers || []).map(m => m.toLowerCase());
    
    if (
      userManagersLower.length > 0 &&
      !userManagersLower.includes(managerLower)
    ) {
      console.log(
        `[LeadNotifications] Skipping user ${user.id} - manager filter: ${user.notifyManagers.join(", ")}`
      );
      continue;
    }

    const withinHours = isWithinWorkingHours(
      user.notifyStartTime,
      user.notifyEndTime
    );

    if (!withinHours) {
      console.log(
        `[LeadNotifications] Queueing for user ${user.id} - outside working hours`
      );
      await prisma.notificationQueue.create({
        data: {
          userId: user.id,
          leadId: lead.leadId,
          leadName: lead.leadName,
          phone: lead.phone,
          source: lead.source,
          manager: lead.manager,
          pipeline: lead.pipeline,
          pipelineId: lead.pipelineId,
          scheduledFor: getNextMorningAt905(),
          sent: false,
        },
      });
      continue;
    }

    await sendTelegramNotification(user.chatId, lead, notification.id);
  }
}

export async function sendQueuedNotifications(): Promise<number> {
  const now = new Date();

  const queuedItems = await prisma.notificationQueue.findMany({
    where: {
      sent: false,
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      // No relation defined, we'll fetch user separately
    },
  });

  console.log(
    `[LeadNotifications] Processing ${queuedItems.length} queued notifications`
  );

  let sentCount = 0;

  for (const item of queuedItems) {
    const user = await prisma.telegramUser.findUnique({
      where: { id: item.userId },
    });

    if (!user) {
      await prisma.notificationQueue.update({
        where: { id: item.id },
        data: { sent: true },
      });
      continue;
    }

    let existingNotification = await prisma.leadNotification.findFirst({
      where: { leadId: item.leadId },
    });

    if (!existingNotification) {
      existingNotification = await prisma.leadNotification.create({
        data: {
          leadId: item.leadId,
          leadName: item.leadName,
          phone: item.phone,
          source: item.source,
          manager: item.manager,
          pipeline: item.pipeline,
          pipelineId: item.pipelineId,
          isQueued: true,
        },
      });
    }

    const lead: LeadData = {
      leadId: item.leadId,
      leadName: item.leadName,
      phone: item.phone ?? undefined,
      source: item.source ?? undefined,
      manager: item.manager,
      pipeline: item.pipeline,
      pipelineId: item.pipelineId,
    };

    const success = await sendTelegramNotification(
      user.chatId,
      lead,
      existingNotification.id
    );

    if (success) {
      sentCount++;
    }

    await prisma.notificationQueue.update({
      where: { id: item.id },
      data: { sent: true },
    });
  }

  console.log(`[LeadNotifications] Sent ${sentCount} queued notifications`);
  return sentCount;
}

export async function recordButtonClick(
  notificationId: string,
  userId: number
): Promise<void> {
  const notification = await prisma.leadNotification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    console.error(
      `[LeadNotifications] Notification ${notificationId} not found`
    );
    return;
  }

  const responseTimeMs = Date.now() - notification.sentAt.getTime();

  try {
    await prisma.leadNotificationResponse.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
        responseTimeMs,
      },
      update: {},
    });

    console.log(
      `[LeadNotifications] Recorded response for user ${userId}, notification ${notificationId}, time: ${responseTimeMs}ms`
    );
  } catch (error) {
    console.error(`[LeadNotifications] Error recording response:`, error);
  }
}

export async function getManagerResponseStats(
  fromDate: Date,
  toDate: Date
): Promise<
  Array<{
    manager: string;
    totalNotifications: number;
    totalResponses: number;
    avgResponseTimeMs: number;
  }>
> {
  const notifications = await prisma.leadNotification.findMany({
    where: {
      sentAt: {
        gte: fromDate,
        lt: toDate,
      },
    },
    include: {
      responses: true,
    },
  });

  const managerStats = new Map<
    string,
    { notifications: number; responses: number; totalResponseTime: number }
  >();

  for (const notification of notifications) {
    const manager = notification.manager;

    if (!managerStats.has(manager)) {
      managerStats.set(manager, {
        notifications: 0,
        responses: 0,
        totalResponseTime: 0,
      });
    }

    const stats = managerStats.get(manager)!;
    stats.notifications++;

    for (const response of notification.responses) {
      stats.responses++;
      stats.totalResponseTime += response.responseTimeMs;
    }
  }

  return Array.from(managerStats.entries()).map(([manager, stats]) => ({
    manager,
    totalNotifications: stats.notifications,
    totalResponses: stats.responses,
    avgResponseTimeMs:
      stats.responses > 0
        ? Math.round(stats.totalResponseTime / stats.responses)
        : 0,
  }));
}
