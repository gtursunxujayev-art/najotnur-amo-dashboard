// lib/amocrm.ts

const AMO_BASE_URL = process.env.AMO_BASE_URL;
const AMO_LONG_LIVED_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

/**
 * Generic request to amoCRM v4 API using long-lived token.
 */
export async function amoRequest(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  if (!AMO_BASE_URL || !AMO_LONG_LIVED_TOKEN) {
    throw new Error("AMO_BASE_URL or AMO_LONG_LIVED_TOKEN is not set");
  }

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
    // Vercel edge can reuse connection better with no cache
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("amoRequest error", res.status, txt);
    throw new Error(`amoCRM error ${res.status}: ${txt}`);
  }

  return res.json();
}

export type AmoLead = {
  id: number;
  name?: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  created_at?: number; // unix seconds
  closed_at?: number | null;
  loss_reason_id?: number | null;
  responsible_user_id?: number;
};

/**
 * Get leads created within [from, to] in unix seconds.
 */
export async function getLeadsByCreatedAt(
  fromUnix: number,
  toUnix: number
): Promise<AmoLead[]> {
  // amoCRM supports filters: filter[created_at][from], [to]
  const url = `/api/v4/leads?limit=250&filter[created_at][from]=${fromUnix}&filter[created_at][to]=${toUnix}`;
  const data = await amoRequest(url);
  return data?._embedded?.leads || [];
}

/**
 * Get users (managers) for name mapping.
 */
export async function getUsers(): Promise<{ id: number; name: string }[]> {
  const data = await amoRequest("/api/v4/users");
  const users = data?._embedded?.users || [];
  return users.map((u: any) => ({ id: u.id, name: u.name }));
}

/**
 * Get loss reasons for nicer labels in pie chart.
 */
export async function getLossReasons(): Promise<Record<number, string>> {
  const data = await amoRequest("/api/v4/leads/loss_reasons");
  const reasons = data?._embedded?.loss_reasons || [];
  const map: Record<number, string> = {};
  reasons.forEach((r: any) => {
    map[r.id] = r.name;
  });
  return map;
}
