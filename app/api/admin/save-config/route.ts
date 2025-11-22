import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringify(obj: any) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, "$1:") // remove quotes from keys
    .replace(/"/g, '"'); // keep string quotes
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = path.join(process.cwd(), "config", "dashboardConfig.ts");

    // Load current file text
    let text = fs.readFileSync(filePath, "utf8");

    // Extract current dashboardConfig object if exists
    const match = text.match(/export const dashboardConfig = ({[\s\S]*?});/m);
    let current: any = {};

    if (match) {
      try {
        // very safe eval-like parse:
        // convert TS object to JSON-ish string
        const tsObj = match[1];
        const jsonish = tsObj
          .replace(/(\w+)\s*:/g, '"$1":')   // add quotes to keys
          .replace(/'/g, '"')             // single → double
          .replace(/,\s*}/g, "}")         // trailing commas
          .replace(/,\s*]/g, "]");

        current = JSON.parse(jsonish);
      } catch {
        current = {};
      }
    }

    // Apply updates
    if (body.type === "constructor") {
      current = {
        ...current,
        ...body.data,
      };
    }

    if (body.type === "tushum") {
      current.REVENUE_SHEETS = {
        ...(current.REVENUE_SHEETS || {}),
        ...body.data,
      };
    }

    // Ensure backward compatible aliases exist
    current.REVENUE_SHEETS_URL = current.REVENUE_SHEETS?.link || "";
    current.REVENUE_MANAGER_COLUMN = current.REVENUE_SHEETS?.managerColumn || "";
    current.REVENUE_DATE_COLUMN = current.REVENUE_SHEETS?.dateColumn || "";
    current.REVENUE_PAYMENT_TYPE_COLUMN = current.REVENUE_SHEETS?.paymentTypeColumn || "";
    current.REVENUE_INCOME_TYPE_COLUMN = current.REVENUE_SHEETS?.incomeTypeColumn || "";
    current.REVENUE_AMOUNT_COLUMN = current.REVENUE_SHEETS?.amountColumn || "";
    current.REVENUE_COURSE_TYPE_COLUMN = current.REVENUE_SHEETS?.courseTypeColumn || "";

    // Rebuild file
    const newBlock = `export const dashboardConfig = ${stringify(current)};\n\n` +
      `dashboardConfig.REVENUE_SHEETS_URL = dashboardConfig.REVENUE_SHEETS.link;\n` +
      `dashboardConfig.REVENUE_MANAGER_COLUMN = dashboardConfig.REVENUE_SHEETS.managerColumn;\n` +
      `dashboardConfig.REVENUE_DATE_COLUMN = dashboardConfig.REVENUE_SHEETS.dateColumn;\n` +
      `dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.paymentTypeColumn;\n` +
      `dashboardConfig.REVENUE_INCOME_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.incomeTypeColumn;\n` +
      `dashboardConfig.REVENUE_AMOUNT_COLUMN = dashboardConfig.REVENUE_SHEETS.amountColumn;\n` +
      `dashboardConfig.REVENUE_COURSE_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.courseTypeColumn;\n\n` +
      `export const DASHBOARD_CONFIG = dashboardConfig;\n` +
      `export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;\n`;

    if (text.includes("export const dashboardConfig")) {
      text = text.replace(
        /export const dashboardConfig = {[\s\S]*?};[\s\S]*?(export const REVENUE_SHEETS =[\s\S]*?;)?/m,
        newBlock
      );
    } else {
      text += "\n\n" + newBlock;
    }

    fs.writeFileSync(filePath, text, "utf8");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[save-config] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}