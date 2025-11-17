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

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);

  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  form.append("document", blob, "dashboard-report.pdf");

  const res = await fetch(url, {
    method: "POST",
    body: form as any,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "[telegram] sendDocument error",
      res.status,
      res.statusText,
      text
    );
  }
}
