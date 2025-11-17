// app/api/report-users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const users = await prisma.telegramUser.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !body.chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }
  const { chatId, dailyReport, weeklyReport, monthlyReport } = body;

  const user = await prisma.telegramUser.update({
    where: { chatId: BigInt(chatId) },
    data: {
      dailyReport: !!dailyReport,
      weeklyReport: !!weeklyReport,
      monthlyReport: !!monthlyReport,
    },
  });

  return NextResponse.json({ user });
}