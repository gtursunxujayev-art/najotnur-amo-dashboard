import { NextResponse } from "next/server";
import { amoRequest } from "@/app/lib/amocrm";

export async function GET() {
  try {
    const leads = await amoRequest("leads");

    return NextResponse.json(leads);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
