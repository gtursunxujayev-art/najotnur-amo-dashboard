import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/baseUrl";

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

interface ReassignedLeadData {
  leadId: number;
  leadName: string;
  phone?: string;
  source?: string;
  newManager: string;
  oldManager: string;
  pipeline: string;
  pipelineId: number;
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

  const baseUrl = getBaseUrl();
  console.log(
    `[LeadNotifications] URL resolution: PRODUCTION_BASE_URL=${process.env.PRODUCTION_BASE_URL || "not set"}, VERCEL_URL=${process.env.VERCEL_URL || "not set"}, REPLIT_DOMAINS=${process.env.REPLIT_DOMAINS || "not set"}, REPLIT_DEV_DOMAIN=${process.env.REPLIT_DEV_DOMAIN || "not set"}, using baseUrl=${baseUrl}`
  );
  
  const clickUrl = `${baseUrl}/api/lead-click/${notificationId}/${chatId}`;

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
          url: clickUrl,
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

  // Check if this NEW lead was already notified in the last 30 minutes (prevents duplicates from dev/prod webhooks)
  // Use a serializable transaction to prevent race conditions between concurrent webhook requests
  // NOTE: We check by eventType="new" so reassigned notifications don't block new lead notifications
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const txStart = Date.now();
  let notification;
  try {
    notification = await prisma.$transaction(async (tx) => {
      // Check for existing "new" notification for this lead within time window
      const existingNotification = await tx.leadNotification.findFirst({
        where: {
          leadId: lead.leadId,
          eventType: 'new',
          sentAt: {
            gte: thirtyMinutesAgo,
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      if (existingNotification) {
        console.log(
          `[LeadNotifications] Skipping new lead ${lead.leadId} - already notified at ${existingNotification.sentAt.toISOString()} (${Math.round((Date.now() - existingNotification.sentAt.getTime()) / 1000)}s ago)`
        );
        return null;
      }

      // Create the notification record within the same transaction
      const newNotification = await tx.leadNotification.create({
        data: {
          leadId: lead.leadId,
          leadName: lead.leadName,
          phone: lead.phone,
          source: lead.source,
          manager: lead.manager,
          pipeline: lead.pipeline,
          pipelineId: lead.pipelineId,
          eventType: 'new',
          isQueued: false,
        },
      });
      
      console.log(`[LeadNotifications] Created notification record ${newNotification.id} for new lead ${lead.leadId}`);
      return newNotification;
    }, {
      isolationLevel: 'Serializable', // Serializable prevents race conditions; short transaction so minimal performance impact
    });
    console.log(`[LeadNotifications] Transaction completed in ${Date.now() - txStart}ms`);
  } catch (error: any) {
    // Handle serialization failure (concurrent transaction conflict)
    if (error.code === 'P2034' || error.message?.includes('serialization')) {
      console.log(`[LeadNotifications] New lead ${lead.leadId} - concurrent request handled, skipping`);
      return;
    }
    throw error;
  }
  
  if (!notification) {
    return; // Already notified, skip sending
  }

  const usersStart = Date.now();
  const users = await prisma.telegramUser.findMany({
    where: {
      leadNotifications: true,
    },
  });

  console.log(
    `[LeadNotifications] Found ${users.length} users with lead notifications enabled (query: ${Date.now() - usersStart}ms)`
  );

  const managerLower = lead.manager.toLowerCase();
  const sendStart = Date.now();
  
  // Process users in parallel for faster notifications (using Promise.allSettled for fault tolerance)
  const sendPromises: Promise<{ userId: number; type: 'send' | 'queue'; success: boolean }>[] = [];
  
  for (const user of users) {
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
      sendPromises.push(
        prisma.notificationQueue.create({
          data: {
            userId: user.id,
            notificationId: notification.id,
            leadId: lead.leadId,
            leadName: lead.leadName,
            phone: lead.phone,
            source: lead.source,
            manager: lead.manager,
            pipeline: lead.pipeline,
            pipelineId: lead.pipelineId,
            eventType: 'new',
            scheduledFor: getNextMorningAt905(),
            sent: false,
          },
        })
        .then(() => ({ userId: user.id, type: 'queue' as const, success: true }))
        .catch((err) => {
          console.error(`[LeadNotifications] Failed to queue for user ${user.id}:`, err);
          return { userId: user.id, type: 'queue' as const, success: false };
        })
      );
      continue;
    }

    // Send notifications in parallel with error handling
    sendPromises.push(
      sendTelegramNotification(user.chatId, lead, notification.id)
        .then((success) => ({ userId: user.id, type: 'send' as const, success }))
        .catch((err) => {
          console.error(`[LeadNotifications] Failed to send to user ${user.id}:`, err);
          return { userId: user.id, type: 'send' as const, success: false };
        })
    );
  }

  // Wait for all notifications to be sent/queued in parallel (fault-tolerant)
  const results = await Promise.all(sendPromises);
  const sends = results.filter(r => r.type === 'send');
  const queues = results.filter(r => r.type === 'queue');
  const successSends = sends.filter(r => r.success).length;
  const successQueues = queues.filter(r => r.success).length;
  
  console.log(`[LeadNotifications] Completed ${successSends}/${sends.length} sends + ${successQueues}/${queues.length} queues in ${Date.now() - sendStart}ms (total: ${Date.now() - txStart}ms)`);
}

export async function sendReassignedTelegramNotification(
  chatId: bigint | number,
  lead: ReassignedLeadData,
  notificationId: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[LeadNotifications] Missing TELEGRAM_BOT_TOKEN");
    return false;
  }

  const baseUrl = getBaseUrl();
  console.log(
    `[LeadNotifications] URL resolution (reassigned): PRODUCTION_BASE_URL=${process.env.PRODUCTION_BASE_URL || "not set"}, VERCEL_URL=${process.env.VERCEL_URL || "not set"}, REPLIT_DOMAINS=${process.env.REPLIT_DOMAINS || "not set"}, REPLIT_DEV_DOMAIN=${process.env.REPLIT_DEV_DOMAIN || "not set"}, using baseUrl=${baseUrl}`
  );
  
  const clickUrl = `${baseUrl}/api/lead-click/${notificationId}/${chatId}`;

  let message = `🔄 <b>Lid sizga o'tkazildi!</b>\n\n`;
  message += `👤 <b>Ismi:</b> ${lead.leadName}\n`;
  if (lead.phone) {
    message += `📞 <b>Telefon:</b> ${lead.phone}\n`;
  }
  if (lead.source) {
    message += `📍 <b>Qayerdan:</b> ${lead.source}\n`;
  }
  message += `👨‍💼 <b>Yangi menejer:</b> ${lead.newManager}\n`;
  message += `👤 <b>Oldingi menejer:</b> ${lead.oldManager}\n`;
  message += `📊 <b>Voronka:</b> ${lead.pipeline}\n`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "📋 CRM da ochish",
          url: clickUrl,
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
        `[LeadNotifications] Failed to send reassigned notification to ${chatId}:`,
        res.status,
        body
      );
      return false;
    }

    console.log(`[LeadNotifications] Sent reassigned notification to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[LeadNotifications] Error sending reassigned notification to ${chatId}:`, error);
    return false;
  }
}

export async function notifyUsersAboutReassignedLead(lead: ReassignedLeadData): Promise<void> {
  console.log(
    `[LeadNotifications] Processing reassigned lead ${lead.leadId} - ${lead.leadName} (${lead.oldManager} → ${lead.newManager})`
  );

  // Check if this REASSIGNED lead was already notified in the last 30 minutes (prevents duplicates from dev/prod webhooks)
  // NOTE: We include the newManager in the check - allows notifications if reassigned to DIFFERENT managers
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  const txStart = Date.now();
  let notification;
  try {
    notification = await prisma.$transaction(async (tx) => {
      // Check for existing "reassigned" notification for this lead to the SAME manager within time window
      const existingNotification = await tx.leadNotification.findFirst({
        where: {
          leadId: lead.leadId,
          eventType: 'reassigned',
          manager: lead.newManager, // Allow if reassigned to different manager
          sentAt: {
            gte: thirtyMinutesAgo,
          },
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      if (existingNotification) {
        console.log(
          `[LeadNotifications] Skipping reassigned lead ${lead.leadId} to ${lead.newManager} - already notified at ${existingNotification.sentAt.toISOString()} (${Math.round((Date.now() - existingNotification.sentAt.getTime()) / 1000)}s ago)`
        );
        return null;
      }

      // Create the notification record within the same transaction
      const newNotification = await tx.leadNotification.create({
        data: {
          leadId: lead.leadId,
          leadName: lead.leadName,
          phone: lead.phone,
          source: lead.source,
          manager: lead.newManager,
          pipeline: lead.pipeline,
          pipelineId: lead.pipelineId,
          eventType: 'reassigned',
          isQueued: false,
        },
      });
      
      console.log(`[LeadNotifications] Created notification record ${newNotification.id} for reassigned lead ${lead.leadId}`);
      return newNotification;
    }, {
      isolationLevel: 'Serializable', // Serializable prevents race conditions; short transaction so minimal performance impact
    });
    console.log(`[LeadNotifications] Reassigned transaction completed in ${Date.now() - txStart}ms`);
  } catch (error: any) {
    // Handle serialization failure (concurrent transaction conflict)
    if (error.code === 'P2034' || error.message?.includes('serialization')) {
      console.log(`[LeadNotifications] Reassigned lead ${lead.leadId} - concurrent request handled, skipping`);
      return;
    }
    throw error;
  }
  
  if (!notification) {
    return; // Already notified, skip sending
  }

  const usersStart = Date.now();
  const users = await prisma.telegramUser.findMany({
    where: {
      leadNotifications: true,
    },
  });

  console.log(
    `[LeadNotifications] Found ${users.length} users with lead notifications enabled (query: ${Date.now() - usersStart}ms)`
  );

  const newManagerLower = lead.newManager.toLowerCase();
  const sendStart = Date.now();
  
  // Process users in parallel for faster notifications (using error handling for fault tolerance)
  const sendPromises: Promise<{ userId: number; type: 'send' | 'queue'; success: boolean }>[] = [];
  
  for (const user of users) {
    const userManagersLower = (user.notifyManagers || []).map(m => m.toLowerCase());
    
    if (
      userManagersLower.length > 0 &&
      !userManagersLower.includes(newManagerLower)
    ) {
      console.log(
        `[LeadNotifications] Skipping user ${user.id} for reassigned lead - manager filter: ${user.notifyManagers.join(", ")}`
      );
      continue;
    }

    const withinHours = isWithinWorkingHours(
      user.notifyStartTime,
      user.notifyEndTime
    );

    if (!withinHours) {
      console.log(
        `[LeadNotifications] Queueing reassigned lead for user ${user.id} - outside working hours`
      );
      sendPromises.push(
        prisma.notificationQueue.create({
          data: {
            userId: user.id,
            notificationId: notification.id,
            leadId: lead.leadId,
            leadName: lead.leadName,
            phone: lead.phone,
            source: lead.source,
            manager: lead.newManager,
            oldManager: lead.oldManager,
            pipeline: lead.pipeline,
            pipelineId: lead.pipelineId,
            eventType: "reassigned",
            scheduledFor: getNextMorningAt905(),
            sent: false,
          },
        })
        .then(() => ({ userId: user.id, type: 'queue' as const, success: true }))
        .catch((err) => {
          console.error(`[LeadNotifications] Failed to queue reassigned for user ${user.id}:`, err);
          return { userId: user.id, type: 'queue' as const, success: false };
        })
      );
      continue;
    }

    // Send notifications in parallel with error handling
    sendPromises.push(
      sendReassignedTelegramNotification(user.chatId, lead, notification.id)
        .then((success) => ({ userId: user.id, type: 'send' as const, success }))
        .catch((err) => {
          console.error(`[LeadNotifications] Failed to send reassigned to user ${user.id}:`, err);
          return { userId: user.id, type: 'send' as const, success: false };
        })
    );
  }

  // Wait for all notifications to be sent/queued in parallel (fault-tolerant)
  const results = await Promise.all(sendPromises);
  const sends = results.filter(r => r.type === 'send');
  const queues = results.filter(r => r.type === 'queue');
  const successSends = sends.filter(r => r.success).length;
  const successQueues = queues.filter(r => r.success).length;
  
  console.log(`[LeadNotifications] Reassigned: completed ${successSends}/${sends.length} sends + ${successQueues}/${queues.length} queues in ${Date.now() - sendStart}ms (total: ${Date.now() - txStart}ms)`);
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

    // Use existing notification ID if available (new flow), otherwise create new one (legacy queue items)
    let notificationId = item.notificationId;
    if (notificationId) {
      // Update sentAt to now (dispatch time) so response-time metrics are accurate
      await prisma.leadNotification.update({
        where: { id: notificationId },
        data: { 
          sentAt: new Date(),
          isQueued: false,
        },
      });
    } else {
      // Legacy queue items without notificationId - create a new LeadNotification
      const notification = await prisma.leadNotification.create({
        data: {
          leadId: item.leadId,
          leadName: item.leadName,
          phone: item.phone,
          source: item.source,
          manager: item.manager,
          pipeline: item.pipeline,
          pipelineId: item.pipelineId,
          eventType: item.eventType,
          isQueued: false,
        },
      });
      notificationId = notification.id;
    }

    let success = false;

    if (item.eventType === "reassigned" && item.oldManager) {
      const reassignedLead: ReassignedLeadData = {
        leadId: item.leadId,
        leadName: item.leadName,
        phone: item.phone ?? undefined,
        source: item.source ?? undefined,
        newManager: item.manager,
        oldManager: item.oldManager,
        pipeline: item.pipeline,
        pipelineId: item.pipelineId,
      };

      success = await sendReassignedTelegramNotification(
        user.chatId,
        reassignedLead,
        notificationId
      );
    } else {
      const lead: LeadData = {
        leadId: item.leadId,
        leadName: item.leadName,
        phone: item.phone ?? undefined,
        source: item.source ?? undefined,
        manager: item.manager,
        pipeline: item.pipeline,
        pipelineId: item.pipelineId,
      };

      success = await sendTelegramNotification(
        user.chatId,
        lead,
        notificationId
      );
    }

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
