// lib/amocrm.ts
import { dashboardConfig } from "@/config/dashboardConfig";

const AMO_BASE_URL = process.env.AMO_BASE_URL;
const AMO_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

if (!AMO_BASE_URL || !AMO_TOKEN) {
  console.warn(
    "AMO_BASE_URL yoki AMO_LONG_LIVED_TOKEN topilmadi. amoCRM chaqiriqlari ishlamasligi mumkin."
  );
}

export type AmoCustomFieldValueCommon = {
  field_id: number;
  field_name: string;
  field_code?: string;
};

export type AmoCustomFieldValueString = AmoCustomFieldValueCommon & {
  values: { value: string }[];
};

export type AmoCustomFieldValueEnum = AmoCustomFieldValueCommon & {
  values: { enum_id: number; value: string }[];
};

export type AmoLead = {
  id: number;
  created_at?: number;
  updated_at?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  custom_fields_values?: (AmoCustomFieldValueString | AmoCustomFieldValueEnum)[];
};

export type AmoPipeline = {
  id: number;
  name: string;
  statuses?: { id: number; name: string }[];
};

export type AmoUser = {
  id: number;
  name: string;
};

type AmoListResponse<T> = {
  _embedded?: { [key: string]: T[] };
  _links?: { next?: { href: string } };
};

async function amoRequest<T>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${AMO_BASE_URL}${pathOrUrl}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AMO_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`amoCRM error ${res.status}: ${txt}`);
  }

  return (await res.json()) as T;
}

async function amoPaginate<T>(
  firstPath: string,
  embeddedKey: string
): Promise<T[]> {
  let url = firstPath;
  const out: T[] = [];

  while (url) {
    const data = await amoRequest<AmoListResponse<T>>(url);
    const items = data._embedded?.[embeddedKey] || [];
    out.push(...items);

    const nextHref = data._links?.next?.href;
    url = nextHref || "";
  }
  return out;
}

export async function getLeadsByCreatedAt(
  fromUnix: number,
  toUnix: number
): Promise<AmoLead[]> {
  const limit = 250;
  const path =
    `/api/v4/leads?limit=${limit}` +
    `&filter[created_at][from]=${fromUnix}` +
    `&filter[created_at][to]=${toUnix}` +
    `&with=contacts,custom_fields`;

  return amoPaginate<AmoLead>(path, "leads");
}

export async function getPipelines(
  pipelineIds?: number[]
): Promise<AmoPipeline[]> {
  const ids = pipelineIds?.length
    ? pipelineIds
    : dashboardConfig.PIPELINE_IDS;

  const pipelines: AmoPipeline[] = [];

  for (const id of ids) {
    try {
      const p = await amoRequest<AmoPipeline>(
        `/api/v4/leads/pipelines/${id}?with=statuses`
      );
      pipelines.push(p);
    } catch (e) {
      console.error("getPipelines error:", e);
    }
  }

  return pipelines;
}

type AmoCustomField = {
  id: number;
  name: string;
  field_type: string;
  enums?: { id: number; value: string }[];
};

export async function getLeadCustomFields(
  fieldIds: number[] = []
): Promise<AmoCustomField[]> {
  const all = await amoPaginate<AmoCustomField>(
    "/api/v4/leads/custom_fields?limit=250",
    "custom_fields"
  );

  if (!fieldIds.length) return all;
  return all.filter((f) => fieldIds.includes(f.id));
}

export async function getUsers(): Promise<AmoUser[]> {
  return amoPaginate<AmoUser>("/api/v4/users?limit=250", "users");
}

// helpers used in dashboard.ts
export function getCustomFieldString(
  lead: AmoLead,
  fieldId: number
): string | null {
  const cf = lead.custom_fields_values?.find((c) => c.field_id === fieldId);
  if (!cf) return null;
  const v = (cf as AmoCustomFieldValueString).values?.[0]?.value;
  return v ?? null;
}

export function getCustomFieldEnumId(
  lead: AmoLead,
  fieldId: number
): number | null {
  const cf = lead.custom_fields_values?.find((c) => c.field_id === fieldId);
  if (!cf) return null;
  const v = (cf as AmoCustomFieldValueEnum).values?.[0]?.enum_id;
  return v ?? null;
}