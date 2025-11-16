import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FILE_PATH = "config/dashboardConfig.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const configText = body?.configText as string | undefined;

    if (!configText || typeof configText !== "string") {
      return NextResponse.json(
        { error: "configText is required" },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !owner || !repo) {
      return NextResponse.json(
        {
          error:
            "Missing GitHub env vars. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.",
        },
        { status: 500 }
      );
    }

    // 1) get current file sha (if file already exists)
    let sha: string | undefined;

    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        FILE_PATH
      )}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    if (getRes.ok) {
      const json = (await getRes.json()) as { sha?: string };
      if (json.sha) sha = json.sha;
    } else if (getRes.status !== 404) {
      const txt = await getRes.text();
      console.error("GitHub get file error:", txt);
      return NextResponse.json(
        { error: "GitHub GET error: " + getRes.status },
        { status: 500 }
      );
    }

    // 2) commit new content
    const contentBase64 = Buffer.from(configText, "utf8").toString("base64");

    const putBody: any = {
      message: "Update dashboardConfig from Admin constructor",
      content: contentBase64,
      branch,
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
        FILE_PATH
      )}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(putBody),
      }
    );

    if (!putRes.ok) {
      const txt = await putRes.text();
      console.error("GitHub put file error:", txt);
      return NextResponse.json(
        { error: "GitHub PUT error: " + putRes.status },
        { status: 500 }
      );
    }

    const json = await putRes.json();

    return NextResponse.json({
      ok: true,
      commitSha: json.commit?.sha,
      message:
        "Config saved to GitHub. Vercel will redeploy automatically in ~1–2 minutes.",
    });
  } catch (err: any) {
    console.error("save-config API error:", err);
    return NextResponse.json(
      { error: "Unexpected error: " + String(err?.message || err) },
      { status: 500 }
    );
  }
}
