// lib/reportPdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildDashboardData, Period } from "@/lib/dashboard";

function formatMoney(num: number): string {
  return new Intl.NumberFormat("uz-UZ", {
    maximumFractionDigits: 0,
  }).format(num);
}

export async function generateDashboardPdf(
  period: Period,
  periodLabel?: string
): Promise<Uint8Array> {
  const data = await buildDashboardData(period);
  const label = periodLabel || data.periodLabel;

  const pdfDoc = await PDFDocument.create();
  // A4 size in points: 595 x 842
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 40;

  // Title
  page.drawText("Najot Nur sotuv bolimi - hisobot", {
    x: 40,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 22;

  // Period and date
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
    {
      x: 40,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    }
  );
  y -= 24;

  // 1. Umumiy ko'rsatkichlar
  page.drawText("1. Umumiy korsatkichlar", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 16;

  const lines: string[] = [];

  lines.push(
    `Kelishuv summasi: ${formatMoney(data.kelishuvSummasi)} so'm (tushum)`
  );
  lines.push(
    `Sotuv - online: ${formatMoney(data.onlineSummasi)} so'm`
  );
  lines.push(
    `Sotuv - offline: ${formatMoney(data.offlineSummasi)} so'm`
  );
  lines.push(
    `Lidlar jami: ${data.leadsCount.toLocaleString("ru-RU")}`
  );
  lines.push(
    `Sifatli lidlar: ${data.qualifiedLeadsCount.toLocaleString("ru-RU")}`
  );
  lines.push(
    `Sifatsiz lidlar: ${data.notQualifiedLeadsCount.toLocaleString("ru-RU")}`
  );
  lines.push(
    `Sotib olganlar (won): ${data.wonLeadsCount.toLocaleString("ru-RU")}`
  );

  const convPercent =
    data.conversionFromQualified > 0
      ? Math.round(data.conversionFromQualified * 1000) / 10
      : 0;

  lines.push(
    `Konversiya (sifatli dan sotuvga): ${convPercent.toFixed(1)}%`
  );

  lines.forEach((text) => {
    if (y < 80) {
      y = height - 60;
      page.drawText("Davom etadi...", {
        x: 40,
        y,
        size: 9,
        font,
      });
      y -= 20;
    }
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

  // 2. Sifatsiz lidlar sabablari
  page.drawText("2. Sifatsiz lidlar sabablari", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

  const reasons = data.nonQualifiedReasons || data.notQualifiedReasons || [];

  if (!reasons.length) {
    page.drawText("Sifatsiz lidlar sabablari haqida malumot yoq.", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 14;
  } else {
    // Table header
    page.drawText("Sabab", {
      x: 50,
      y,
      size: 10,
      font: fontBold,
    });
    page.drawText("Soni", {
      x: 350,
      y,
      size: 10,
      font: fontBold,
    });
    y -= 12;

    reasons.forEach((r) => {
      if (y < 80) {
        y = height - 60;
        page.drawText("Davom etadi...", {
          x: 40,
          y,
          size: 9,
          font,
        });
        y -= 20;
      }
      page.drawText(String(r.name), {
        x: 50,
        y,
        size: 9,
        font,
      });
      page.drawText(String(r.count), {
        x: 350,
        y,
        size: 9,
        font,
      });
      y -= 11;
    });
  }

  y -= 14;

  // 3. Menejerlar bo'yicha sotuvlar (TOP 5)
  page.drawText("3. Menejerlar boyicha sotuvlar (TOP 5)", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 16;

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
    // Table header
    const colXs = [50, 220, 320, 400, 480];

    const headers = [
      "Menejer",
      "Lidlar",
      "Sifatli",
      "Sotuvlar",
      "Tushum",
    ];

    headers.forEach((h, i) => {
      page.drawText(h, {
        x: colXs[i],
        y,
        size: 9,
        font: fontBold,
      });
    });
    y -= 12;

    managerSales.forEach((m) => {
      if (y < 80) {
        y = height - 60;
        page.drawText("Davom etadi...", {
          x: 40,
          y,
          size: 9,
          font,
        });
        y -= 20;
      }

      const vals = [
        m.managerName || m.manager,
        String(m.totalLeads ?? m.leads ?? 0),
        String(m.qualifiedLeads ?? m.qualified ?? 0),
        String(m.wonDeals ?? m.won ?? 0),
        formatMoney(m.wonAmount ?? m.revenue ?? 0),
      ];

      vals.forEach((v, i) => {
        page.drawText(v, {
          x: colXs[i],
          y,
          size: 8,
          font,
        });
      });

      y -= 11;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}