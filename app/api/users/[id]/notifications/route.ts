import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    
    const user = await prisma.telegramUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        leadNotifications: true,
        notifyManagers: true,
        notifyStartTime: true,
        notifyEndTime: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: user });
  } catch (error: any) {
    console.error("[Users/Notifications] GET Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const body = await request.json();

    const { leadNotifications, notifyManagers, notifyStartTime, notifyEndTime } = body;

    const user = await prisma.telegramUser.update({
      where: { id: userId },
      data: {
        leadNotifications: leadNotifications ?? undefined,
        notifyManagers: notifyManagers ?? undefined,
        notifyStartTime: notifyStartTime,
        notifyEndTime: notifyEndTime,
      },
      select: {
        id: true,
        leadNotifications: true,
        notifyManagers: true,
        notifyStartTime: true,
        notifyEndTime: true,
      },
    });

    return NextResponse.json({ ok: true, data: user });
  } catch (error: any) {
    console.error("[Users/Notifications] PUT Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
