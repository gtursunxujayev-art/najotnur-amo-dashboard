// lib/amocrm.ts

const AMO_BASE_URL = process.env.AMO_BASE_URL;
const AMO_LONG_LIVED_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

if (!AMO_BASE_URL || !AMO_LONG_LIVED_TOKEN) {
  console.warn("AMO_BASE_URL yoki AMO_LONG_LIVED_TOKEN yo‘q. amoCRM ishlamasligi mumkin.");
}

// ----------------------
//   UNIVERSAL REQUEST
// ----------------------
export async function amoRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = path.startsWith("http")
    ? path
    : `${AMO_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AMO_LONG_LIVED_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`amoCRM error ${res.status}: ${txt}`);
  }

  return res.json();
}

// ----------------------
//      TYPES
// ----------------------
export type AmoLead = {
  id: number;
  created_at?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  price?: number;
  loss_reason_id?: number | null;
};

// ----------------------
//     GET LEADS
// ----------------------
export async function getLeadsByCreatedAt(
  fromUnix: number,
  toUnix: number
): Promise<AmoLead[]> {
  const url =
    `/api/v4/leads?limit=250` +
    `&filter[created_at][from]=${fromUnix}` +
    `&filter[created_at][to]=${toUnix}`;

  const data = await amoRequest(url);
  return data?._embedded?.leads || [];
}

// ----------------------
//     GET USERS
// ----------------------
export async function getUsers(): Promise<{ id: number; name: string }[]> {
  const data = await amoRequest("/api/v4/users");
  const users = data?._embedded?.users || [];
  return users.map((u: any) => ({
    id: u.id,
    name: u.name,
  }));
}

// ----------------------
//     LOSS REASONS
// ----------------------
export async function getLossReasons(): Promise<Record<number, string>> {
  const data = await amoRequest("/api/v4/leads/loss_reasons");
  const reasons = data?._embedded?.loss_reasons || [];

  const map: Record<number, string> = {};
  reasons.forEach((r: any) => {
    map[r.id] = r.name;
  });
  return map;
}