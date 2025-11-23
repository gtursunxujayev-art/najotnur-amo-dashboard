// app/api/meta/route.ts
import { NextResponse } from "next/server";

const AMO_BASE_URL = process.env.AMO_BASE_URL; // masalan: https://najotnur01.amocrm.ru/
const AMO_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

function amoUrl(path: string) {
  if (!AMO_BASE_URL) throw new Error("AMO_BASE_URL not set");
  const base = AMO_BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

async function amoFetch(path: string) {
  if (!AMO_TOKEN) throw new Error("AMO_LONG_LIVED_TOKEN not set");
  const res = await fetch(amoUrl(path), {
    headers: {
      Authorization: `Bearer ${AMO_TOKEN}`,
      "Content-Type": "application/json",
    },
    // amo API cachingni xohlamaymiz
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`amoFetch ${path} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function GET() {
  try {
    // 1) Pipelines (statuses embedded)
    const pipelinesRes = await amoFetch("/api/v4/leads/pipelines?limit=250");
    const pipelinesRaw = pipelinesRes?._embedded?.pipelines ?? [];

    const pipelines = pipelinesRaw.map((p: any) => ({
      id: p.id,
      name: p.name,
    }));

    // Statuslar pipelines ichidan olinadi → pipeline_id aniq bo‘ladi
    const statuses = pipelinesRaw.flatMap((p: any) => {
      const sts = p?._embedded?.statuses ?? [];
      return sts.map((s: any) => ({
        id: s.id,
        name: s.name,
        pipeline_id: p.id,
      }));
    });

    // 2) Custom fields (leads) - fetch first to extract E'tiroz sababi
    let customFields: any[] = [];
    let lossReasons: any[] = [];
    
    try {
      const fieldsRes = await amoFetch("/api/v4/leads/custom_fields?limit=250");
      const allFields = fieldsRes?._embedded?.custom_fields ?? [];
      
      customFields = allFields.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        enums: (f.enums ?? []).map((en: any) => ({
          id: en.id,
          value: en.value,
        })),
      }));
      
      // Extract E'tiroz sababi field enums as lossReasons
      // Look for field ID 1121759 or field name containing "E'tiroz sababi"
      const objectionField = allFields.find((f: any) => {
        const name = String(f.name || "").toLowerCase();
        return f.id === 1121759 || 
               name.includes("e'tiroz sababi") || 
               name.includes("eʼtiroz sababi") ||
               name.includes("e'tiroz");
      });
      
      if (objectionField && objectionField.enums) {
        lossReasons = objectionField.enums.map((en: any) => ({
          id: en.id,
          name: en.value,
        }));
      }
    } catch {
      customFields = [];
    }
    
    // Fallback: if no objection field found, try global loss reasons
    if (lossReasons.length === 0) {
      try {
        const lossRes = await amoFetch("/api/v4/leads/loss_reasons?limit=250");
        lossReasons = (lossRes?._embedded?.loss_reasons ?? []).map((lr: any) => ({
          id: lr.id,
          name: lr.name,
        }));
      } catch {
        lossReasons = [];
      }
    }

    return NextResponse.json({
      ok: true,
      pipelines,
      statuses,
      lossReasons,
      customFields,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}