import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramNotification } from "@/lib/leadNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEZONE_OFFSET = 5;

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

  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function POST(request: Request) {
  try {
    const nowGMT5 = getCurrentTimeInGMT5();
    console.log(`[TestNotification] Current time GMT+5: ${nowGMT5.toISOString()}`);

    const lastLeadData = await prisma.leadNotification.findFirst({
      orderBy: { sentAt: "desc" },
    });

    if (!lastLeadData) {
      return NextResponse.json(
        { ok: false, error: "No leads found in database" },
        { status: 404 }
      );
    }

    console.log(`[TestNotification] Last lead: ${lastLeadData.leadId} - ${lastLeadData.leadName}`);

    const testNotification = await prisma.leadNotification.create({
      data: {
        leadId: lastLeadData.leadId,
        leadName: lastLeadData.leadName,
        phone: lastLeadData.phone,
        source: lastLeadData.source,
        manager: lastLeadData.manager,
        pipeline: lastLeadData.pipeline,
        pipelineId: lastLeadData.pipelineId,
        isQueued: false,
      },
    });

    const users = await prisma.telegramUser.findMany({
      where: {
        leadNotifications: true,
      },
    });

    console.log(`[TestNotification] Found ${users.length} users with notifications enabled`);

    const results: Array<{
      userId: number;
      chatId: string;
      username: string | null;
      withinHours: boolean;
      managerMatch: boolean;
      sent: boolean;
      error?: string;
    }> = [];

    for (const user of users) {
      const managerLower = lastLeadData.manager.toLowerCase();
      const userManagersLower = (user.notifyManagers || []).map(m => m.toLowerCase());
      
      const managerMatch = userManagersLower.length === 0 || userManagersLower.includes(managerLower);
      
      if (!managerMatch) {
        console.log(
          `[TestNotification] Skipping user ${user.id} - manager filter: ${user.notifyManagers.join(", ")}`
        );
        results.push({
          userId: user.id,
          chatId: String(user.chatId),
          username: user.username,
          withinHours: true,
          managerMatch: false,
          sent: false,
          error: `Manager filter: ${user.notifyManagers.join(", ")}`,
        });
        continue;
      }

      const withinHours = isWithinWorkingHours(
        user.notifyStartTime,
        user.notifyEndTime
      );

      console.log(
        `[TestNotification] User ${user.id} (${user.username}): hours ${user.notifyStartTime}-${user.notifyEndTime}, withinHours: ${withinHours}`
      );

      if (!withinHours) {
        results.push({
          userId: user.id,
          chatId: String(user.chatId),
          username: user.username,
          withinHours: false,
          managerMatch: true,
          sent: false,
          error: "Outside working hours",
        });
        continue;
      }

      try {
        const success = await sendTelegramNotification(
          user.chatId,
          {
            leadId: lastLeadData.leadId,
            leadName: lastLeadData.leadName,
            phone: lastLeadData.phone ?? undefined,
            source: lastLeadData.source ?? undefined,
            manager: lastLeadData.manager,
            pipeline: lastLeadData.pipeline,
            pipelineId: lastLeadData.pipelineId,
          },
          testNotification.id
        );

        results.push({
          userId: user.id,
          chatId: String(user.chatId),
          username: user.username,
          withinHours: true,
          managerMatch: true,
          sent: success,
        });
      } catch (error: any) {
        results.push({
          userId: user.id,
          chatId: String(user.chatId),
          username: user.username,
          withinHours: true,
          managerMatch: true,
          sent: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      currentTimeGMT5: nowGMT5.toISOString(),
      testNotificationId: testNotification.id,
      lead: {
        leadId: lastLeadData.leadId,
        leadName: lastLeadData.leadName,
        manager: lastLeadData.manager,
        pipeline: lastLeadData.pipeline,
      },
      results,
    });
  } catch (error: any) {
    console.error("[TestNotification] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const nowGMT5 = getCurrentTimeInGMT5();

  const lastLead = await prisma.leadNotification.findFirst({
    orderBy: { sentAt: "desc" },
  });

  const users = await prisma.telegramUser.findMany({
    where: {
      leadNotifications: true,
    },
    select: {
      id: true,
      chatId: true,
      username: true,
      firstName: true,
      notifyStartTime: true,
      notifyEndTime: true,
      notifyManagers: true,
    },
  });

  return NextResponse.json({
    ok: true,
    currentTimeGMT5: nowGMT5.toISOString(),
    lastLead: lastLead
      ? {
          id: lastLead.id,
          leadId: lastLead.leadId,
          leadName: lastLead.leadName,
          manager: lastLead.manager,
          pipeline: lastLead.pipeline,
          sentAt: lastLead.sentAt,
        }
      : null,
    usersWithNotifications: users.map((u) => ({
      id: u.id,
      chatId: String(u.chatId),
      username: u.username,
      firstName: u.firstName,
      workingHours: `${u.notifyStartTime || "00:00"}-${u.notifyEndTime || "24:00"}`,
      withinHours: isWithinWorkingHours(u.notifyStartTime, u.notifyEndTime),
      notifyManagers: u.notifyManagers,
    })),
  });
}
