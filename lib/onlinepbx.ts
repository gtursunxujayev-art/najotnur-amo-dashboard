// lib/onlinepbx.ts
// OnlinePBX API client for fetching real-time call data

const BASE_URL = "https://api2.onlinepbx.ru";

// DOMAIN should be in format: "example.onpbx.ru"
// If env var is just "najot", auto-append ".onpbx.ru"
let rawDomain = process.env.ONLINEPBX_DOMAIN || "najot";
const DOMAIN = rawDomain.includes(".onpbx.ru") ? rawDomain : `${rawDomain}.onpbx.ru`;
const API_KEY = process.env.ONLINEPBX_API_KEY || "";

console.log(`[OnlinePBX] Initialized with domain: ${DOMAIN}`);

export type OnlinePBXCall = {
  id: string;
  type: "in" | "out"; // incoming or outgoing
  date: Date;
  duration: number; // seconds
  phone: string; // phone number
  user: string; // user name
  userId?: number; // user id
  recordUrl?: string; // call recording URL
};

/**
 * Parse RFC 2822 date format required by OnlinePBX API
 */
function toRFC2822(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Fetch call history from OnlinePBX API
 * Uses the mongo_history endpoint (newer database)
 */
export async function getOnlinePBXCalls(
  from: Date,
  to: Date
): Promise<OnlinePBXCall[]> {
  if (!API_KEY) {
    console.error("[OnlinePBX] No API key configured");
    return [];
  }

  try {
    console.log(
      `[OnlinePBX] Fetching calls from ${from.toISOString()} to ${to.toISOString()}`
    );

    const dateFrom = toRFC2822(from);
    const dateTo = toRFC2822(to);

    const url = `${BASE_URL}/${DOMAIN}/mongo_history/search.json`;

    console.log(`[OnlinePBX] Request URL: ${url}`);
    console.log(`[OnlinePBX] Date range: ${dateFrom} to ${dateTo}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: API_KEY, // API key goes in header, not body
      },
      body: JSON.stringify({
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[OnlinePBX] API returned status ${response.status}:`,
        errorText
      );
      return [];
    }

    const data = await response.json();

    console.log(`[OnlinePBX] Response:`, JSON.stringify(data).substring(0, 200));

    // Check for API errors
    if (data.status === "0" || data.errorCode) {
      console.error("[OnlinePBX] API error:", data.comment || data.errorCode);
      return [];
    }

    const calls: OnlinePBXCall[] = [];

    // Parse response - data.data contains call records
    const histories = data.data || [];

    console.log(`[OnlinePBX] Response contains ${histories.length} records`);

    for (const record of histories) {
      // Parse call type (1 = incoming, 0 = outgoing)
      const type = record.in_out === 1 ? "in" : "out";

      // Parse timestamp - onlinePBX uses Unix timestamp
      const timestamp = new Date((record.timestamp || 0) * 1000);

      // Parse duration
      const duration = parseInt(record.duration) || 0;

      // Parse phone number
      const phone = record.phone || record.from_number || "Unknown";

      // Parse user name
      const user = record.user || record.user_name || "Unknown";

      calls.push({
        id: record.id || `${record.timestamp}-${phone}`,
        type,
        date: timestamp,
        duration,
        phone,
        user,
        userId: record.user_id ? parseInt(record.user_id) : undefined,
        recordUrl: record.record_url,
      });
    }

    console.log(`[OnlinePBX] Parsed ${calls.length} calls`);
    return calls;
  } catch (error) {
    console.error("[OnlinePBX] Error fetching calls:", error);
    return [];
  }
}

/**
 * Get OnlinePBX users list
 */
export async function getOnlinePBXUsers() {
  if (!API_KEY) {
    console.error("[OnlinePBX] No API key configured");
    return [];
  }

  try {
    const url = `${BASE_URL}/${DOMAIN}/user/get.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      console.error(
        `[OnlinePBX] Users API returned status ${response.status}`
      );
      return [];
    }

    const data = await response.json();

    if (data.status === "0" || data.errorCode) {
      console.error("[OnlinePBX] API error:", data.comment || data.errorCode);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("[OnlinePBX] Error fetching users:", error);
    return [];
  }
}

/**
 * Group calls by user with statistics
 */
export function groupCallsByUser(calls: OnlinePBXCall[]) {
  const grouped = new Map<
    string,
    {
      user: string;
      userId?: number;
      totalCalls: number;
      incomingCalls: number;
      outgoingCalls: number;
      totalDuration: number;
      avgDuration: number;
    }
  >();

  for (const call of calls) {
    const key = call.user;
    const existing = grouped.get(key) || {
      user: call.user,
      userId: call.userId,
      totalCalls: 0,
      incomingCalls: 0,
      outgoingCalls: 0,
      totalDuration: 0,
      avgDuration: 0,
    };

    existing.totalCalls++;
    if (call.type === "in") {
      existing.incomingCalls++;
    } else {
      existing.outgoingCalls++;
    }
    existing.totalDuration += call.duration;
    existing.avgDuration = Math.round(
      existing.totalDuration / existing.totalCalls
    );

    grouped.set(key, existing);
  }

  return Array.from(grouped.values());
}
