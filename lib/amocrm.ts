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
 * Get leads closed (won) within [from, to] in unix seconds.
 * Used to count sales by close date instead of creation date.
 * Paginates through all results (amoCRM API returns max 250 per page).
 */
export async function getLeadsByClosedAt(
  fromUnix: number,
  toUnix: number
): Promise<AmoLead[]> {
  // amoCRM supports filters: filter[closed_at][from], [to]
  const allLeads: AmoLead[] = [];
  let page = 1;
  const pageSize = 250;
  
  while (true) {
    const url = `/api/v4/leads?limit=${pageSize}&page=${page}&filter[closed_at][from]=${fromUnix}&filter[closed_at][to]=${toUnix}`;
    const data = await amoRequest(url);
    const leads = data?._embedded?.leads || [];
    
    if (leads.length === 0) {
      break; // No more pages
    }
    
    allLeads.push(...leads);
    console.log(`[AmoCRM] Fetched page ${page} (closed_at): ${leads.length} leads (total: ${allLeads.length})`);
    
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

// Cache for active leads data (TTL: 1 hour)
let activeLeadsCache: {
  data: Map<number, number>;
  timestamp: number;
} | null = null;
const ACTIVE_LEADS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Pending promise to prevent concurrent fetches
let activeLeadsFetchPromise: Promise<Map<number, number>> | null = null;

/**
 * Calculate average reach time (minutes from lead creation to first call).
 * Returns map of manager name -> average reach time in minutes
 */
export async function getAverageReachTimePerManager(
  newLeads: AmoLead[],
  callsByManager: Map<string, any[]>,
  usersMap: Map<number, string>
): Promise<Map<string, number>> {
  const reachTimes = new Map<string, number[]>();
  
  // For each new lead, find the first call made by its manager after creation
  newLeads.forEach((lead) => {
    const managerId = lead.responsible_user_id || 0;
    const managerName = usersMap.get(managerId) || `User ${managerId}`;
    const leadCreatedUnix = lead.created_at || 0;
    const leadCreatedMs = leadCreatedUnix * 1000;
    
    // Get all calls for this manager
    const managerCalls = callsByManager.get(managerName) || [];
    
    // Find first call after lead was created
    const callsAfterLead = managerCalls.filter((call: any) => {
      const callTimeMs = new Date(call.timestamp || call.dateTime).getTime();
      return callTimeMs >= leadCreatedMs;
    });
    
    if (callsAfterLead.length > 0) {
      // Sort by time and get first call
      const firstCall = callsAfterLead.sort((a: any, b: any) => {
        const timeA = new Date(a.timestamp || a.dateTime).getTime();
        const timeB = new Date(b.timestamp || b.dateTime).getTime();
        return timeA - timeB;
      })[0];
      
      const firstCallMs = new Date(firstCall.timestamp || firstCall.dateTime).getTime();
      const reachTimeMinutes = (firstCallMs - leadCreatedMs) / (1000 * 60);
      
      if (!reachTimes.has(managerName)) {
        reachTimes.set(managerName, []);
      }
      reachTimes.get(managerName)!.push(reachTimeMinutes);
    }
  });
  
  // Calculate average for each manager
  const averages = new Map<string, number>();
  reachTimes.forEach((times, managerName) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    averages.set(managerName, Math.round(avg));
  });
  
  return averages;
}

/**
 * Get current active leads count per manager.
 * Active leads = leads that are NOT won (142) and NOT lost (143) from specific pipelines.
 * This is real-time data, not period-dependent.
 * Results are cached for 1 hour to improve performance.
 */
export async function getCurrentActiveLeadsPerManager(
  pipelineIds: number[], // Query only these pipelines for faster performance
  wonStatusIds: number[],
  lostStatusIds: number[]
): Promise<Map<number, number>> {
  // Check cache first
  if (activeLeadsCache && Date.now() - activeLeadsCache.timestamp < ACTIVE_LEADS_CACHE_TTL) {
    console.log("[AmoCRM] Using cached active leads data");
    return activeLeadsCache.data;
  }
  
  // If a fetch is already in progress, wait for it instead of starting a new one
  if (activeLeadsFetchPromise) {
    console.log("[AmoCRM] Another active leads fetch in progress, waiting...");
    return activeLeadsFetchPromise;
  }
  
  // Start fetch and store promise to prevent concurrent fetches
  activeLeadsFetchPromise = (async () => {
    const activeLeadsByManager = new Map<number, number>();
    
    console.log(`[AmoCRM] Fetching current active leads from ${pipelineIds.length} pipelines (not won/lost)...`);
    console.log(`[AmoCRM] Pipeline IDs: ${pipelineIds.join(',')}`);
    console.log(`[AmoCRM] Won statuses: ${wonStatusIds.join(',')}, Lost statuses: ${lostStatusIds.join(',')}`);
    
    let page = 1;
    const pageSize = 250;
    let totalActive = 0;
    let totalLeads = 0;
    
    try {
      while (true) {
        // Query only leads from target pipelines using API filter (much faster than fetching all leads)
        const pipelineFilter = pipelineIds.map(id => `filter[pipeline_id][]=${id}`).join('&');
        const url = `/api/v4/leads?${pipelineFilter}&limit=${pageSize}&page=${page}`;
        
        if (page === 1) {
          console.log(`[AmoCRM] Query URL: ${url}`);
          console.log(`[AmoCRM] Using API filter for pipelines (fast mode)`);
        }
        
        const data = await amoRequest(url);
        const leads = data?._embedded?.leads || [];
        
        if (leads.length === 0) {
          break;
        }
        
        totalLeads += leads.length;
        
        // Count active leads per manager (filter status only, pipeline already filtered by API)
        leads.forEach((lead: AmoLead) => {
          const statusId = lead.status_id || -1;
          const managerId = lead.responsible_user_id || 0;
          
          // Skip won leads
          if (wonStatusIds.includes(statusId)) {
            return;
          }
          
          // Skip lost leads
          if (lostStatusIds.includes(statusId)) {
            return;
          }
          
          // This is an active lead in one of the target pipelines
          activeLeadsByManager.set(managerId, (activeLeadsByManager.get(managerId) || 0) + 1);
          totalActive++;
        });
        
        console.log(`[AmoCRM] Page ${page}: ${leads.length} leads, ${totalActive} active so far`);
        
        if (leads.length < pageSize) {
          break;
        }
        
        page++;
      }
      
      console.log(`[AmoCRM] Total leads processed: ${totalLeads}, Active leads: ${totalActive}`);
      
      // Update cache
      activeLeadsCache = {
        data: activeLeadsByManager,
        timestamp: Date.now()
      };
      
      return activeLeadsByManager;
    } finally {
      // Clear the pending promise when done
      activeLeadsFetchPromise = null;
    }
  })();
  
  return activeLeadsFetchPromise;
}

/**
 * Pre-warm the active leads cache by fetching data in the background.
 * This should be called on server initialization to ensure cache is ready
 * before user requests come in.
 * Uses default config values for pipeline and status IDs.
 */
export async function warmActiveLeadsCache(): Promise<void> {
  const { dashboardConfig } = await import('@/config/dashboardConfig');
  
  const pipelineIds = dashboardConfig.ACTIVE_LEADS_PIPELINE_IDS || dashboardConfig.PIPELINE_IDS;
  const wonStatusIds = dashboardConfig.WON_STATUS_IDS;
  const lostStatusIds = dashboardConfig.LOST_STATUS_IDS;
  
  console.log('[AmoCRM] Pre-warming active leads cache...');
  console.log(`[AmoCRM] Using pipeline IDs: ${pipelineIds.join(',')}`);
  
  try {
    const result = await getCurrentActiveLeadsPerManager(pipelineIds, wonStatusIds, lostStatusIds);
    console.log(`[AmoCRM] Cache warmed successfully with ${result.size} managers`);
  } catch (err: any) {
    console.error('[AmoCRM] Cache warming failed:', err?.message);
  }
}

/**
 * Check if active leads cache is populated and valid.
 */
export function isActiveLeadsCacheReady(): boolean {
  return activeLeadsCache !== null && (Date.now() - activeLeadsCache.timestamp < ACTIVE_LEADS_CACHE_TTL);
}

// Cache for completed follow-ups
let completedFollowUpsCache: {
  data: Map<number, number>;
  timestamp: number;
} | null = null;
let followUpsFetchPromise: Promise<Map<number, number>> | null = null;
const FOLLOW_UPS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get completed tasks (follow-ups) for managers within a date range.
 * Returns count of completed tasks per manager.
 * A task is considered "completed" when its task_result is not null/empty.
 * Results are cached for 30 minutes to reduce API load.
 */
export async function getCompletedFollowUpsByManager(
  fromUnix: number,
  toUnix: number
): Promise<Map<number, number>> {
  // Check cache first
  if (completedFollowUpsCache && Date.now() - completedFollowUpsCache.timestamp < FOLLOW_UPS_CACHE_TTL) {
    console.log("[AmoCRM] Using cached follow-ups data");
    return completedFollowUpsCache.data;
  }
  
  // If a fetch is already in progress, wait for it instead of starting a new one
  if (followUpsFetchPromise) {
    console.log("[AmoCRM] Another follow-ups fetch in progress, waiting...");
    return followUpsFetchPromise;
  }
  
  // Start fetch and store promise to prevent concurrent fetches
  followUpsFetchPromise = (async () => {
    const completedByManager = new Map<number, number>();
    
    try {
      console.log(`[AmoCRM] Fetching completed tasks from ${fromUnix} to ${toUnix}...`);
      
      let page = 1;
      const pageSize = 250;
      let totalTasks = 0;
      let totalCompleted = 0;
      
      while (true) {
        const url = `/api/v4/tasks?limit=${pageSize}&page=${page}&filter[updated_at][from]=${fromUnix}&filter[updated_at][to]=${toUnix}`;
        
        const data = await amoRequest(url);
        const tasks = data?._embedded?.tasks || [];
        
        if (tasks.length === 0) {
          break;
        }
        
        totalTasks += tasks.length;
        
        // Count completed tasks per manager
        tasks.forEach((task: any) => {
          // A task is completed if task_result is set (has value, not null/empty)
          const taskResult = task.task_result?.result;
          if (taskResult) {
            const managerId = task.responsible_user_id || task.created_by || 0;
            completedByManager.set(managerId, (completedByManager.get(managerId) || 0) + 1);
            totalCompleted++;
          }
        });
        
        if (page === 1 || page % 5 === 0) {
          console.log(`[AmoCRM] Follow-ups page ${page}: ${tasks.length} tasks, ${totalCompleted} completed so far`);
        }
        
        if (tasks.length < pageSize) {
          break;
        }
        
        page++;
      }
      
      console.log(`[AmoCRM] Completed follow-ups fetch: ${totalTasks} total tasks, ${totalCompleted} completed`);
      
      // Update cache
      completedFollowUpsCache = {
        data: completedByManager,
        timestamp: Date.now()
      };
      
      return completedByManager;
    } catch (error) {
      console.error("[AmoCRM] Error fetching completed follow-ups:", error);
      return new Map<number, number>();
    } finally {
      // Clear the pending promise when done
      followUpsFetchPromise = null;
    }
  })();
  
  return followUpsFetchPromise;
}
