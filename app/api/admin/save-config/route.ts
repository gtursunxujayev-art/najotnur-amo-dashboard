import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GH_TOKEN = process.env.GITHUB_TOKEN!;
const GH_OWNER = process.env.GITHUB_OWNER!;
const GH_REPO = process.env.GITHUB_REPO!;
const GH_BRANCH = process.env.GITHUB_BRANCH || "main";

const FILE_PATH = "config/dashboardConfig.ts";

function b64encode(str: string) {
  return Buffer.from(str, "utf8").toString("base64");
}

function b64decode(str: string) {
  return Buffer.from(str, "base64").toString("utf8");
}

// Convert object to TS object literal string
function toTsObject(obj: any) {
  return JSON.stringify(obj, null, 2)
    .replace(/"([^"]+)":/g, "$1:") // remove quotes from keys
    .replace(/null/g, "null")
    .replace(/true|false/g, (m) => m);
}

async function githubGetFile() {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${FILE_PATH}?ref=${GH_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub GET failed: " + text);
  }
  return res.json() as Promise<{ content: string; sha: string }>;
}

async function githubPutFile(newContent: string, sha: string, message: string) {
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: b64encode(newContent),
      sha,
      branch: GH_BRANCH,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub PUT failed: " + text);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.type) {
      return NextResponse.json({ ok: false, error: "type is required" }, { status: 400 });
    }

    // 1) read file from GitHub
    const { content, sha } = await githubGetFile();
    let text = b64decode(content);

    // 2) parse current dashboardConfig block (best-effort)
    const match = text.match(/export const dashboardConfig = ({[\s\S]*?});/m);
    let current: any = {};

    if (match) {
      try {
        const tsObj = match[1];
        const jsonish = tsObj
          .replace(/(\w+)\s*:/g, '"$1":')
          .replace(/'/g, '"')
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        current = JSON.parse(jsonish);
      } catch {
        current = {};
      }
    }

    // 3) apply updates
    if (body.type === "constructor") {
      current = { ...current, ...body.data };
    }

    if (body.type === "tushum") {
      current.REVENUE_SHEETS = {
        ...(current.REVENUE_SHEETS || {}),
        ...body.data,
      };
    }

    // 4) keep backward-compatible aliases
    current.REVENUE_SHEETS_URL = current.REVENUE_SHEETS?.link || "";
    current.REVENUE_MANAGER_COLUMN = current.REVENUE_SHEETS?.managerColumn || "";
    current.REVENUE_DATE_COLUMN = current.REVENUE_SHEETS?.dateColumn || "";
    current.REVENUE_PAYMENT_TYPE_COLUMN = current.REVENUE_SHEETS?.paymentTypeColumn || "";
    current.REVENUE_INCOME_TYPE_COLUMN = current.REVENUE_SHEETS?.incomeTypeColumn || "";
    current.REVENUE_AMOUNT_COLUMN = current.REVENUE_SHEETS?.amountColumn || "";
    current.REVENUE_COURSE_TYPE_COLUMN = current.REVENUE_SHEETS?.courseTypeColumn || "";

    // 5) rebuild dashboardConfig.ts block
    const newBlock =
`export const dashboardConfig = ${toTsObject(current)};

dashboardConfig.REVENUE_SHEETS_URL = dashboardConfig.REVENUE_SHEETS.link;
dashboardConfig.REVENUE_MANAGER_COLUMN = dashboardConfig.REVENUE_SHEETS.managerColumn;
dashboardConfig.REVENUE_DATE_COLUMN = dashboardConfig.REVENUE_SHEETS.dateColumn;
dashboardConfig.REVENUE_PAYMENT_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.paymentTypeColumn;
dashboardConfig.REVENUE_INCOME_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.incomeTypeColumn;
dashboardConfig.REVENUE_AMOUNT_COLUMN = dashboardConfig.REVENUE_SHEETS.amountColumn;
dashboardConfig.REVENUE_COURSE_TYPE_COLUMN = dashboardConfig.REVENUE_SHEETS.courseTypeColumn;

export const DASHBOARD_CONFIG = dashboardConfig;
export const REVENUE_SHEETS = dashboardConfig.REVENUE_SHEETS;
`;

    if (text.includes("export const dashboardConfig =")) {
      text = text.replace(/export const dashboardConfig = {[\s\S]*?};[\s\S]*?export const REVENUE_SHEETS =[\s\S]*?;/m, newBlock);
    } else {
      text += "\n\n" + newBlock;
    }

    // 6) push to GitHub (triggers redeploy)
    await githubPutFile(text, sha, `Update dashboardConfig (${body.type})`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[save-config] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}