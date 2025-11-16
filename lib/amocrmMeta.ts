// lib/amocrmMeta.ts
// Helpers for amoCRM "meta" data: pipelines, stages, loss reasons.

const AMO_BASE_URL = process.env.AMO_BASE_URL!;
const AMO_TOKEN = process.env.AMO_LONG_LIVED_TOKEN!;

if (!AMO_BASE_URL || !AMO_TOKEN) {
  // This will show in server logs if env is missing
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
    // Next.js app router requires this for server-side fetch
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

// All pipelines
export async function getPipelinesMeta(): Promise<AmoPipeline[]> {
  const data = await amoMetaFetch("/api/v4/leads/pipelines");
  const pipelines = data?._embedded?.pipelines ?? [];
  return pipelines.map((p: any) => ({
    id: Number(p.id),
    name: String(p.name),
  }));
}

// One pipeline with its statuses (stages)
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

// Loss reasons (E'tiroz sababi)
export async function getLossReasonsMeta(): Promise<AmoLossReason[]> {
  const data = await amoMetaFetch("/api/v4/leads/loss_reasons");
  const reasons = data?._embedded?.loss_reasons ?? [];
  return reasons.map((r: any) => ({
    id: Number(r.id),
    name: String(r.name),
  }));
}
