// lib/amocrm.ts

const AMO_BASE_URL = process.env.AMO_BASE_URL;
const AMO_LONG_LIVED_TOKEN = process.env.AMO_LONG_LIVED_TOKEN;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic request to amoCRM v4 API using long-lived token.
 * Includes exponential backoff retry on 429 rate limit errors.
 */
export async function amoRequest(
  path: string,
  options: RequestInit = {},
  retryCount = 0,
  maxRetries = 3
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

  // Handle 429 rate limit with exponential backoff retry
  if (res.status === 429 && retryCount < maxRetries) {
    const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s
    console.warn(
      `[amoRequest] Rate limited (429). Retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`
    );
    await sleep(backoffMs);
    return amoRequest(path, options, retryCount + 1, maxRetries);
  }

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
 * Paginates through all results (amoCRM API returns max 250 per page).
 */
export async function getLeadsByCreatedAt(
  fromUnix: number,
  toUnix: number
): Promise<AmoLead[]> {
  // amoCRM supports filters: filter[created_at][from], [to]
  const allLeads: AmoLead[] = [];
  let page = 1;
  const pageSize = 250;
  
  while (true) {
    const url = `/api/v4/leads?limit=${pageSize}&page=${page}&filter[created_at][from]=${fromUnix}&filter[created_at][to]=${toUnix}`;
    const data = await amoRequest(url);
    const leads = data?._embedded?.leads || [];
    
    if (leads.length === 0) {
      break; // No more pages
    }
    
    allLeads.push(...leads);
    console.log(`[AmoCRM] Fetched page ${page}: ${leads.length} leads (total: ${allLeads.length})`);
    
    // Check if there are more pages
    if (leads.length < pageSize) {
      break; // Last page (fewer results than requested)
    }
    
    page++;
  }
  
  return allLeads;
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

/**
 * Get enum mapping for a specific custom field (enum_id -> text value).
 * Returns { enum_id: "enum_text" }
 */
export async function getFieldEnumMapping(fieldId: number): Promise<Record<number, string>> {
  try {
    const data = await amoRequest("/api/v4/leads/custom_fields?limit=250");
    const fields = data?._embedded?.custom_fields || [];
    const field = fields.find((f: any) => f.id === fieldId);
    
    if (!field || !field.enums) {
      return {};
    }
    
    const map: Record<number, string> = {};
    field.enums.forEach((en: any) => {
      map[en.id] = en.value;
    });
    return map;
  } catch (err) {
    console.error(`[amocrm] Error fetching enum mapping for field ${fieldId}:`, err);
    return {};
  }
}

/**
 * Get status mapping (status_id -> status name) from amoCRM pipelines.
 * Returns { status_id: "Status Name" }
 */
export async function getStatusMapping(): Promise<Record<number, string>> {
  try {
    const data = await amoRequest("/api/v4/leads/pipelines?limit=250");
    const pipelines = data?._embedded?.pipelines || [];
    const map: Record<number, string> = {};
    
    pipelines.forEach((p: any) => {
      const statuses = p?._embedded?.statuses || [];
      statuses.forEach((s: any) => {
        map[s.id] = s.name;
      });
    });
    return map;
  } catch (err) {
    console.error("[amocrm] Error fetching status mapping:", err);
    return {};
  }
}
