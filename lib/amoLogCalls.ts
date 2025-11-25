// lib/amoLogCalls.ts
import { amoRequest } from "@/lib/amocrm";
import { getUsers } from "@/lib/amocrm";

export type CallToLog = {
  phone: string;
  direction: "in" | "out"; // inbound or outbound
  duration: number; // seconds
  managerId?: number; // amoCRM user ID
  date: Date;
  callId?: string; // unique identifier
};

/**
 * Log a call to amoCRM as a call note on a lead
 * Creates a call note (call_in or call_out) attached to leads
 * amoCRM API: POST /api/v4/leads/{id}/notes
 */
export async function logCallToAmoCRM(
  leadId: number,
  call: CallToLog
): Promise<boolean> {
  try {
    const noteType = call.direction === "in" ? "call_in" : "call_out";
    const durationMs = call.duration * 1000; // amoCRM wants milliseconds

    const noteData = {
      note_type: noteType,
      params: {
        duration: call.duration, // seconds
        uniq: call.callId || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: "onlinepbx-import", // track source
      },
      created_at: Math.floor(call.date.getTime() / 1000), // Unix timestamp
    };

    // Add responsible user if available
    if (call.managerId) {
      (noteData as any).responsible_user_id = call.managerId;
    }

    const url = `/api/v4/leads/${leadId}/notes`;
    const result = await amoRequest(url, {
      method: "POST",
      body: JSON.stringify([noteData]),
    });

    console.log(`[amoLogCalls] Logged call to lead ${leadId}: ${call.phone} (${call.duration}s)`);
    return true;
  } catch (error: any) {
    console.error(`[amoLogCalls] Error logging call to lead ${leadId}:`, error.message);
    return false;
  }
}

/**
 * Log calls to a lead using the /complex endpoint
 * This adds multiple call notes in one request
 */
export async function logCallsToAmoCRMComplex(
  leadId: number,
  calls: CallToLog[]
): Promise<number> {
  try {
    const notes = calls.map((call) => ({
      note_type: call.direction === "in" ? "call_in" : "call_out",
      params: {
        duration: call.duration,
        uniq: call.callId || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: "onlinepbx-import",
      },
      created_at: Math.floor(call.date.getTime() / 1000),
      responsible_user_id: call.managerId,
    }));

    const url = `/api/v4/leads/${leadId}/notes`;
    await amoRequest(url, {
      method: "POST",
      body: JSON.stringify(notes),
    });

    console.log(`[amoLogCalls] Logged ${calls.length} calls to lead ${leadId}`);
    return calls.length;
  } catch (error: any) {
    console.error(`[amoLogCalls] Error logging calls to lead ${leadId}:`, error.message);
    return 0;
  }
}

/**
 * Find or create a lead for a phone number and log calls to it
 * This is useful for syncing OnlinePBX calls to amoCRM
 */
export async function logCallsByPhone(
  phone: string,
  calls: CallToLog[]
): Promise<boolean> {
  try {
    // Search for existing lead with this phone number
    const url = `/api/v4/leads?filter[phone]=${encodeURIComponent(phone)}&limit=1`;
    const result = await amoRequest(url);
    const leads = result?._embedded?.leads || [];

    if (leads.length > 0) {
      const leadId = leads[0].id;
      const logged = await logCallsToAmoCRMComplex(leadId, calls);
      console.log(`[amoLogCalls] Found existing lead ${leadId} for phone ${phone}, logged ${logged} calls`);
      return logged > 0;
    } else {
      console.warn(`[amoLogCalls] No lead found for phone ${phone}`);
      return false;
    }
  } catch (error: any) {
    console.error(`[amoLogCalls] Error logging calls by phone:`, error.message);
    return false;
  }
}

/**
 * Get amoCRM user ID by manager name
 */
export async function getManagerIdByName(managerName: string): Promise<number | null> {
  try {
    const users = await getUsers();
    const user = users.find(
      (u) => u.name.toLowerCase().includes(managerName.toLowerCase())
    );
    return user?.id || null;
  } catch (error: any) {
    console.error(`[amoLogCalls] Error finding manager:`, error.message);
    return null;
  }
}
