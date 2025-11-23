// lib/period.ts
// Centralized period helper functions
// Works with your buildDashboardData({ from, to }) API

export type PeriodKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export function getPeriodDates(period: PeriodKey, customFrom?: Date, customTo?: Date) {
  const now = new Date();

  let from = new Date();
  let to = new Date();
  let label = "";

  switch (period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      label = "Bugun";
      break;

    case "yesterday":
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);

      to = new Date(from);
      to.setHours(23, 59, 59, 999);

      label = "Kecha";
      break;

    case "this_week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday-based week

      from = new Date(now);
      from.setDate(now.getDate() - diff);
      from.setHours(0, 0, 0, 0);

      to = new Date(now);
      to.setHours(23, 59, 59, 999);

      label = "Joriy hafta";
      break;
    }

    case "last_week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;

      // last Monday
      from = new Date(now);
      from.setDate(now.getDate() - diff - 7);
      from.setHours(0, 0, 0, 0);

      // last Sunday
      to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);

      label = "O‘tgan hafta";
      break;
    }

    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      to.setHours(23, 59, 59, 999);
      label = "Joriy oy";
      break;

    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      to.setHours(23, 59, 59, 999);
      label = "O‘tgan oy";
      break;

    case "custom":
      if (!customFrom || !customTo) {
        throw new Error("Custom period requires from & to");
      }
      from = customFrom;
      to = customTo;
      label = "Tanlangan davr";
      break;

    default:
      throw new Error("Unknown period");
  }

  return { from, to, label };
}

export function getPeriodFromQuery(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get("period") as PeriodKey | null;

  if (!p) return getPeriodDates("today");

  if (p === "custom") {
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    if (!fromStr || !toStr) return getPeriodDates("today");

    return getPeriodDates("custom", new Date(fromStr), new Date(toStr));
  }

  return getPeriodDates(p);
}