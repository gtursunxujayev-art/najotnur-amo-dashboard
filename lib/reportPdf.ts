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
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Color scheme (professional blue/slate theme)
  const primaryColor = rgb(15 / 255, 23 / 255, 42 / 255); // Dark slate
  const secondaryColor = rgb(30 / 255, 41 / 255, 59 / 255); // Lighter slate
  const accentColor = rgb(59 / 255, 130 / 255, 246 / 255); // Blue
  const textColor = rgb(15 / 255, 23 / 255, 42 / 255);
  const lightGray = rgb(241 / 255, 245 / 255, 249 / 255);
  const borderColor = rgb(203 / 255, 213 / 255, 225 / 255);

  let y = height - 30;

  // Header with background
  page.drawRectangle({
    x: 0,
    y: y - 50,
    width,
    height: 50,
    color: primaryColor,
  });

  page.drawText("Najot Nur", {
    x: 40,
    y: y - 15,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("Sotuv hisobot", {
    x: 40,
    y: y - 35,
    size: 12,
    font,
    color: rgb(200 / 255, 214 / 255, 229 / 255),
  });

  y -= 60;

  // Period label
  page.drawText(periodLabel, {
    x: 40,
    y,
    size: 11,
    font: boldFont,
    color: secondaryColor,
  });
  y -= 20;

  // KPI Cards Section
  const cardHeight = 45;
  const cardWidth = (width - 120) / 2;
  const cardGap = 20;

  const kpiData = [
    { label: "Kelishuv summasi", value: formatMoney(data.kelishuvSummasi) },
    { label: "Online tushum", value: formatMoney(data.onlineSummasi) },
    { label: "Offline tushum", value: formatMoney(data.offlineSummasi) },
    { label: "Haftalik tushum (Sheets)", value: formatMoney(data.haftalikTushum) },
  ];

  // Draw KPI cards in 2x2 grid
  let cardX = 40;
  let cardY = y;
  let cardCount = 0;

  for (const kpi of kpiData) {
    // Card background
    page.drawRectangle({
      x: cardX,
      y: cardY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: lightGray,
      borderColor: borderColor,
      borderWidth: 1,
    });

    // Label
    page.drawText(kpi.label, {
      x: cardX + 10,
      y: cardY - 15,
      size: 8,
      font,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });

    // Value
    page.drawText(kpi.value, {
      x: cardX + 10,
      y: cardY - 30,
      size: 12,
      font: boldFont,
      color: accentColor,
    });

    cardX += cardWidth + cardGap;
    cardCount++;

    if (cardCount === 2) {
      cardX = 40;
      cardY -= cardHeight + 15;
      cardCount = 0;
    }
  }

  y = cardY - 20;

  // Lead metrics
  const metrics = [
    { label: "Jami lidlar", value: data.leadsCount },
    { label: "Qualified lidlar", value: data.qualifiedLeadsCount },
    { label: "Sifatsiz lidlar", value: data.nonQualifiedLeadsCount },
    { label: "Konversiya (qualified → sotuv)", value: `${(data.conversionFromQualified * 100).toFixed(1)}%` },
  ];

  // Draw metrics section
  page.drawRectangle({
    x: 40,
    y: y - 70,
    width: width - 80,
    height: 70,
    color: lightGray,
    borderColor: borderColor,
    borderWidth: 1,
  });

  let metricY = y - 15;
  for (let i = 0; i < metrics.length; i += 2) {
    // First metric
    page.drawText(metrics[i].label, {
      x: 50,
      y: metricY,
      size: 8,
      font,
      color: rgb(100 / 255, 116 / 255, 139 / 255),
    });
    page.drawText(String(metrics[i].value), {
      x: 50,
      y: metricY - 12,
      size: 11,
      font: boldFont,
      color: textColor,
    });

    // Second metric (if exists)
    if (i + 1 < metrics.length) {
      page.drawText(metrics[i + 1].label, {
        x: width / 2 + 20,
        y: metricY,
        size: 8,
        font,
        color: rgb(100 / 255, 116 / 255, 139 / 255),
      });
      page.drawText(String(metrics[i + 1].value), {
        x: width / 2 + 20,
        y: metricY - 12,
        size: 11,
        font: boldFont,
        color: textColor,
      });
    }

    metricY -= 30;
  }

  y -= 90;

  // Section: Sifatsiz lid sabablari
  if (data.nonQualifiedReasons.length > 0) {
    // Section title with background
    page.drawRectangle({
      x: 40,
      y: y - 18,
      width: width - 80,
      height: 18,
      color: secondaryColor,
    });

    page.drawText("Sifatsiz lid sabablari", {
      x: 50,
      y: y - 13,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    y -= 25;

    const sorted = [...data.nonQualifiedReasons].sort((a, b) => b.value - a.value);
    for (const item of sorted) {
      page.drawText(`${item.label}: ${item.value}`, {
        x: 50,
        y,
        size: 8,
        font,
        color: textColor,
      });
      y -= 10;
    }
    y -= 10;
  }

  // Section: Lid manbalari
  if (data.leadSources.length > 0) {
    // Section title with background
    page.drawRectangle({
      x: 40,
      y: y - 18,
      width: width - 80,
      height: 18,
      color: secondaryColor,
    });

    page.drawText("Lid manbalari", {
      x: 50,
      y: y - 13,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    y -= 25;

    const sorted = [...data.leadSources].sort((a, b) => b.value - a.value);
    for (const item of sorted) {
      page.drawText(`${item.label}: ${item.value}`, {
        x: 50,
        y,
        size: 8,
        font,
        color: textColor,
      });
      y -= 10;
    }
    y -= 10;
  }

  // Manager sales table
  if (data.managerSales.length > 0) {
    if (y < 150) {
      // Add new page if not enough space
      page = pdfDoc.addPage();
      y = height - 30;
    }

    // Section title with background
    page.drawRectangle({
      x: 40,
      y: y - 18,
      width: width - 80,
      height: 18,
      color: secondaryColor,
    });

    page.drawText("Menejerlar bo'yicha sotuvlar", {
      x: 50,
      y: y - 13,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    y -= 28;

    const headers = ["Menejer", "Lidlar", "Qualified", "Sotuvlar", "Summasi"];
    const colXs = [40, 160, 240, 310, 380];
    const colWidths = [120, 80, 70, 70, 80];

    // Header row
    page.drawRectangle({
      x: 40,
      y: y - 16,
      width: width - 80,
      height: 16,
      color: lightGray,
      borderColor: borderColor,
      borderWidth: 1,
    });

    headers.forEach((h, i) => {
      page.drawText(h, {
        x: colXs[i] + 5,
        y: y - 12,
        size: 8,
        font: boldFont,
        color: textColor,
      });
    });

    y -= 18;

    // Data rows
    const sorted = [...data.managerSales].sort((a, b) => b.revenue - a.revenue);
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];

      if (y < 40) {
        // Add new page
        page = pdfDoc.addPage();
        y = height - 30;

        // Draw header row on new page
        page.drawRectangle({
          x: 40,
          y: y - 16,
          width: width - 80,
          height: 16,
          color: lightGray,
          borderColor: borderColor,
          borderWidth: 1,
        });

        headers.forEach((h, j) => {
          page.drawText(h, {
            x: colXs[j] + 5,
            y: y - 12,
            size: 8,
            font: boldFont,
            color: textColor,
          });
        });

        y -= 18;
      }

      // Alternate row colors
      const rowColor = i % 2 === 0 ? rgb(1, 1, 1) : lightGray;
      page.drawRectangle({
        x: 40,
        y: y - 14,
        width: width - 80,
        height: 14,
        color: rowColor,
        borderColor: borderColor,
        borderWidth: 1,
      });

      const totalSales = m.onlineSalesCount + m.offlineSalesCount;
      const vals = [
        m.managerName,
        String(m.totalLeads),
        String(m.qualifiedLeads),
        String(totalSales),
        formatMoney(m.revenue),
      ];

      vals.forEach((v, j) => {
        page.drawText(v, {
          x: colXs[j] + 5,
          y: y - 11,
          size: 7,
          font,
          color: textColor,
        });
      });

      y -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
