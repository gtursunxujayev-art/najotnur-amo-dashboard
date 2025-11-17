// lib/reportPeriod.ts
import type { Period } from "@/lib/dashboard";

export type ReportPeriodType = "daily" | "weekly" | "monthly";

/**
 * Returns a fixed period + human label for:
 * - daily   → yesterday
 * - weekly  → last full calendar week (Mon–Sun)
 * - monthly → previous calendar month
 */
export function resolveReportPeriod(
  type: ReportPeriodType
): { period: Period; label: string } {
  const now = new Date();

  if (type === "daily") {
    // Yesterday 00:00–23:59:59.999
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return {
      period: { from: start, to: end },
      label: "Kecha (kunlik hisobot)",
    };
  }

  if (type === "weekly") {
    // Last calendar week Monday–Sunday
    const end = new Date(now);
    // JS: Sunday=0, Monday=1 ... Sunday=0 → treat as 7
    const todayDay = end.getDay() === 0 ? 7 : end.getDay(); // 1..7

    // Go back to last week's Sunday
    end.setDate(end.getDate() - todayDay);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return {
      period: { from: start, to: end },
      label: "O‘tgan hafta (haftalik hisobot)",
    };
  }

  // Monthly: previous full calendar month
  const start = new Date(now);
  start.setDate(1); // first day of current month
  start.setMonth(start.getMonth() - 1); // previous month
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1); // next month
  end.setDate(0); // last day of previous month
  end.setHours(23, 59, 59, 999);

  return {
    period: { from: start, to: end },
    label: "O‘tgan oy (oylik hisobot)",
  };
}
