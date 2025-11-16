// app/api/meta/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getPipelinesMeta,
  getPipelineStatusesMeta,
  getLossReasonsMeta,
  getLeadCustomFieldsMeta,
} from "@/lib/amocrmMeta";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const pipelineParam = search.get("pipelineId");

    const pipelines = await getPipelinesMeta();

    let sotuvPipelineId: number | null = null;

    if (pipelineParam) {
      const num = Number(pipelineParam);
      if (!Number.isNaN(num)) sotuvPipelineId = num;
    }

    // If no pipelineId in query → try env → fallback to first pipeline
    if (!sotuvPipelineId) {
      const envVal = process.env.SOTUV_PIPELINE_ID;
      if (envVal && !Number.isNaN(Number(envVal))) {
        sotuvPipelineId = Number(envVal);
      } else if (pipelines.length > 0) {
        sotuvPipelineId = pipelines[0].id;
        console.warn(
          "[/api/meta] Using first pipeline as default; consider setting SOTUV_PIPELINE_ID"
        );
      }
    }

    let statuses: { id: number; name: string }[] = [];
    if (sotuvPipelineId) {
      statuses = await getPipelineStatusesMeta(sotuvPipelineId);
    }

    const lossReasons = await getLossReasonsMeta();
    const customFields = await getLeadCustomFieldsMeta();

    return NextResponse.json({
      pipelines,
      sotuvPipelineId,
      statuses,
      lossReasons,
      customFields,
    });
  } catch (err: any) {
    console.error("[/api/meta] error:", err);
    return NextResponse.json(
      { error: "Failed to load amoCRM meta data" },
      { status: 500 }
    );
  }
}
