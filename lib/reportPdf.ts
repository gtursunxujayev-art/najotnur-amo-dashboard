// lib/reportPdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Period } from "@/lib/dashboard";
import { buildDashboardData } from "@/lib/dashboard";

function formatMoney(num: number): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(num);
}

export async function generateDashboardPdf(
  period: Period,
  periodLabel?: string
): Promise<Uint8Array> {
  const data = await buildDashboardData(period, periodLabel);
  const label = periodLabel || data.periodLabel;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;

  page.drawText("Najot Nur sotuv bo‘limi — hisobot", {
    x: 40,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  const now = new Date();
  page.drawText(`Davr: ${label}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 14;

  page.drawText(
    `Hisobot generatsiya qilingan sana: ${now.toLocaleString("ru-RU")}`,
    { x: 40, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) }
  );
  y -= 24;

  page.drawText("1. Umumiy ko‘rsatkichlar", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

  const lines: string[] = [
    `Kelishuv summasi: ${formatMoney(data.kelishuvSummasi)} so‘m`,
    `Sotuv — online: ${formatMoney(data.onlineSummasi)} so‘m`,
    `Sotuv — offline: ${formatMoney(data.offlineSummasi)} so‘m`,
    `Lidlar jami: ${data.leadsCount.toLocaleString("ru-RU")}`,
    `Sifatli lidlar: ${data.qualifiedLeadsCount.toLocaleString("ru-RU")}`,
    `Sifatsiz lidlar: ${data.nonQualifiedLeadsCount.toLocaleString("ru-RU")}`,
    `Sotib olganlar (won): ${data.wonLeadsCount.toLocaleString("ru-RU")}`,
    `Konversiya (sifatli → sotuv): ${(data.conversionQualifiedToWon * 100).toFixed(1)}%`,
  ];

  lines.forEach((text) => {
    page.drawText(text, {
      x: 50,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 14;
  });

  y -= 10;

  page.drawText("2. Sifatsiz lidlar sabablari", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

  const reasons = data.nonQualifiedReasons || [];

  if (!reasons.length) {
    page.drawText("Sifatsiz lidlar sabablari haqida ma’lumot yo‘q.", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 14;
  } else {
    page.drawText("Sabab", { x: 50, y, size: 10, font: fontBold });
    page.drawText("Soni", { x: 350, y, size: 10, font: fontBold });
    y -= 12;

    reasons.forEach((r) => {
      page.drawText(String(r.name), { x: 50, y, size: 9, font });
      page.drawText(String(r.count), { x: 350, y, size: 9, font });
      y -= 11;
    });
  }

  y -= 14;

  page.drawText("3. Menejerlar bo‘yicha sotuvlar (TOP 5)", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

  const managerSales = (data.managerSales || []).slice(0, 5);

  if (!managerSales.length) {
    page.drawText("Tanlangan davr uchun sotuvlar topilmadi.", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 14;
  } else {
    const colXs = [50, 220, 320, 400, 480];
    const headers = ["Menejer", "Lidlar", "Sifatli", "Sotuvlar", "Tushum"];

    headers.forEach((h, i) =>
      page.drawText(h, { x: colXs[i], y, size: 9, font: fontBold })
    );
    y -= 12;

    managerSales.forEach((m) => {
      const vals = [
        m.managerName,
        String(m.totalLeads),
        String(m.qualifiedLeads),
        String(m.wonDeals),
        formatMoney(m.wonAmount),
      ];
      vals.forEach((v, i) =>
        page.drawText(v, { x: colXs[i], y, size: 8, font })
      );
      y -= 11;
    });
  }

  y -= 14;

  page.drawText("4. Menejerlar bo‘yicha qo‘ng‘iroqlar (TOP 5)", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

  const managerCalls = (data.managerCalls || []).slice(0, 5);

  if (!managerCalls.length) {
    page.drawText("Qo‘ng‘iroqlar statistikasi topilmadi.", {
      x: 50,
      y,
      size: 10,
      font,
    });
  } else {
    const colXs = [50, 220, 320, 420, 500];
    const headers = ["Menejer", "Calls", "Success", "Min", "Avg sec"];

    headers.forEach((h, i) =>
      page.drawText(h, { x: colXs[i], y, size: 9, font: fontBold })
    );
    y -= 12;

    managerCalls.forEach((m) => {
      const vals = [
        m.managerName,
        String(m.totalCalls),
        String(m.successCalls),
        String(m.totalDurationMin.toFixed(1)),
        String(m.avgDurationSec.toFixed(1)),
      ];
      vals.forEach((v, i) =>
        page.drawText(v, { x: colXs[i], y, size: 8, font })
      );
      y -= 11;
    });
  }

  return await pdfDoc.save();
}