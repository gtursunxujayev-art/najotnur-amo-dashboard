import { NextResponse } from "next/server";
import { notifyUsersAboutLead } from "@/lib/leadNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOTUV_PIPELINE_ID = 9975586;
const INTENSIV_PIPELINE_ID = 9663682;

const MANAGERS: Record<number, string> = {
  6549430: "Madina",
  7199594: "Zilola",
  6625970: "Sabrina",
  6626192: "Oyshaxon",
  7197714: "Marg'uba",
  10148086: "Mumtoza",
  10148142: "Matluba",
  10403196: "Mohinur",
  10148106: "sabina",
  10403170: "Gulchehra",
  11136174: "Orzugul",
};

function getPipelineName(pipelineId: number): string {
  switch (pipelineId) {
    case SOTUV_PIPELINE_ID:
      return "Sotuv";
    case INTENSIV_PIPELINE_ID:
      return "Intensiv";
    default:
      return "Boshqa";
  }
}

function getManagerName(responsibleUserId: number): string {
  return MANAGERS[responsibleUserId] || `User ${responsibleUserId}`;
}

function extractPhone(lead: any): string | undefined {
  if (!lead.custom_fields_values) return undefined;

  for (const field of lead.custom_fields_values) {
    if (
      field.field_code === "PHONE" ||
      field.field_name?.toLowerCase().includes("телефон") ||
      field.field_name?.toLowerCase().includes("phone")
    ) {
      const value = field.values?.[0]?.value;
      if (value) return value;
    }
  }

  return undefined;
}

function extractSource(lead: any): string | undefined {
  if (lead.source?.name) {
    return lead.source.name;
  }

  if (lead._embedded?.tags?.length > 0) {
    return lead._embedded.tags.map((t: any) => t.name).join(", ");
  }

  if (!lead.custom_fields_values) return undefined;

  for (const field of lead.custom_fields_values) {
    if (
      field.field_name?.toLowerCase().includes("источник") ||
      field.field_name?.toLowerCase().includes("source") ||
      field.field_name?.toLowerCase().includes("manba")
    ) {
      const value = field.values?.[0]?.value;
      if (value) return value;
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    console.log("[amoCRM/Webhook] Received webhook");

    const data = await request.json();
    console.log("[amoCRM/Webhook] Data:", JSON.stringify(data, null, 2));

    const leads = data.leads?.add || data.leads?.update || [];

    if (!leads.length) {
      console.log("[amoCRM/Webhook] No leads in webhook data");
      return NextResponse.json({ ok: true, message: "No leads to process" });
    }

    for (const lead of leads) {
      const leadId = parseInt(lead.id);
      const leadName = lead.name || "Nomsiz lid";
      const pipelineId = parseInt(lead.pipeline_id || lead.status?.pipeline_id);
      const responsibleUserId = parseInt(lead.responsible_user_id);

      if (
        pipelineId !== SOTUV_PIPELINE_ID &&
        pipelineId !== INTENSIV_PIPELINE_ID
      ) {
        console.log(
          `[amoCRM/Webhook] Skipping lead ${leadId} - pipeline ${pipelineId} not tracked`
        );
        continue;
      }

      const leadData = {
        leadId,
        leadName,
        phone: extractPhone(lead),
        source: extractSource(lead),
        manager: getManagerName(responsibleUserId),
        pipeline: getPipelineName(pipelineId),
        pipelineId,
      };

      console.log("[amoCRM/Webhook] Processing lead:", leadData);

      await notifyUsersAboutLead(leadData);
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${leads.length} lead(s)`,
    });
  } catch (error: any) {
    console.error("[amoCRM/Webhook] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "amoCRM webhook endpoint is active",
    trackedPipelines: [
      { id: SOTUV_PIPELINE_ID, name: "Sotuv" },
      { id: INTENSIV_PIPELINE_ID, name: "Intensiv" },
    ],
  });
}
