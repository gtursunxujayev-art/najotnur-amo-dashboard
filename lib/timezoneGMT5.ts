// Helper functions for GMT+5 (Asia/Tashkent) timezone calculations
// All period filters should use GMT+5, not server local time or UTC
// 
// IMPORTANT: These functions return UTC Date objects that represent
// the correct moment in time for GMT+5 boundaries.
// Example: "Today 00:00:00 in GMT+5" = "Yesterday 19:00:00 in UTC"

const GMT5_OFFSET_MS = 5 * 60 * 60 * 1000; // +5 hours in milliseconds

// Get current time (returns standard Date, same moment in time)
export function getNowGMT5(): Date {
  return new Date();
}

// Get what hour/day it is in GMT+5 timezone
export function getGMT5Components(): { year: number; month: number; date: number; hours: number; minutes: number } {
  const now = new Date();
  // Add 5 hours to UTC to get GMT+5 time components
  const gmt5Time = new Date(now.getTime() + GMT5_OFFSET_MS);
  return {
    year: gmt5Time.getUTCFullYear(),
    month: gmt5Time.getUTCMonth(),
    date: gmt5Time.getUTCDate(),
    hours: gmt5Time.getUTCHours(),
    minutes: gmt5Time.getUTCMinutes(),
  };
}

// Get start of today in GMT+5 as UTC timestamp
// Example: If it's Nov 30 in GMT+5, returns Nov 29 19:00:00 UTC
export function getTodayStartGMT5(): Date {
  const { year, month, date } = getGMT5Components();
  // Create midnight in GMT+5, then convert back to UTC by subtracting offset
  const midnightGMT5AsUTC = Date.UTC(year, month, date, 0, 0, 0, 0);
  return new Date(midnightGMT5AsUTC - GMT5_OFFSET_MS);
}

// Get end of today in GMT+5 as UTC timestamp
// Example: If it's Nov 30 in GMT+5, returns Nov 30 18:59:59 UTC
export function getTodayEndGMT5(): Date {
  const { year, month, date } = getGMT5Components();
  // Create 23:59:59 in GMT+5, then convert back to UTC by subtracting offset
  const endOfDayGMT5AsUTC = Date.UTC(year, month, date, 23, 59, 59, 999);
  return new Date(endOfDayGMT5AsUTC - GMT5_OFFSET_MS);
}

// Get start of week (Monday) in GMT+5
export function getWeekStartGMT5(): Date {
  const { year, month, date } = getGMT5Components();
  // Get the day of week for the GMT+5 date
  const tempDate = new Date(Date.UTC(year, month, date));
  const dayOfWeek = tempDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = (dayOfWeek + 6) % 7; // Days since Monday
  
  // Calculate Monday's date
  const mondayDate = date - diffToMonday;
  const mondayMidnightGMT5AsUTC = Date.UTC(year, month, mondayDate, 0, 0, 0, 0);
  return new Date(mondayMidnightGMT5AsUTC - GMT5_OFFSET_MS);
}

// Get start of month in GMT+5
export function getMonthStartGMT5(): Date {
  const { year, month } = getGMT5Components();
  const monthStartGMT5AsUTC = Date.UTC(year, month, 1, 0, 0, 0, 0);
  return new Date(monthStartGMT5AsUTC - GMT5_OFFSET_MS);
}

// Get yesterday's date range in GMT+5
export function getYesterdayRangeGMT5(): { from: Date; to: Date } {
  const { year, month, date } = getGMT5Components();
  const yesterdayDate = date - 1;
  
  const startUTC = Date.UTC(year, month, yesterdayDate, 0, 0, 0, 0);
  const endUTC = Date.UTC(year, month, yesterdayDate, 23, 59, 59, 999);
  
  return {
    from: new Date(startUTC - GMT5_OFFSET_MS),
    to: new Date(endUTC - GMT5_OFFSET_MS),
  };
}

// Get last week's date range in GMT+5 (Monday to Sunday of previous week)
export function getLastWeekRangeGMT5(): { from: Date; to: Date } {
  const { year, month, date } = getGMT5Components();
  const tempDate = new Date(Date.UTC(year, month, date));
  const dayOfWeek = tempDate.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  
  // Last week's Monday is 7 days before this week's Monday
  const lastMondayDate = date - diffToMonday - 7;
  const lastSundayDate = lastMondayDate + 6;
  
  const startUTC = Date.UTC(year, month, lastMondayDate, 0, 0, 0, 0);
  const endUTC = Date.UTC(year, month, lastSundayDate, 23, 59, 59, 999);
  
  return {
    from: new Date(startUTC - GMT5_OFFSET_MS),
    to: new Date(endUTC - GMT5_OFFSET_MS),
  };
}

// Get last month's date range in GMT+5
export function getLastMonthRangeGMT5(): { from: Date; to: Date } {
  const { year, month } = getGMT5Components();
  
  // Last month
  const lastMonth = month === 0 ? 11 : month - 1;
  const lastMonthYear = month === 0 ? year - 1 : year;
  
  // Last day of last month
  const lastDayOfLastMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  
  const startUTC = Date.UTC(lastMonthYear, lastMonth, 1, 0, 0, 0, 0);
  const endUTC = Date.UTC(lastMonthYear, lastMonth, lastDayOfLastMonth, 23, 59, 59, 999);
  
  return {
    from: new Date(startUTC - GMT5_OFFSET_MS),
    to: new Date(endUTC - GMT5_OFFSET_MS),
  };
}

// Debug helper to show what time it is in GMT+5
export function debugGMT5(): string {
  const comp = getGMT5Components();
  const todayStart = getTodayStartGMT5();
  const todayEnd = getTodayEndGMT5();
  
  return `GMT+5 Current: ${comp.year}-${String(comp.month + 1).padStart(2, '0')}-${String(comp.date).padStart(2, '0')} ${String(comp.hours).padStart(2, '0')}:${String(comp.minutes).padStart(2, '0')}
Today Start (UTC): ${todayStart.toISOString()}
Today End (UTC): ${todayEnd.toISOString()}`;
}
