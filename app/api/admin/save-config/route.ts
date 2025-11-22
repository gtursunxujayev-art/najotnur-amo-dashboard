import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Load the existing config file
    const filePath = path.join(process.cwd(), "config", "dashboardConfig.ts");
    const configText = fs.readFileSync(filePath, "utf8");

    // Simple text-based replacement of REVENUE_SHEETS section
    if (body.type === "tushum") {
      const block = `
export const REVENUE_SHEETS = {
  link: "${body.data.link || ""}",
  managerColumn: "${body.data.managerColumn || ""}",
  dateColumn: "${body.data.dateColumn || ""}",
  paymentTypeColumn: "${body.data.paymentTypeColumn || ""}",
  incomeTypeColumn: "${body.data.incomeTypeColumn || ""}",
  amountColumn: "${body.data.amountColumn || ""}",
};`;

      let updated = configText;
      if (updated.includes("export const REVENUE_SHEETS")) {
        updated = updated.replace(
          /export const REVENUE_SHEETS[\s\S]*?};/m,
          block.trim()
        );
      } else {
        updated += "\n\n" + block.trim();
      }

      fs.writeFileSync(filePath, updated, "utf8");
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[save-config] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}