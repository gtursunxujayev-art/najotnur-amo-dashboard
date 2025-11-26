// lib/utelCalls.ts
/**
 * UTel PBX Integration
 * Fetches call data from UTel API (second PBX system alongside OnlinePBX)
 */

export interface UtelCallData {
  id: string;
  direction: "in" | "out"; // incoming or outgoing
  date: Date;
  duration: number; // in seconds
  phone: string;
  extension: string; // manager extension
  name?: string; // manager name if available
}

/**
 * Fetch calls from UTel API
 */
export async function fetchUtelCalls(
  fromDate: Date,
  toDate: Date
): Promise<UtelCallData[]> {
  try {
    const token = process.env.UTEL_API_TOKEN;
    const baseUrl = process.env.UTEL_API_URL;

    if (!token || !baseUrl) {
      console.error("[UtelCalls] Missing UTEL_API_TOKEN or UTEL_API_URL");
      return [];
    }

    const fromUnix = Math.floor(fromDate.getTime() / 1000);
    const toUnix = Math.floor(toDate.getTime() / 1000);

    console.log(
      `[UtelCalls] Fetching calls from ${fromDate.toISOString()} to ${toDate.toISOString()} (Unix: ${fromUnix} to ${toUnix})`
    );

    // Try multiple common UTel API endpoints
    const endpoints = [
      `/cdr?from=${fromUnix}&to=${toUnix}`,
      `/api/cdr?from=${fromUnix}&to=${toUnix}`,
      `/v1/cdr?from=${fromUnix}&to=${toUnix}`,
      `/calls?from=${fromUnix}&to=${toUnix}`,
    ];

    let calls: UtelCallData[] = [];

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint}`;
        console.log(`[UtelCalls] Trying endpoint: ${url}`);
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`[UtelCalls] Response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(
            `[UtelCalls] Successfully fetched from ${endpoint}. Response type: ${typeof data}, isArray: ${Array.isArray(data)}`
          );
          console.log(
            `[UtelCalls] Raw response keys: ${Object.keys(data).join(", ")}`
          );
          console.log(`[UtelCalls] Raw response (first 1000 chars): ${JSON.stringify(data).substring(0, 1000)}`);

          // Parse response based on common formats
          if (Array.isArray(data)) {
            console.log(
              `[UtelCalls] Data is direct array with ${data.length} items`
            );
            calls = parseUtelResponse(data);
          } else if (data.data && Array.isArray(data.data)) {
            console.log(
              `[UtelCalls] Data found in .data property with ${data.data.length} items`
            );
            calls = parseUtelResponse(data.data);
          } else if (data.calls && Array.isArray(data.calls)) {
            console.log(
              `[UtelCalls] Data found in .calls property with ${data.calls.length} items`
            );
            calls = parseUtelResponse(data.calls);
          } else if (data.records && Array.isArray(data.records)) {
            console.log(
              `[UtelCalls] Data found in .records property with ${data.records.length} items`
            );
            calls = parseUtelResponse(data.records);
          } else {
            console.log(
              `[UtelCalls] No recognized array format in response from ${endpoint}`
            );
          }

          if (calls.length > 0) {
            console.log(
              `[UtelCalls] Parsed ${calls.length} calls from ${endpoint}`
            );
            return calls;
          }
        } else {
          const text = await response.text();
          console.log(
            `[UtelCalls] Endpoint ${endpoint} returned status ${response.status}: ${text.substring(0, 500)}`
          );
        }
      } catch (endpointError) {
        console.log(
          `[UtelCalls] Endpoint ${endpoint} failed: ${endpointError}`
        );
        continue;
      }
    }

    console.log(
      "[UtelCalls] No successful endpoints found or no calls returned"
    );
    return [];
  } catch (error) {
    console.error("[UtelCalls] Error fetching calls:", error);
    return [];
  }
}

/**
 * Parse UTel API response into standardized format
 */
function parseUtelResponse(data: any[]): UtelCallData[] {
  return data
    .map((call) => {
      try {
        // Try to handle various field name formats
        const timestamp =
          call.timestamp ||
          call.date ||
          call.call_date ||
          call.datetime ||
          call.start_time;
        const duration =
          call.duration ||
          call.call_duration ||
          call.length ||
          call.duration_sec ||
          0;
        const direction =
          (call.direction || call.type || "")
            .toLowerCase()
            .startsWith("in") ||
          (call.direction || call.type || "") === "1" ||
          (call.direction || call.type || "").startsWith("inbound")
            ? "in"
            : "out";

        return {
          id: call.id || call.call_id || `${timestamp}-${call.extension}`,
          direction,
          date: new Date(
            typeof timestamp === "number"
              ? timestamp * 1000
              : new Date(timestamp)
          ),
          duration: parseInt(duration) || 0,
          phone:
            call.phone ||
            call.caller ||
            call.called ||
            call.from ||
            call.to ||
            "Unknown",
          extension: call.extension || call.ext || call.user || "Unknown",
          name:
            call.name ||
            call.extension_name ||
            call.user_name ||
            call.manager,
        };
      } catch (parseError) {
        console.error("[UtelCalls] Error parsing call record:", parseError);
        return null;
      }
    })
    .filter((call) => call !== null) as UtelCallData[];
}
