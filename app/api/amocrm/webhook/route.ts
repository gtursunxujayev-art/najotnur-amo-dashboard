import { NextResponse } from "next/server";
import { notifyUsersAboutLead, notifyUsersAboutReassignedLead } from "@/lib/leadNotifications";
import { getUsers } from "@/lib/amocrm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOTUV_PIPELINE_ID = 9975586;
const INTENSIV_PIPELINE_ID = 9663682;

let usersCache: Map<number, string> = new Map();
let usersCacheTime: number = 0;
const USERS_CACHE_TTL = 5 * 60 * 1000;

async function refreshUsersCache(): Promise<void> {
  const now = Date.now();
  if (usersCache.size > 0 && now - usersCacheTime < USERS_CACHE_TTL) {
    return;
  }

  try {
    console.log("[Webhook] Refreshing users cache");
    const users = await getUsers();
    usersCache = new Map();
    for (const user of users) {
      usersCache.set(user.id, user.name);
    }
    usersCacheTime = now;
    console.log(`[Webhook] Cached ${usersCache.size} users`);
  } catch (error) {
    console.error("[Webhook] Failed to refresh users cache:", error);
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

async function getManagerName(responsibleUserId: number): Promise<string> {
  const cached = usersCache.get(responsibleUserId);
  if (cached) {
    return cached;
  }
  
  console.log(`[Webhook] User ${responsibleUserId} not in cache, refreshing...`);
  await refreshUsersCache();
  
  const afterRefresh = usersCache.get(responsibleUserId);
  if (afterRefresh) {
    return afterRefresh;
  }
  
  console.warn(`[Webhook] User ${responsibleUserId} not found`);
  return `User ${responsibleUserId}`;
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
    const fieldCode = field.field_code || field.code;
    const fieldName = field.field_name || field.name;
    
    if (
      fieldCode === "UTM_SOURCE" ||
      fieldName?.toLowerCase().includes("источник") ||
      fieldName?.toLowerCase().includes("source") ||
      fieldName?.toLowerCase().includes("utm")
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
    if (typeof value !== "string") continue;
    
    const matches = key.match(/^([^\[]+)(\[.+\])$/);
    if (matches) {
      const rootKey = matches[1];
      const path = matches[2];
      
      if (!result[rootKey]) {
        result[rootKey] = {};
      }
      
      const pathParts = path.match(/\[([^\]]*)\]/g) || [];
      let current = result[rootKey];
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i].slice(1, -1);
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      const lastPart = pathParts[pathParts.length - 1].slice(1, -1);
      current[lastPart] = value;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

async function processWebhookAsync(data: any): Promise<void> {
  try {
    const newLeads = data.leads?.add || [];
    const responsibleLeads = data.leads?.responsible || [];

    if (!newLeads.length && !responsibleLeads.length) {
      console.log("[Webhook/Async] No leads to process");
      return;
    }

    await refreshUsersCache();

    let processedCount = 0;

    for (const lead of newLeads) {
      try {
        const leadId = parseInt(lead.id);
        const leadName = lead.name || "Nomsiz lid";
        const pipelineId = parseInt(lead.pipeline_id || lead.status?.pipeline_id);
        const responsibleUserId = parseInt(lead.responsible_user_id);

        if (pipelineId !== SOTUV_PIPELINE_ID && pipelineId !== INTENSIV_PIPELINE_ID) {
          console.log(`[Webhook/Async] Skipping lead ${leadId} - pipeline ${pipelineId} not tracked`);
          continue;
        }

        const createdAt = parseInt(lead.date_create || lead.created_at || "0");
        
        const leadData = {
          leadId,
          leadName,
          phone: extractPhone(lead),
          source: extractSource(lead),
          manager: await getManagerName(responsibleUserId),
          pipeline: getPipelineName(pipelineId),
          pipelineId,
          createdAt: createdAt || undefined,
        };

        console.log("[Webhook/Async] Processing new lead:", leadData);
        await notifyUsersAboutLead(leadData);
        processedCount++;
      } catch (leadError) {
        console.error("[Webhook/Async] Error processing new lead:", leadError);
      }
    }

    for (const lead of responsibleLeads) {
      try {
        const leadId = parseInt(lead.id);
        const leadName = lead.name || "Nomsiz lid";
        const pipelineId = parseInt(lead.pipeline_id);
        const newResponsibleUserId = parseInt(lead.responsible_user_id);
        const oldResponsibleUserId = lead.old_responsible_user_id 
          ? parseInt(lead.old_responsible_user_id) 
          : null;

        if (pipelineId !== SOTUV_PIPELINE_ID && pipelineId !== INTENSIV_PIPELINE_ID) {
          console.log(`[Webhook/Async] Skipping responsible change for lead ${leadId} - pipeline ${pipelineId} not tracked`);
          continue;
        }

        const leadData = {
          leadId,
          leadName,
          phone: extractPhone(lead),
          source: extractSource(lead),
          newManager: await getManagerName(newResponsibleUserId),
          oldManager: oldResponsibleUserId ? await getManagerName(oldResponsibleUserId) : "Noma'lum",
          pipeline: getPipelineName(pipelineId),
          pipelineId,
        };

        console.log("[Webhook/Async] Processing responsible change:", leadData);
        await notifyUsersAboutReassignedLead(leadData);
        processedCount++;
      } catch (leadError) {
        console.error("[Webhook/Async] Error processing responsible change:", leadError);
      }
    }

    console.log(`[Webhook/Async] Completed processing ${processedCount} lead event(s)`);
  } catch (error) {
    console.error("[Webhook/Async] Fatal error in async processing:", error);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    console.log("[Webhook] Received webhook request");

    const contentType = request.headers.get("content-type") || "";
    let data: any;

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      data = parseFormDataToObject(formData);
    } else {
      const text = await request.text();
      
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
          console.error("[Webhook] Unable to parse body, but returning 200 anyway");
          return NextResponse.json({ ok: true, message: "Received" });
        }
      }
    }

    const newLeads = data.leads?.add || [];
    const responsibleLeads = data.leads?.responsible || [];
    const isNewLeadEvent = newLeads.length > 0;
    const isResponsibleChangeEvent = responsibleLeads.length > 0;
    
    if (!isNewLeadEvent && !isResponsibleChangeEvent && (data.leads?.update || data.leads?.status)) {
      console.log("[Webhook] Skipping update/status event");
      return NextResponse.json({ ok: true, message: "Event type not tracked" });
    }

    if (!newLeads.length && !responsibleLeads.length) {
      console.log("[Webhook] No leads in webhook data");
      return NextResponse.json({ ok: true, message: "No leads" });
    }

    console.log(`[Webhook] Quick parse complete in ${Date.now() - startTime}ms, starting async processing`);
    console.log(`[Webhook] New leads: ${newLeads.length}, Responsible changes: ${responsibleLeads.length}`);

    setImmediate(() => {
      processWebhookAsync(data).catch(err => {
        console.error("[Webhook] Async processing error:", err);
      });
    });

    return NextResponse.json({
      ok: true,
      message: "Webhook received, processing in background",
      responseTime: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error("[Webhook] Error parsing request:", error);
    return NextResponse.json({ ok: true, message: "Error logged, accepted" });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "amoCRM webhook endpoint is active (async mode)",
    trackedPipelines: [
      { id: SOTUV_PIPELINE_ID, name: "Sotuv" },
      { id: INTENSIV_PIPELINE_ID, name: "Intensiv" },
    ],
  });
}
