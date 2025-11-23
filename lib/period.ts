// lib/period.ts
export type PeriodKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

export type Period = { from: Date; to: Date };

export function getPeriodDates(periodKey: PeriodKey | string): {
  from: Date;
  to: Date;
  label: string;
  key: PeriodKey;
} {
  const key = normalizePeriodKey(periodKey);
  const now = new Date();

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (key === "today") {
    const from = startOfDay(now);
    const to = endOfDay(now);
    return { from, to, label: "Bugun", key };
  }

  if (key === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const from = startOfDay(y);
    const to = endOfDay(y);
    return { from, to, label: "Kecha", key };
  }

  if (key === "this_week") {
    // week starts Monday
    const d = new Date(now);
    const day = d.getDay(); // 0 Sun..6 Sat
    const diffToMon = (day + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - diffToMon);
    const from = startOfDay(mon);
    const to = endOfDay(now);
    return { from, to, label: "Shu hafta", key };
  }

  if (key === "last_week") {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMon = (day + 6) % 7;

    const lastMon = new Date(d);
    lastMon.setDate(d.getDate() - diffToMon - 7);

    const lastSun = new Date(lastMon);
    lastSun.setDate(lastMon.getDate() + 6);

    const from = startOfDay(lastMon);
    const to = endOfDay(lastSun);
    return { from, to, label: "O‘tgan hafta", key };
  }

  if (key === "this_month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = startOfDay(first);
    const to = endOfDay(now);
    return { from, to, label: "Shu oy", key };
  }

  // last_month
  const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastLast = new Date(now.getFullYear(), now.getMonth(), 0);
  const from = startOfDay(firstLast);
  const to = endOfDay(lastLast);
  return { from, to, label: "O‘tgan oy", key };
}

export function getPeriodFromQuery(req: Request): {
  from: Date;
  to: Date;
  label: string;
  key: PeriodKey;
} {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "today";
  return getPeriodDates(period);
}

function normalizePeriodKey(p: string): PeriodKey {
  const v = (p || "").toLowerCase().trim();

  // accept old variants
  if (v === "thisweek") return "this_week";
  if (v === "lastweek") return "last_week";
  if (v === "thismonth") return "this_month";
  if (v === "lastmonth") return "last_month";

  if (
    v === "today" ||
    v === "yesterday" ||
    v === "this_week" ||
    v === "last_week" ||
    v === "this_month" ||
    v === "last_month"
  ) {
    return v;
  }

  return "today";
}