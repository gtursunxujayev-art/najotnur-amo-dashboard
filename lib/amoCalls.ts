// lib/amoCalls.ts

import { amoRequest } from "@/lib/amocrm";

export type AmoCallRow = {
  managerId: number;
  datetime: Date;
  durationSec: number;
};

/**
 * Fetch call notes (call_in, call_out) from amoCRM for the given period.
 * We read them from /api/v4/leads/notes and follow pagination via _links.next.
 */
export async function getAmoCalls(
  from: Date,
  to: Date
): Promise<AmoCallRow[]> {
  const fromUnix = Math.floor(from.getTime() / 1000);
  const toUnix = Math.floor(to.getTime() / 1000);

  let url =
    `/api/v4/leads/notes` +
    `?limit=250` +
    `&filter[note_type][]=call_in` +
    `&filter[note_type][]=call_out` +
    `&filter[created_at][from]=${fromUnix}` +
    `&filter[created_at][to]=${toUnix}`;

  const result: AmoCallRow[] = [];

  while (url) {
    const data = await amoRequest(url);
    const notes = data?._embedded?.notes || [];

    for (const n of notes) {
      const managerId = n.responsible_user_id || n.created_by || 0;
      const createdAt = new Date(((n.created_at as number) || 0) * 1000);
      const duration = Number(n.params?.duration || 0);

      result.push({
        managerId,
        datetime: createdAt,
        durationSec: duration,
      });
    }

    const nextHref: string | undefined = data?._links?.next?.href;
    if (nextHref) {
      url = nextHref;
    } else {
      url = "";
    }
  }

  return result;
}
