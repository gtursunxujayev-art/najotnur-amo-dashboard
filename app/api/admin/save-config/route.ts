// app/api/admin/save-config/route.ts
import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_OWNER = process.env.GITHUB_OWNER!;
const GITHUB_REPO = process.env.GITHUB_REPO!;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

const FILE_PATH = "config/dashboardConfig.ts";

type SaveBody =
  | { type: "constructor"; data: any }
  | { type: "tushum"; data: any };

async function githubGetFile() {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("GitHub file read failed");
  return res.json();
}

async function githubUpdateFile(content: string, sha: string, message: string) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("GitHub update failed: " + txt);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveBody;

    const file = await githubGetFile();
    const sha = file.sha;
    const raw = Buffer.from(file.content, "base64").toString("utf8");

    // cfg objectni regex bilan topib olamiz
    const match = raw.match(/const cfg: DashboardConfig = (\{[\s\S]*?\});/);
    if (!match) throw new Error("cfg not found in dashboardConfig.ts");

    const cfgText = match[1];

    // eslint-disable-next-line no-eval
    const currentCfg = eval("(" + cfgText + ")");

    let newCfg = { ...currentCfg };

    if (body.type === "constructor") {
      newCfg = {
        ...newCfg,
        ...body.data,
      };
    }

    if (body.type === "tushum") {
      newCfg = {
        ...newCfg,
        REVENUE_SHEETS: {
          ...(newCfg.REVENUE_SHEETS || {}),
          ...body.data,
        },
      };
    }

    const updatedCfgText = JSON.stringify(newCfg, null, 2);

    const updatedFile =
      raw.replace(
        /const cfg: DashboardConfig = (\{[\s\S]*?\});/,
        `const cfg: DashboardConfig = ${updatedCfgText};`
      );

    const commitMsg =
      body.type === "constructor"
        ? "Update constructor dashboard config"
        : "Update revenue sheets config";

    await githubUpdateFile(updatedFile, sha, commitMsg);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}