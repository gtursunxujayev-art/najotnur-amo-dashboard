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
  periodLabel: string
): Promise<Uint8Array> {
  const data = await buildDashboardData(period, periodLabel);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 40;

  // Title
  page.drawText("Najot Nur - Sotuv hisobot", {
    x: 40,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  // Period label
  page.drawText(periodLabel, {
    x: 40,
    y,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 32;

  // Main KPI block
  const lines: string[] = [
    `Kelishuv summasi: ${formatMoney(data.kelishuvSummasi)}`,
    `Online tushum: ${formatMoney(data.onlineSummasi)}`,
    `Offline tushum: ${formatMoney(data.offlineSummasi)}`,
    `Oylik tushum (Sheets): ${formatMoney(data.oylikTushum)}`,
    `Haftalik tushum (Sheets): ${formatMoney(data.haftalikTushum)}`,
    "",
    `Jami lidlar: ${data.leadsCount}`,
    `Qualified lidlar: ${data.qualifiedLeadsCount}`,
    `Sifatsiz lidlar: ${data.nonQualifiedLeadsCount}`,
    // 🔴 IMPORTANT CHANGE HERE: no more Unicode arrow
    `Konversiya (qualified -> sotuv): ${(data.conversionFromQualified * 100).toFixed(1)}%`,
  ];

  for (const line of lines) {
    page.drawText(line, {
      x: 40,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 14;
  }

  y -= 16;

  // Non-qualified reasons (pie slices)
  if (data.nonQualifiedReasons.length > 0) {
    page.drawText("Sifatsiz lid sabablari:", {
      x: 40,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16;

    data.nonQualifiedReasons.forEach((slice) => {
      const line = `- ${slice.label}: ${slice.value}`;
      page.drawText(line, {
        x: 50,
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 12;
    });

    y -= 16;
  }

  // Lead sources
  if (data.leadSources.length > 0) {
    page.drawText("Lid manbalari:", {
      x: 40,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16;

    data.leadSources.forEach((slice) => {
      const line = `- ${slice.label}: ${slice.value}`;
      page.drawText(line, {
        x: 50,
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 12;
    });

    y -= 16;
  }

  // Manager sales table (very simple)
  if (data.managerSales.length > 0) {
    page.drawText("Menejerlar bo'yicha sotuvlar:", {
      x: 40,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16;

    const headers = ["Menejer", "Lidlar", "Qualified", "Sotuvlar", "Summasi"];
    const colXs = [40, 200, 260, 330, 400];

    headers.forEach((h, i) => {
      page.drawText(h, {
        x: colXs[i],
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });
    y -= 12;

    data.managerSales.forEach((m) => {
      if (y < 60) {
        // add new page if we reach bottom
        y = height - 60;
        const newPage = pdfDoc.addPage();
        (page as any) = newPage;
      }

      const vals = [
        m.managerName,
        String(m.totalLeads),
        String(m.qualifiedLeads),
        String(m.wonDeals),
        formatMoney(m.wonAmount),
      ];
      vals.forEach((v, i) => {
        page.drawText(v, {
          x: colXs[i],
          y,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
      });
      y -= 11;
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}