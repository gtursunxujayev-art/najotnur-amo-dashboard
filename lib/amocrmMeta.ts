// lib/amocrmMeta.ts
import { getPipelines, getLeadCustomFields } from "@/lib/amocrm";

export async function getAllPipelinesWithStatuses(pipelineIds?: number[]) {
  const pipes = await getPipelines(pipelineIds);
  return pipes.map((p) => ({
    id: p.id,
    name: p.name,
    statuses: p.statuses || [],
  }));
}

// amoCRM loss reasons come from a "loss reasons" field in leads.
// In your project this is already stored in dashboardConfig as field id list.
// So meta route only needs custom fields list.
export async function getLossReasons(fieldIds: number[]) {
  const fields = await getLeadCustomFields(fieldIds);
  // return enums in unified format
  return fields.flatMap((f) =>
    (f.enums || []).map((e) => ({
      id: e.id,
      name: e.value,
      fieldId: f.id,
      fieldName: f.name,
    }))
  );
}

export { getLeadCustomFields };