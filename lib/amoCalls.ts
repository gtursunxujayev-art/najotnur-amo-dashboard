// lib/amoCalls.ts

import { amoRequest } from "@/lib/amocrm";
import { callsCache } from "@/lib/callsCache";

export type AmoCallRow = {
  managerId: number;
  datetime: Date;
  durationSec: number;
  callUniq?: string;
};

/**
 * Fetch call notes from a specific entity type endpoint with pagination support.
 * amoCRM API has 250-item limit per page, using _links.next.href for pagination.
 * Limits to 50 pages per entity to prevent timeouts.
 * Returns empty array on error instead of throwing (prevents dashboard crash on rate limit).
 */
async function fetchCallsFromEntity(
  entityType: string,
  fromUnix: number,
  toUnix: number,
  maxPages: number = 15,
  delayMs: number = 0
): Promise<AmoCallRow[]> {
  const result: AmoCallRow[] = [];
  const startTime = Date.now();
  const maxDurationMs = 8000; // Stop after 8 seconds to prevent timeouts
  
  // Add delay before starting to throttle rapid-fire requests
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  
  let url =
    `/api/v4/${entityType}/notes` +
    `?limit=250` +
    `&filter[note_type][]=call_in` +
    `&filter[note_type][]=call_out` +
    `&filter[created_at][from]=${fromUnix}` +
    `&filter[created_at][to]=${toUnix}`;

  let pageCount = 0;

  while (url && pageCount < maxPages) {
    // Check if we've exceeded time limit
    if (Date.now() - startTime > maxDurationMs) {
      console.log(`[AmoCalls] Time limit (${maxDurationMs}ms) reached for ${entityType}, stopping pagination`);
      break;
    }
    
    try {
      const data = await amoRequest(url);
      const notes = data?._embedded?.notes || [];

      for (const n of notes) {
        const managerId = n.responsible_user_id || n.created_by || 0;
        const createdAt = new Date(((n.created_at as number) || 0) * 1000);
        const duration = Number(n.params?.duration || 0);
        const callUniq = n.params?.uniq;

        result.push({
          managerId,
          datetime: createdAt,
          durationSec: duration,
          callUniq,
        });
      }

      pageCount++;
      const nextHref: string | undefined = data?._links?.next?.href;
      if (nextHref && notes.length === 250) {
        url = nextHref;
        // Add small delay between pagination requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        url = "";
      }
    } catch (error: any) {
      console.error(`[AmoCalls] Error fetching calls from ${entityType}:`, error?.message);
      // Return what we have so far instead of crashing
      break;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[AmoCalls] Fetched ${result.length} calls from ${entityType} (${pageCount} page(s)${pageCount >= maxPages ? ' [MAX REACHED]' : ''}) in ${duration}ms`);
  return result;
}

/**
 * Fetch call notes (call_in, call_out) from amoCRM for the given period.
 * Uses smart caching: returns cached data instantly if fresh (< 1 hour old),
 * fetches from amoCRM only if cache is missing or stale.
 * Fetches from all entity types: leads, contacts, companies, and customers.
 * This matches the amoCRM call statistics page which shows calls from all entities.
 * Returns empty array on error instead of throwing to prevent dashboard crashes.
 */
export async function getAmoCalls(
  from: Date,
  to: Date
): Promise<AmoCallRow[]> {
  // Use cache key based on period start date (YYYY-MM-DD)
  // This ensures different periods (today, week, month) have different cache keys
  const fromDateStr = from.toISOString().split('T')[0]; // e.g., "2025-11-24"
  const toDateStr = to.toISOString().split('T')[0]; // e.g., "2025-11-24"
  // Include both dates to differentiate between periods (today vs week vs month)
  const cacheKey = `calls-${fromDateStr}-to-${toDateStr}`;
  
  // Check if we have fresh cached data
  const cachedCalls = callsCache.get(cacheKey);
  if (cachedCalls) {
    // Convert ISO strings back to Date objects
    return cachedCalls.map(c => ({
      ...c,
      datetime: typeof c.datetime === 'string' ? new Date(c.datetime) : c.datetime,
    }));
  }
  
  // Cache is stale or missing - fetch from amoCRM
  const allCalls: AmoCallRow[] = [];
  
  try {
    console.log(`[AmoCalls] Cache miss or stale for "${cacheKey}" - fetching from amoCRM`);
    console.log(`[AmoCalls] Fetching calls from ${from.toISOString()} to ${to.toISOString()}`);
    console.log(`[AmoCalls] Fetching from all entity types: leads, contacts, companies, customers`);
    
    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(to.getTime() / 1000);

    // Fetch calls from ALL entity types with pagination and rate limiting
    // amoCRM has 250-item limit per page, pagination uses _links.next.href
    // Multiple entities (leads, contacts, companies, customers) can have calls attached
    const entities = ['leads', 'contacts', 'companies', 'customers'];
    
    for (const entity of entities) {
      try {
        console.log(`[AmoCalls] Fetching calls from ${entity}...`);
        const calls = await fetchCallsFromEntity(entity, fromUnix, toUnix);
        allCalls.push(...calls);
        console.log(`[AmoCalls] Successfully fetched ${calls.length} calls from ${entity}`);
        
        // Debug: Show date range of fetched calls
        if (calls.length > 0) {
          const dates = calls.map(c => c.datetime.toISOString().split('T')[0]);
          const uniqueDates = Array.from(new Set(dates)).sort();
          console.log(`[AmoCalls] ${entity} calls span dates: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
        }
        
        // Small delay to respect rate limits (amoCRM: 1 request per 100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`[AmoCalls] Error fetching calls from ${entity}:`, error.message);
        // Continue with other entities even if one fails
      }
    }

    console.log(`[AmoCalls] Total call records fetched: ${allCalls.length} (including duplicates across entities)`);
    
    // Deduplicate calls by params.uniq (same physical call attached to multiple entities)
    // Calls without uniq are kept (can't deduplicate them)
    const uniqueCallsMap = new Map<string, AmoCallRow>();
    const callsWithoutUniq: AmoCallRow[] = [];
    
    for (const call of allCalls) {
      if (call.callUniq) {
        // Has uniq - use for deduplication
        if (!uniqueCallsMap.has(call.callUniq)) {
          uniqueCallsMap.set(call.callUniq, call);
        }
      } else {
        // No uniq - keep all of them (can't deduplicate)
        callsWithoutUniq.push(call);
      }
    }
    
    const uniqueCalls = [...Array.from(uniqueCallsMap.values()), ...callsWithoutUniq];
    const duplicatesRemoved = allCalls.length - uniqueCalls.length;
    console.log(`[AmoCalls] Unique calls after deduplication: ${uniqueCalls.length} (removed ${duplicatesRemoved} duplicates, kept ${callsWithoutUniq.length} without uniq)`);
    
    // Cache the results for 1 hour
    // Serialize Date objects to ISO strings for proper caching
    const serializableCalls = uniqueCalls.map(c => ({
      ...c,
      datetime: c.datetime.toISOString(),
    }));
    callsCache.set(cacheKey, serializableCalls as any);
    
    // Convert back to Date objects for return
    return uniqueCalls;
  } catch (error: any) {
    console.error("[AmoCalls] Error fetching calls from amoCRM:", error.message);
    
    // Return partial data if we collected some before the error
    if (allCalls.length > 0) {
      console.warn(`[AmoCalls] Returning ${allCalls.length} calls collected before error (partial data)`);
      return allCalls;
    }
    
    console.error("[AmoCalls] No calls collected - dashboard will show empty call statistics");
    return [];
  }
}
