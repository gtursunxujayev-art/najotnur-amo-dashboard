// lib/reportPeriod.ts
import type { Period } from "@/lib/dashboard";

export type ReportPeriodType = "daily" | "weekly" | "monthly";

/**
 * Period + label for auto-reports:
 * - daily   → yesterday
 * - weekly  → last full week
 * - monthly → last month
 */
export function resolveReportPeriod(
  type: ReportPeriodType
): { period: Period; label: string } {
  switch (type) {
    case "daily":
      // Kunlik hisobot – kechagi kun
      return {
        period: "yesterday",
        label: "Kecha (kunlik hisobot)",
      };

    case "weekly":
      // Haftalik hisobot – otgan hafta
      return {
        period: "lastWeek",
        label: "O‘tgan hafta (haftalik hisobot)",
      };

    case "monthly":
      // Oylik hisobot – otgan oy
      return {
        period: "lastMonth",
        label: "O‘tgan oy (oylik hisobot)",
      };

    default:
      // fallback – kecha
      return {
        period: "yesterday",
        label: "Kecha (kunlik hisobot)",
      };
  }
}