// app/api/report-users/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toBigInt(chatId: string | number | bigint): bigint {
  return BigInt(String(chatId));
}

export async function GET() {
  try {
    const users = await prisma.telegramUser.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Convert BigInt chatId to string so JSON can serialize it
    const safeUsers = users.map((u) => ({
      ...u,
      chatId: u.chatId.toString(),
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (err: any) {
    console.error("[report-users][GET] error", err);
    return NextResponse.json(
      {
        users: [],
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const chatId = body.chatId;
    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "chatId is required" },
        { status: 400 }
      );
    }

    const chatIdBigInt = toBigInt(chatId);

    const dailyReport: boolean | undefined = body.dailyReport;
    const weeklyReport: boolean | undefined = body.weeklyReport;
    const monthlyReport: boolean | undefined = body.monthlyReport;

    // Only update flags; users themselves are created by the Telegram webhook
    await prisma.telegramUser.update({
      where: { chatId: chatIdBigInt },
      data: {
        ...(typeof dailyReport === "boolean" && { dailyReport }),
        ...(typeof weeklyReport === "boolean" && { weeklyReport }),
        ...(typeof monthlyReport === "boolean" && { monthlyReport }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[report-users][POST] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
