// app/api/meta/route.ts
import { NextResponse } from "next/server";
import {
  getPipelinesMeta,
  getPipelineStatusesMeta,
  getLossReasonsMeta,
} from "@/lib/amocrmMeta";

export async function GET() {
  try {
    const pipelines = await getPipelinesMeta();

    // Decide which pipeline to use for stages
    let sotuvPipelineId: number | null = null;

    const envVal = process.env.SOTUV_PIPELINE_ID;
    if (envVal) {
      const num = Number(envVal);
      if (!Number.isNaN(num)) {
        sotuvPipelineId = num;
      }
    }

    // Fallback: take the first pipeline from amo if env not set or invalid
    if ((!sotuvPipelineId || Number.isNaN(sotuvPipelineId)) && pipelines.length > 0) {
      sotuvPipelineId = pipelines[0].id;
      console.warn(
        "[/api/meta] Using first pipeline as Sotuv because SOTUV_PIPELINE_ID is missing or invalid"
      );
    }

    let statuses: { id: number; name: string }[] = [];
    if (sotuvPipelineId) {
      statuses = await getPipelineStatusesMeta(sotuvPipelineId);
    }

    const lossReasons = await getLossReasonsMeta();

    return NextResponse.json({
      pipelines,
      sotuvPipelineId,
      statuses,
      lossReasons,
    });
  } catch (err: any) {
    console.error("[/api/meta] error:", err);
    return NextResponse.json(
      { error: "Failed to load amoCRM meta data" },
      { status: 500 }
    );
  }
}
