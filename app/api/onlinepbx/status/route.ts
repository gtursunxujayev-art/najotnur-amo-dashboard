import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

/**
 * Check OnlinePBX webhook status
 * Shows:
 * - Total calls captured
 * - Last call received
 * - Recent calls
 * - Webhook health
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get total calls in database
    const totalCalls = await prisma.onlinePBXCall.count();

    // Get calls from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const callsToday = await prisma.onlinePBXCall.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get last call
    const lastCall = await prisma.onlinePBXCall.findFirst({
      orderBy: { date: "desc" },
      take: 1,
    });

    // Get recent calls
    const recentCalls = await prisma.onlinePBXCall.findMany({
      orderBy: { date: "desc" },
      take: limit,
    });

    // Get calls by manager today
    const callsByManagerToday = await prisma.onlinePBXCall.groupBy({
      by: ["user"],
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      _count: {
        user: true,
      },
    });

    // Calculate health status
    const secondsSinceLastCall = lastCall ? Math.floor((Date.now() - lastCall.date.getTime()) / 1000) : null;
    let healthStatus = "unknown";

    if (!lastCall) {
      healthStatus = "⚠️ No calls yet - webhook may not be configured";
    } else if (secondsSinceLastCall! < 3600) {
      healthStatus = "✅ Healthy - calls received within last hour";
    } else if (secondsSinceLastCall! < 86400) {
      healthStatus = "⚠️ Stale - no recent calls in last hour";
    } else {
      healthStatus = "❌ Inactive - no calls for 24+ hours";
    }

    return NextResponse.json({
      success: true,
      data: {
        status: healthStatus,
        statistics: {
          totalCallsAllTime: totalCalls,
          callsToday,
          lastCallTime: lastCall?.date || null,
          secondsSinceLastCall,
          managersTodayCount: callsByManagerToday.length,
        },
        callsByManagerToday: callsByManagerToday.map((m) => ({
          manager: m.user,
          count: m._count.user,
        })),
        recentCalls: recentCalls.map((c) => ({
          id: c.callId,
          date: c.date,
          direction: c.direction,
          duration: c.duration,
          manager: c.user,
          phone: c.phone,
          source: c.source,
        })),
        webhookUrl: `https://${process.env.REPLIT_DOMAIN || "[REPLIT_DOMAIN]"}/api/onlinepbx/webhook`,
        instructions: {
          configure: "Set this webhook URL in your OnlinePBX panel settings",
          test: "Make a test call and check back here - new calls should appear within seconds",
          verify: "If no new calls appear after 1 minute, check:\n1. Webhook is enabled in OnlinePBX panel\n2. URL is correct\n3. OnlinePBX can reach your domain\n4. Firewall/security allows incoming webhooks",
        },
      },
    });
  } catch (error: any) {
    console.error("[OnlinePBX/Status] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
