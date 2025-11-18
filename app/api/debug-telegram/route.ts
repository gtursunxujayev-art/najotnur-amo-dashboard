// app/api/debug-telegram/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.telegramUser.findMany({
      orderBy: { createdAt: "desc" },
    });

    const safeUsers = users.map((u) => ({
      id: u.id,
      chatId: u.chatId.toString(),
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      dailyReport: u.dailyReport,
      weeklyReport: u.weeklyReport,
      monthlyReport: u.monthlyReport,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({
      ok: true,
      count: safeUsers.length,
      users: safeUsers,
    });
  } catch (err: any) {
    console.error("[debug-telegram] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
