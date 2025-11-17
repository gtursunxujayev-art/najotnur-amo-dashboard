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
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  page.drawText("Najot Nur — Sales Dashboard", {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 24;
  page.drawText(`Period: ${periodLabel}`, {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 40;

  const leftColX = 50;
  const rightColX = 320;

  const line = (label: string, value: string, x: number) => {
    page.drawText(label, { x, y, size: 11, font: fontBold });
    page.drawText(value, { x, y: y - 14, size: 13, font });
    y -= 32;
  };

  // Left column – main metrics
  line("Kelishuv summasi", `UZS ${formatMoney(data.kelishuvSummasi)}`, leftColX);
  line("Sotuv – Online", `UZS ${formatMoney(data.onlineSummasi)}`, leftColX);
  line("Sotuv – Offline", `UZS ${formatMoney(data.offlineSummasi)}`, leftColX);
  line("Lidlar soni", String(data.leadsCount), leftColX);
  line("Sifatli lidlar", String(data.qualifiedLeadsCount), leftColX);
  line(
    "Konversiya (qualified → sotuv)",
    (data.conversionFromQualified * 100).toFixed(1) + "%",
    leftColX
  );

  // Right column – revenue & calls
  y = height - 90;
  line("Tushum (tanlangan davr)", `UZS ${formatMoney(data.oylikTushum)}`, rightColX);
  line(
    "Sifatli lid sabablari (yo'qotilganlarning soni)",
    data.nonQualifiedReasons.length.toString(),
    rightColX
  );
  line(
    "Lid manbalari (Qayerdan) turlari",
    data.leadSources.length.toString(),
    rightColX
  );

  // Manager sales table
  y -= 10;
  page.drawText("Sotuv bo'yicha menejerlar:", {
    x: 50,
    y,
    size: 12,
    font: fontBold,
  });
  y -= 18;

  const headerY = y;
  const colXs = [50, 230, 300, 380, 460];

  const headers = ["Menejer", "Lidlar", "Sifatli", "Sotuvlar", "Summasi"];
  headers.forEach((h, i) => {
    page.drawText(h, { x: colXs[i], y: headerY, size: 9, font: fontBold });
  });
  y -= 12;

  data.managerSales.forEach((m) => {
    if (y < 80) return; // simple overflow protection
    const vals = [
      m.managerName,
      String(m.totalLeads),
      String(m.qualifiedLeads),
      String(m.wonDeals),
      formatMoney(m.wonAmount),
    ];
    vals.forEach((v, i) => {
      page.drawText(v, { x: colXs[i], y, size: 8, font });
    });
    y -= 11;
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}