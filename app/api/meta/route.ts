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

    const sotuvPipelineIdEnv = process.env.SOTUV_PIPELINE_ID;
    const sotuvPipelineId = sotuvPipelineIdEnv
      ? Number(sotuvPipelineIdEnv)
      : null;

    let statuses: { id: number; name: string }[] = [];

    if (sotuvPipelineId && !Number.isNaN(sotuvPipelineId)) {
      statuses = await getPipelineStatusesMeta(sotuvPipelineId);
    }

    const lossReasons = await getLossReasonsMeta();

    return NextResponse.json({
      pipelines,
      statuses,
      lossReasons,
      sotuvPipelineId,
    });
  } catch (err: any) {
    console.error("[/api/meta] error:", err);
    return NextResponse.json(
      { error: "Failed to load amoCRM meta data" },
      { status: 500 }
    );
  }
}
