// lib/reportPdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildDashboardData } from "@/lib/dashboard";
import { getPeriodDates } from "@/lib/period";
import type { Period } from "@/lib/dashboard";

function formatMoney(num: number): string {
  return new Intl.NumberFormat("uz-UZ", {
    maximumFractionDigits: 0,
  }).format(num);
}

export async function generateDashboardPdf(
  period: Period,
  periodLabelOverride?: string
): Promise<Uint8Array> {
  // Convert period → { from, to, label }
  const { from, to, label } = getPeriodDates(period);

  // IMPORTANT: buildDashboardData takes { from, to }
  const data = await buildDashboardData({ from, to });

  const periodLabel = periodLabelOverride || label;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;

  // --------------------
  // HEADER
  // --------------------
  page.drawText("Najot Nur — Sotuv bo‘limi hisobot", {
    x: 40,
    y,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 26;

  const now = new Date();

  page.drawText(`Davr: ${periodLabel}`, {
    x: 40,
    y,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 16;

  page.drawText(`Generatsiya: ${now.toLocaleString("ru-RU")}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });
  y -= 28;

  // --------------------
  // BLOCK 1 – GENERAL METRICS
  // --------------------
  page.drawText("1. Umumiy ko‘rsatkichlar", {
    x: 40,
    y,
    size: 13,
    font: bold,
  });
  y -= 20;

  const lines = [
    `Kelishuv summasi: ${formatMoney(data.kelishuvSummasi)} so'm`,
    `Sotuv — Online: ${formatMoney(data.onlineSummasi)} so'm`,
    `Sotuv — Offline: ${formatMoney(data.offlineSummasi)} so'm`,
    `Lidlar jami: ${data.leadsCount}`,
    `Sifatli lidlar: ${data.qualifiedLeadsCount}`,
    `Sifatsiz lidlar: ${data.notQualifiedLeadsCount}`,
    `Sotib olganlar (Won): ${data.wonLeadsCount}`,
    `Konversiya (sifatli → sotuv): ${(data.conversionFromQualified * 100).toFixed(1)}%`,
  ];

  for (const t of lines) {
    page.drawText(t, { x: 50, y, size: 10, font });
    y -= 14;
  }

  y -= 20;

  // --------------------
  // BLOCK 2 – NOT QUALIFIED REASONS
  // --------------------
  page.drawText("2. Sifatsiz lidlar sabablari", {
    x: 40,
    y,
    size: 13,
    font: bold,
  });
  y -= 20;

  const reasons = data.nonQualifiedReasons || data.notQualifiedReasons || [];

  if (!reasons.length) {
    page.drawText("Sifatsiz lidlar sabablari mavjud emas.", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 16;
  } else {
    page.drawText("Sabab", { x: 50, y, size: 10, font: bold });
    page.drawText("Soni", { x: 350, y, size: 10, font: bold });
    y -= 14;

    for (const r of reasons) {
      if (y < 60) {
        y = height - 60;
        page.drawText("Davom etadi…", {
          x: 40,
          y,
          size: 9,
          font,
        });
        y -= 20;
      }

      page.drawText(String(r.name), { x: 50, y, size: 9, font });
      page.drawText(String(r.count), { x: 350, y, size: 9, font });

      y -= 12;
    }
  }

  y -= 20;

  // --------------------
  // BLOCK 3 – TOP 5 SALES MANAGERS
  // --------------------
  page.drawText("3. Menejerlar bo‘yicha sotuvlar (TOP 5)", {
    x: 40,
    y,
    size: 13,
    font: bold,
  });
  y -= 18;

  const managerSales = (data.managerSales || data.managersSales || []).slice(
    0,
    5
  );

  if (!managerSales.length) {
    page.drawText("Tanlangan davr uchun sotuvlar topilmadi.", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 14;
  } else {
    const cols = [50, 220, 320, 400, 480];
    const headers = ["Menejer", "Lidlar", "Sifatli", "Sotuv", "Tushum"];

    headers.forEach((h, i) =>
      page.drawText(h, { x: cols[i], y, size: 9, font: bold })
    );
    y -= 14;

    for (const m of managerSales) {
      if (y < 60) {
        y = height - 60;
        page.drawText("Davom etadi…", { x: 40, y, size: 9, font });
        y -= 20;
      }

      const row = [
        m.managerName || m.manager,
        String(m.totalLeads ?? m.leads ?? 0),
        String(m.qualifiedLeads ?? m.qualified ?? 0),
        String(m.wonDeals ?? m.won ?? 0),
        formatMoney(m.wonAmount ?? m.revenue ?? 0),
      ];

      row.forEach((v, i) =>
        page.drawText(v, { x: cols[i], y, size: 8, font })
      );

      y -= 12;
    }
  }

  return await pdfDoc.save();
}