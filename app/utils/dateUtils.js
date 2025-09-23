exports.getDateKey = date => date?.toISOString().split('T')[0];

exports.getMonthRange = (offset = 0, includeDays = false) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  end.setHours(23, 59, 59, 999);

  if (!includeDays) return { start, end };

  return generateDays(start, end);
};

exports.getWeekRange = (offset = 0, includeDays = false) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + offset * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return includeDays ? generateDays(start, end) : { start, end };
};

exports.getTodayRange = (offset = 0, includeToday = true) => {
  const today = new Date();
  today.setDate(today.getDate() + offset);
  today.setHours(0, 0, 0, 0);
  return includeToday ? [today] : [];
};

exports.getYesterdayRange = (offset = 0, includeYesterday = true) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1 + offset);
  yesterday.setHours(0, 0, 0, 0);
  return includeYesterday ? [yesterday] : [];
};

exports.getYearRange = (offset = 0, includeDays = false) => {
  const now = new Date();
  const year = now.getFullYear() + offset;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  return includeDays ? generateDays(start, end) : { start, end };
};

exports.generateDays = (start, end) => {
  const days = [];
  const date = new Date(start);
  while (date <= end) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};
