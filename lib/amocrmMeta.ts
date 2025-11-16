// lib/amocrmMeta.ts
// Helpers for amoCRM "meta" data: pipelines, stages, loss reasons (E'tiroz sababi).

const AMO_BASE_URL = process.env.AMO_BASE_URL!;
const AMO_TOKEN = process.env.AMO_LONG_LIVED_TOKEN!;

if (!AMO_BASE_URL || !AMO_TOKEN) {
  console.warn(
    "[amoMeta] AMO_BASE_URL or AMO_LONG_LIVED_TOKEN is not set in env"
  );
}

async function amoMetaFetch(path: string, init: RequestInit = {}) {
  const url = `${AMO_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${AMO_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[amoMeta] Error", res.status, path, text);
    throw new Error(`amoCRM meta error ${res.status} on ${path}`);
  }

  return res.json();
}

export type AmoPipeline = {
  id: number;
  name: string;
};

export type AmoStatus = {
  id: number;
  name: string;
};

export type AmoLossReason = {
  id: number;
  name: string;
};

// ───────────────── pipelines & stages ─────────────────

export async function getPipelinesMeta(): Promise<AmoPipeline[]> {
  const data = await amoMetaFetch("/api/v4/leads/pipelines");
  const pipelines = data?._embedded?.pipelines ?? [];
  return pipelines.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name),
  }));
}

export async function getPipelineStatusesMeta(
  pipelineId: number
): Promise<AmoStatus[]> {
  const data = await amoMetaFetch(`/api/v4/leads/pipelines/${pipelineId}`);
  const statuses = data?._embedded?.statuses ?? [];
  return statuses.map((s: any) => ({
    id: Number(s.id),
    name: String(s.name),
  }));
}

// ───────────────── loss reasons / E'tiroz sababi ─────────────────
//
// We first try to read enums of custom field "E'tiroz sababi"
// from /api/v4/leads/custom_fields.
// If not found (or error), we fall back to global /leads/loss_reasons
// so the page still works.

export async function getLossReasonsMeta(): Promise<AmoLossReason[]> {
  // 1) Try custom field "E'tiroz sababi"
  try {
    const data = await amoMetaFetch("/api/v4/leads/custom_fields");
    const fields = data?._embedded?.custom_fields ?? [];

    const targetField = fields.find((f: any) => {
      const name = String(f.name || "").toLowerCase();
      return (
        name.includes("e'tiroz sababi") ||
        name.includes("eʼtiroz sababi") ||
        name.includes("e'tiroz") // more tolerant match
      );
    });

    if (targetField && targetField.enums) {
      // In amoCRM v4 enums is an object: { [enum_id]: { value: string, ... } }
      const enumsObj = targetField.enums as Record<
        string,
        { value: string; [k: string]: any }
      >;

      const list: AmoLossReason[] = Object.entries(enumsObj).map(
        ([enumId, enumVal]) => ({
          id: Number(enumId),
          name: String((enumVal as any).value),
        })
      );

      if (list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.error("[amoMeta] error reading custom field E'tiroz sababi:", err);
  }

  // 2) Fallback: global loss reasons (those Russian ones)
  try {
    const data = await amoMetaFetch("/api/v4/leads/loss_reasons");
    const reasons = data?._embedded?.loss_reasons ?? [];
    return reasons.map((r: any) => ({
      id: Number(r.id),
      name: String(r.name),
    }));
  } catch (err) {
    console.error("[amoMeta] error reading /loss_reasons:", err);
    return [];
  }
}

