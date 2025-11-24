// lib/telegram.ts

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.warn(
    "[telegram] TELEGRAM_BOT_TOKEN is not set. Telegram reports will not work."
  );
}

/**
 * Sends a PDF buffer to a Telegram chat as a document.
 *
 * @param chatId   Telegram chat ID (bigint or number)
 * @param pdfBytes PDF as Uint8Array (from generateDashboardPdf)
 * @param caption  Message text under the document
 */
export async function sendTelegramPdf(
  chatId: bigint | number,
  pdfBytes: Uint8Array,
  caption: string
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[telegram] Missing TELEGRAM_BOT_TOKEN env");
    return;
  }

  try {
    console.log(`[telegram] Sending PDF to chat ${chatId}, PDF size: ${pdfBytes.length} bytes`);
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("caption", caption);

    // pdfBytes is Uint8Array<ArrayBufferLike> – TS is strict about BlobPart.
    // We cast to any so it is accepted as a BlobPart at compile time.
    const bytesForBlob: any = pdfBytes;
    const blob = new Blob([bytesForBlob], { type: "application/pdf" });
    form.append("document", blob, "dashboard-report.pdf");

    console.log(`[telegram] Making request to ${url}`);
    const res = await fetch(url, {
      method: "POST",
      body: form as any,
    });

    const responseText = await res.text().catch(() => "");
    
    if (!res.ok) {
      console.error(
        `[telegram] sendDocument FAILED - Status: ${res.status} ${res.statusText}`,
        `Response: ${responseText}`
      );
      throw new Error(`Telegram API error ${res.status}: ${responseText}`);
    }

    console.log(`[telegram] PDF sent successfully to chat ${chatId}`);
  } catch (err: any) {
    console.error(`[telegram] Error sending PDF: ${err?.message || err}`);
    throw err;
  }
}
