// app/api/telegram/set-webhook/route.ts

import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN is not set" },
        { status: 500 }
      );
    }

    // Get the webhook URL from query param or construct it
    const { searchParams } = new URL(req.url);
    let webhookUrl = searchParams.get("url");

    if (!webhookUrl) {
      // Auto-construct from request headers
      const host = req.headers.get("host") || "localhost:5000";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      webhookUrl = `${protocol}://${host}/api/telegram/webhook`;
    }

    console.log("[telegram set-webhook] Setting webhook to:", webhookUrl);

    // Call Telegram API to set webhook
    const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const res = await fetch(setWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      }),
    });

    const data = await res.json();
    console.log("[telegram set-webhook] Response:", JSON.stringify(data));

    if (!data.ok) {
      return NextResponse.json(
        { error: "Failed to set webhook", details: data },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      webhook_url: webhookUrl,
      message: "Webhook set successfully",
      telegram_response: data,
    });
  } catch (err) {
    console.error("[telegram set-webhook] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN is not set" },
        { status: 500 }
      );
    }

    // Get webhook info from Telegram
    const getWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
    const res = await fetch(getWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    console.log("[telegram set-webhook] Current webhook info:", JSON.stringify(data));

    return NextResponse.json({
      ok: true,
      webhook_info: data.result || data,
    });
  } catch (err) {
    console.error("[telegram set-webhook] Error getting webhook info:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
