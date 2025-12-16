import { NextResponse } from "next/server";
import { notifyUsersAboutLead, notifyUsersAboutReassignedLead } from "@/lib/leadNotifications";
import { getUsers } from "@/lib/amocrm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOTUV_PIPELINE_ID = 9975586;
const INTENSIV_PIPELINE_ID = 9663682;

// Cache for amoCRM users (refreshed every 5 minutes)
let usersCache: Map<number, string> = new Map();
let usersCacheTime: number = 0;
const USERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function refreshUsersCache(): Promise<void> {
  const now = Date.now();
  if (usersCache.size > 0 && now - usersCacheTime < USERS_CACHE_TTL) {
    return; // Cache is still valid
  }

  try {
    console.log("[amoCRM/Webhook] Refreshing users cache from amoCRM API");
    const users = await getUsers();
    usersCache = new Map();
    for (const user of users) {
      usersCache.set(user.id, user.name);
    }
    usersCacheTime = now;
    console.log(`[amoCRM/Webhook] Cached ${usersCache.size} users from amoCRM`);
  } catch (error) {
    console.error("[amoCRM/Webhook] Failed to refresh users cache:", error);
  }
}

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
  return usersCache.get(responsibleUserId) || `User ${responsibleUserId}`;
}

function getCustomFields(lead: any): any[] {
  if (lead.custom_fields_values && Array.isArray(lead.custom_fields_values)) {
    return lead.custom_fields_values;
  }
  
  if (lead.custom_fields) {
    if (Array.isArray(lead.custom_fields)) {
      return lead.custom_fields;
    }
    return Object.values(lead.custom_fields);
  }
  
  return [];
}

function extractPhone(lead: any): string | undefined {
  const customFields = getCustomFields(lead);

  for (const field of customFields) {
    const fieldCode = field.field_code || field.code;
    const fieldName = field.field_name || field.name;
    
    if (
      fieldCode === "PHONE" ||
      fieldName?.toLowerCase().includes("телефон") ||
      fieldName?.toLowerCase().includes("phone")
    ) {
      const values = field.values || field.value;
      if (Array.isArray(values) && values[0]) {
        return values[0].value || values[0];
      }
      if (typeof values === "string") {
        return values;
      }
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
  
  if (lead.tags) {
    const tags = Array.isArray(lead.tags) ? lead.tags : Object.values(lead.tags);
    if (tags.length > 0) {
      return tags.map((t: any) => t.name || t).filter(Boolean).join(", ");
    }
  }

  const customFields = getCustomFields(lead);

  for (const field of customFields) {
    const fieldName = field.field_name || field.name;
    
    if (
      fieldName?.toLowerCase().includes("источник") ||
      fieldName?.toLowerCase().includes("source") ||
      fieldName?.toLowerCase().includes("manba") ||
      fieldName?.toLowerCase().includes("qayerdan")
    ) {
      const values = field.values || field.value;
      if (Array.isArray(values) && values[0]) {
        return values[0].value || values[0];
      }
      if (typeof values === "string") {
        return values;
      }
    }
  }

  return undefined;
}

function parseFormDataToObject(formData: FormData): any {
  const result: any = {};
  
  for (const [key, value] of formData.entries()) {
    const keys = key.match(/[^\[\]]+/g);
    if (!keys) {
      result[key] = value;
      continue;
    }
    
    let current = result;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const isLast = i === keys.length - 1;
      const nextKey = keys[i + 1];
      const isNextNumeric = nextKey && /^\d+$/.test(nextKey);
      
      if (isLast) {
        current[k] = value;
      } else {
        if (current[k] === undefined) {
          current[k] = isNextNumeric ? [] : {};
        }
        current = current[k];
      }
    }
  }
  
  return result;
}

export async function POST(request: Request) {
  try {
    console.log("[amoCRM/Webhook] Received webhook");

    const contentType = request.headers.get("content-type") || "";
    let data: any;

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      data = parseFormDataToObject(formData);
    } else {
      const text = await request.text();
      console.log("[amoCRM/Webhook] Raw body:", text.substring(0, 500));
      
      if (text.includes("=") && text.includes("&")) {
        const params = new URLSearchParams(text);
        const formData = new FormData();
        for (const [key, value] of params.entries()) {
          formData.append(key, value);
        }
        data = parseFormDataToObject(formData);
      } else {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("[amoCRM/Webhook] Unable to parse body");
          return NextResponse.json(
            { ok: false, error: "Invalid request body format" },
            { status: 400 }
          );
        }
      }
    }

    console.log("[amoCRM/Webhook] Parsed data:", JSON.stringify(data, null, 2));

    const newLeads = data.leads?.add || [];
    const responsibleLeads = data.leads?.responsible || [];
    const isNewLeadEvent = newLeads.length > 0;
    const isResponsibleChangeEvent = responsibleLeads.length > 0;
    
    if (!isNewLeadEvent && !isResponsibleChangeEvent && (data.leads?.update || data.leads?.status)) {
      console.log("[amoCRM/Webhook] Skipping update/status event - only processing new leads and responsible changes");
      return NextResponse.json({ ok: true, message: "Only new lead and responsible change events are processed" });
    }

    if (!newLeads.length && !responsibleLeads.length) {
      console.log("[amoCRM/Webhook] No leads in webhook data");
      return NextResponse.json({ ok: true, message: "No leads to process" });
    }

    // Refresh users cache before processing
    await refreshUsersCache();

    let processedCount = 0;

    for (const lead of newLeads) {
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

      const createdAt = parseInt(lead.date_create || lead.created_at || "0");
      
      const leadData = {
        leadId,
        leadName,
        phone: extractPhone(lead),
        source: extractSource(lead),
        manager: getManagerName(responsibleUserId),
        pipeline: getPipelineName(pipelineId),
        pipelineId,
        createdAt: createdAt || undefined,
      };

      console.log("[amoCRM/Webhook] Processing new lead:", leadData);
      await notifyUsersAboutLead(leadData);
      processedCount++;
    }

    for (const lead of responsibleLeads) {
      const leadId = parseInt(lead.id);
      const leadName = lead.name || "Nomsiz lid";
      const pipelineId = parseInt(lead.pipeline_id);
      const newResponsibleUserId = parseInt(lead.responsible_user_id);
      const oldResponsibleUserId = lead.old_responsible_user_id 
        ? parseInt(lead.old_responsible_user_id) 
        : null;

      if (
        pipelineId !== SOTUV_PIPELINE_ID &&
        pipelineId !== INTENSIV_PIPELINE_ID
      ) {
        console.log(
          `[amoCRM/Webhook] Skipping responsible change for lead ${leadId} - pipeline ${pipelineId} not tracked`
        );
        continue;
      }

      const leadData = {
        leadId,
        leadName,
        phone: extractPhone(lead),
        source: extractSource(lead),
        newManager: getManagerName(newResponsibleUserId),
        oldManager: oldResponsibleUserId ? getManagerName(oldResponsibleUserId) : "Noma'lum",
        pipeline: getPipelineName(pipelineId),
        pipelineId,
      };

      console.log("[amoCRM/Webhook] Processing responsible change:", leadData);
      await notifyUsersAboutReassignedLead(leadData);
      processedCount++;
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${processedCount} lead event(s)`,
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
