// app/api/scheduler/status/route.ts - Check scheduler status and execution history
import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get scheduler status
    const schedulerStatus = getSchedulerStatus();

    // Get subscriber count
    const dailySubscribers = await prisma.telegramUser.count({
      where: { dailyReport: true },
    });
    const weeklySubscribers = await prisma.telegramUser.count({
      where: { weeklyReport: true },
    });
    const monthlySubscribers = await prisma.telegramUser.count({
      where: { monthlyReport: true },
    });

    // Get all users for debugging
    const allUsers = await prisma.telegramUser.findMany({
      select: {
        id: true,
        chatId: true,
        username: true,
        dailyReport: true,
        weeklyReport: true,
        monthlyReport: true,
        createdAt: true,
      },
    });

    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      scheduler: {
        ...schedulerStatus,
        tasksRegistered: schedulerStatus.initialized,
      },
      subscribers: {
        daily: dailySubscribers,
        weekly: weeklySubscribers,
        monthly: monthlySubscribers,
      },
      subscribers_list: allUsers,
      timezone: "Asia/Tashkent (GMT+5)",
      instructions: {
        check_status: "GET /api/scheduler/status (this endpoint)",
        trigger_daily: "GET /api/scheduler/test?type=daily",
        trigger_weekly: "GET /api/scheduler/test?type=weekly",
        trigger_monthly: "GET /api/scheduler/test?type=monthly",
      },
    };

    console.log("[scheduler/status] Status check:", response);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[scheduler/status] Error:", err?.message);
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
