// review export
// date: 2026-02-18
// chart_id: calendar-heatmap
// section: transform_js

function getDaysInYear(year) {
  const dates = [];
  let currentDate = new Date(year, 0, 1);
  while (currentDate.getFullYear() === year) {
    dates.push(currentDate.toISOString().slice(0, 10));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}
const year = 2025;
const allDates = getDaysInYear(year);
const dataMap = new Map();
rawData.rows.forEach((row) => {
  dataMap.set(row.date, row.value);
});
transformedData = allDates.map((date) => {
  const value = dataMap.has(date) ? dataMap.get(date) : 0;
  return [date, value];
});
