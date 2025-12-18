import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const AMO_BASE_URL = process.env.AMO_BASE_URL;
const AMO_LONG_LIVED_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  duration?: number;
  details?: any;
}

async function testDatabase(): Promise<TestResult> {
  const start = Date.now();
  try {
    const userCount = await prisma.telegramUser.count();
    const notificationCount = await prisma.leadNotification.count();
    const queueCount = await prisma.notificationQueue.count({ where: { sent: false } });
    
    return {
      name: "Database Connection",
      status: "pass",
      message: `Connected successfully`,
      duration: Date.now() - start,
      details: {
        telegramUsers: userCount,
        totalNotifications: notificationCount,
        pendingQueue: queueCount,
      },
    };
  } catch (error: any) {
    return {
      name: "Database Connection",
      status: "fail",
      message: `Failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testTelegramBot(): Promise<TestResult> {
  const start = Date.now();
  
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      name: "Telegram Bot",
      status: "fail",
      message: "TELEGRAM_BOT_TOKEN is not set",
      duration: Date.now() - start,
    };
  }
  
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );
    const data = await res.json();
    
    if (!data.ok) {
      return {
        name: "Telegram Bot",
        status: "fail",
        message: `Invalid bot token: ${data.description}`,
        duration: Date.now() - start,
        details: data,
      };
    }
    
    return {
      name: "Telegram Bot",
      status: "pass",
      message: `Bot active: @${data.result.username}`,
      duration: Date.now() - start,
      details: {
        botId: data.result.id,
        botUsername: data.result.username,
        botName: data.result.first_name,
      },
    };
  } catch (error: any) {
    return {
      name: "Telegram Bot",
      status: "fail",
      message: `Request failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testAmoCRM(): Promise<TestResult> {
  const start = Date.now();
  
  if (!AMO_BASE_URL || !AMO_LONG_LIVED_TOKEN) {
    return {
      name: "amoCRM API",
      status: "fail",
      message: "AMO_INTEGRATION_ID or AMO_LONG_LIVED_TOKEN is not set",
      duration: Date.now() - start,
    };
  }
  
  try {
    const res = await fetch(`${AMO_BASE_URL}/api/v4/account`, {
      headers: {
        Authorization: `Bearer ${AMO_LONG_LIVED_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      const text = await res.text();
      return {
        name: "amoCRM API",
        status: "fail",
        message: `API error ${res.status}: ${text.substring(0, 100)}`,
        duration: Date.now() - start,
      };
    }
    
    const data = await res.json();
    return {
      name: "amoCRM API",
      status: "pass",
      message: `Connected to: ${data.name}`,
      duration: Date.now() - start,
      details: {
        accountId: data.id,
        accountName: data.name,
        subdomain: data.subdomain,
      },
    };
  } catch (error: any) {
    return {
      name: "amoCRM API",
      status: "fail",
      message: `Request failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testNotificationUsers(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const users = await prisma.telegramUser.findMany({
      where: { leadNotifications: true },
      select: {
        id: true,
        chatId: true,
        firstName: true,
        notifyManagers: true,
        notifyStartTime: true,
        notifyEndTime: true,
      },
    });
    
    if (users.length === 0) {
      return {
        name: "Notification Users",
        status: "warning",
        message: "No users have notifications enabled",
        duration: Date.now() - start,
      };
    }
    
    return {
      name: "Notification Users",
      status: "pass",
      message: `${users.length} user(s) with notifications enabled`,
      duration: Date.now() - start,
      details: {
        users: users.map(u => ({
          id: u.id,
          name: u.firstName,
          managers: u.notifyManagers,
          workingHours: `${u.notifyStartTime || "00:00"} - ${u.notifyEndTime || "23:59"}`,
        })),
      },
    };
  } catch (error: any) {
    return {
      name: "Notification Users",
      status: "fail",
      message: `Query failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testRecentNotifications(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const recentNotifications = await prisma.leadNotification.findMany({
      orderBy: { sentAt: "desc" },
      take: 5,
      select: {
        id: true,
        leadId: true,
        leadName: true,
        manager: true,
        eventType: true,
        sentAt: true,
        isQueued: true,
      },
    });
    
    const lastNotification = recentNotifications[0];
    const timeSinceLast = lastNotification
      ? Math.round((Date.now() - lastNotification.sentAt.getTime()) / 1000 / 60)
      : null;
    
    return {
      name: "Recent Notifications",
      status: "pass",
      message: lastNotification
        ? `Last notification ${timeSinceLast} minutes ago`
        : "No notifications yet",
      duration: Date.now() - start,
      details: {
        lastNotificationMinutesAgo: timeSinceLast,
        recentNotifications: recentNotifications.map(n => ({
          id: n.id,
          leadId: n.leadId,
          leadName: n.leadName,
          manager: n.manager,
          eventType: n.eventType,
          sentAt: n.sentAt.toISOString(),
          isQueued: n.isQueued,
        })),
      },
    };
  } catch (error: any) {
    return {
      name: "Recent Notifications",
      status: "fail",
      message: `Query failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testSendNotification(chatId: string): Promise<TestResult> {
  const start = Date.now();
  
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      name: "Send Test Notification",
      status: "fail",
      message: "TELEGRAM_BOT_TOKEN is not set",
      duration: Date.now() - start,
    };
  }
  
  const testMessage = `🧪 *Test Notification*

This is a test message to verify the notification system is working.

⏱ Sent at: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}

If you received this, the notification system is working correctly!`;
  
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: "Markdown",
        }),
      }
    );
    
    const data = await res.json();
    
    if (!data.ok) {
      return {
        name: "Send Test Notification",
        status: "fail",
        message: `Failed to send: ${data.description}`,
        duration: Date.now() - start,
        details: data,
      };
    }
    
    return {
      name: "Send Test Notification",
      status: "pass",
      message: `Message sent successfully in ${Date.now() - start}ms`,
      duration: Date.now() - start,
      details: {
        messageId: data.result.message_id,
        chatId: data.result.chat.id,
      },
    };
  } catch (error: any) {
    return {
      name: "Send Test Notification",
      status: "fail",
      message: `Request failed: ${error.message}`,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

async function testWebhookUrl(): Promise<TestResult> {
  const start = Date.now();
  
  const { getBaseUrl } = await import("@/lib/baseUrl");
  const webhookUrl = getBaseUrl();
  const source = webhookUrl === (process.env.PRODUCTION_BASE_URL || "").replace(/\/+$/, "")
    ? "PRODUCTION_BASE_URL"
    : process.env.VERCEL_URL
    ? "VERCEL_URL"
    : process.env.REPLIT_DOMAINS
    ? "REPLIT_DOMAINS"
    : process.env.REPLIT_DEV_DOMAIN
    ? "REPLIT_DEV_DOMAIN"
    : "fallback";
  
  if (!webhookUrl) {
    return {
      name: "Webhook URL Configuration",
      status: "warning",
      message: "No production URL configured - webhook buttons may not work",
      duration: Date.now() - start,
    };
  }
  
  return {
    name: "Webhook URL Configuration",
    status: "pass",
    message: `Using ${source}`,
    duration: Date.now() - start,
    details: {
      url: webhookUrl,
      source,
      fullWebhookPath: `${webhookUrl}/api/amocrm/webhook`,
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sendTest = url.searchParams.get("send");
  
  const overallStart = Date.now();
  const results: TestResult[] = [];
  
  const [dbResult, telegramResult, amoResult, usersResult, recentResult, webhookResult] = await Promise.all([
    testDatabase(),
    testTelegramBot(),
    testAmoCRM(),
    testNotificationUsers(),
    testRecentNotifications(),
    testWebhookUrl(),
  ]);
  
  results.push(dbResult, telegramResult, amoResult, usersResult, recentResult, webhookResult);
  
  if (sendTest) {
    const sendResult = await testSendNotification(sendTest);
    results.push(sendResult);
  }
  
  const hasFailures = results.some(r => r.status === "fail");
  const hasWarnings = results.some(r => r.status === "warning");
  
  const summary = {
    status: hasFailures ? "error" : hasWarnings ? "warning" : "healthy",
    totalDuration: Date.now() - overallStart,
    timestamp: new Date().toISOString(),
    timestampUzb: new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }),
    passed: results.filter(r => r.status === "pass").length,
    warnings: results.filter(r => r.status === "warning").length,
    failed: results.filter(r => r.status === "fail").length,
  };
  
  return NextResponse.json(
    {
      summary,
      results,
      usage: {
        description: "Add ?send=CHAT_ID to send a test notification to a specific Telegram chat",
        example: "/api/notifications/test?send=123456789",
      },
    },
    {
      status: hasFailures ? 500 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
