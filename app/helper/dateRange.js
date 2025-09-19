// utils/dateRanges.js
function normalizeStart(date) {
  date.setHours(0, 0, 0, 0);
  return date;
}
function normalizeEnd(date) {
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildRanges() {
  const now = new Date();

  // Today
  const todayStart = normalizeStart(new Date(now));
  const todayEnd = normalizeEnd(new Date(now));

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = normalizeStart(new Date(yesterday));
  const yesterdayEnd = normalizeEnd(new Date(yesterday));

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = normalizeStart(new Date(tomorrow));
  const tomorrowEnd = normalizeEnd(new Date(tomorrow));

  // This Week (Mon–Sun)
  const weekStart = new Date(now);
  const day = weekStart.getDay(); // 0=Sun
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  normalizeStart(weekStart);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  normalizeEnd(weekEnd);

  // Last Week
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  normalizeStart(lastWeekStart);

  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  normalizeEnd(lastWeekEnd);

  // Next Week
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(weekStart.getDate() + 7);
  normalizeStart(nextWeekStart);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  normalizeEnd(nextWeekEnd);

  // This Month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  normalizeEnd(monthEnd);

  // Last Month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  normalizeEnd(lastMonthEnd);

  // Next Month
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  normalizeEnd(nextMonthEnd);

  // This Year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  normalizeEnd(yearEnd);

  return {
    Today: { start: todayStart, end: todayEnd },
    Yesterday: { start: yesterdayStart, end: yesterdayEnd },
    Tomorrow: { start: tomorrowStart, end: tomorrowEnd },
    'This Week': { start: weekStart, end: weekEnd },
    'Last Week': { start: lastWeekStart, end: lastWeekEnd },
    'Next Week': { start: nextWeekStart, end: nextWeekEnd },
    'This Month': { start: monthStart, end: monthEnd },
    'Last Month': { start: lastMonthStart, end: lastMonthEnd },
    'Next Month': { start: nextMonthStart, end: nextMonthEnd },
    'This Year': { start: yearStart, end: yearEnd },
    All: { start: new Date(0), end: new Date() },
  };
}

function getDateRange(filter) {
  const ranges = buildRanges(); // precompute once per API call
  return ranges[filter] || ranges['All'];
}

module.exports = { getDateRange };
