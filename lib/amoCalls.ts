// lib/amoCalls.ts

import { amoRequest } from "@/lib/amocrm";

export type AmoCallRow = {
  managerId: number;
  datetime: Date;
  durationSec: number;
  callUniq?: string;
};

/**
 * Fetch call notes from a specific entity type endpoint
 */
async function fetchCallsFromEntity(
  entityType: string,
  fromUnix: number,
  toUnix: number
): Promise<AmoCallRow[]> {
  const result: AmoCallRow[] = [];
  
  let url =
    `/api/v4/${entityType}/notes` +
    `?limit=250` +
    `&filter[note_type][]=call_in` +
    `&filter[note_type][]=call_out` +
    `&filter[created_at][from]=${fromUnix}` +
    `&filter[created_at][to]=${toUnix}`;

  let pageCount = 0;

  while (url) {
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

    const nextHref: string | undefined = data?._links?.next?.href;
    if (nextHref) {
      url = nextHref;
      pageCount++;
    } else {
      url = "";
    }
  }

  console.log(`[AmoCalls] Fetched ${result.length} calls from ${entityType} (${pageCount + 1} page(s))`);
  return result;
}

/**
 * Fetch call notes (call_in, call_out) from amoCRM for the given period.
 * Fetches from all entity types: leads, contacts, companies, and customers.
 * This matches the amoCRM call statistics page which shows calls from all entities.
 * Returns empty array on error instead of throwing to prevent dashboard crashes.
 */
export async function getAmoCalls(
  from: Date,
  to: Date
): Promise<AmoCallRow[]> {
  const allCalls: AmoCallRow[] = [];
  
  try {
    console.log(`[AmoCalls] Fetching calls from ${from.toISOString()} to ${to.toISOString()}`);
    console.log(`[AmoCalls] Fetching from all entity types: leads, contacts, companies, customers`);
    
    const fromUnix = Math.floor(from.getTime() / 1000);
    const toUnix = Math.floor(to.getTime() / 1000);

    // Fetch calls from all 4 entity types
    const entityTypes = ['leads', 'contacts', 'companies', 'customers'];
    
    for (const entityType of entityTypes) {
      try {
        const calls = await fetchCallsFromEntity(entityType, fromUnix, toUnix);
        allCalls.push(...calls);
      } catch (error: any) {
        console.error(`[AmoCalls] Error fetching calls from ${entityType}:`, error.message);
        // Continue with other entity types even if one fails
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
