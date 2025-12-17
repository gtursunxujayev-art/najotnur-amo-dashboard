import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await prisma.webhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const notifications = await prisma.leadNotification.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      ok: true,
      webhookUrl: "https://najotnur-amo-dashboard-gtursunxujayev.replit.app/api/amocrm/webhook",
      requiredEvents: ["leads.add", "leads.responsible"],
      trackedPipelines: [
        { id: 9975586, name: "Sotuv" },
        { id: 9663682, name: "Intensiv" },
      ],
      recentWebhooks: logs.map(log => ({
        id: log.id,
        eventType: log.eventType,
        leadIds: log.leadIds,
        processed: log.processed,
        completed: log.completed,
        error: log.error,
        createdAt: log.createdAt,
      })),
      recentNotifications: notifications.map(n => ({
        id: n.id,
        leadId: n.leadId,
        leadName: n.leadName,
        manager: n.manager,
        pipeline: n.pipeline,
        eventType: n.eventType,
        sentAt: n.sentAt,
      })),
    });
  } catch (error: any) {
    console.error("[WebhookLogs] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
