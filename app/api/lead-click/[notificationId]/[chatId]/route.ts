import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string; chatId: string }> }
) {
  const { notificationId, chatId } = await params;
  
  try {
    const notification = await prisma.leadNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.redirect(
        `https://najotnur01.amocrm.ru/leads/`,
        { status: 302 }
      );
    }

    const user = await prisma.telegramUser.findFirst({
      where: { chatId: BigInt(chatId) },
    });

    if (user) {
      const responseTimeMs = Date.now() - notification.sentAt.getTime();

      try {
        await prisma.leadNotificationResponse.upsert({
          where: {
            notificationId_userId: {
              notificationId,
              userId: user.id,
            },
          },
          create: {
            notificationId,
            userId: user.id,
            visitorId: chatId,
            responseTimeMs,
          },
          update: {},
        });

        console.log(
          `[LeadClick] Recorded response: notification=${notificationId}, userId=${user.id}, chatId=${chatId}, time=${responseTimeMs}ms`
        );
      } catch (error) {
        console.error("[LeadClick] Error recording response:", error);
      }
    } else {
      console.log(`[LeadClick] User not found for chatId=${chatId}, skipping response tracking`);
    }

    const crmUrl = `https://najotnur01.amocrm.ru/leads/detail/${notification.leadId}`;
    return NextResponse.redirect(crmUrl, { status: 302 });
  } catch (error) {
    console.error("[LeadClick] Error:", error);
    return NextResponse.redirect(
      `https://najotnur01.amocrm.ru/leads/`,
      { status: 302 }
    );
  }
}
