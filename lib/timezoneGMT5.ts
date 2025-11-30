// Helper functions for GMT+5 (Asia/Tashkent) timezone calculations
// All period filters should use GMT+5, not server local time or UTC

export function getNowGMT5(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const GMT5Time = new Date(utcTime + 5 * 60 * 60 * 1000);
  return GMT5Time;
}

export function getTodayStartGMT5(): Date {
  const now = getNowGMT5();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function getTodayEndGMT5(): Date {
  const now = getNowGMT5();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export function getWeekStartGMT5(todayStart: Date): Date {
  const weekStart = new Date(todayStart);
  const day = weekStart.getDay();
  const diffToMonday = (day + 6) % 7;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  return weekStart;
}

export function getMonthStartGMT5(todayStart: Date): Date {
  return new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
}
