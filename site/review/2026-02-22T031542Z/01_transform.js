// review export
// date: 2026-02-22
// chart_id: slope-graph
// section: transform_js

transformedData = [];
const categories = [];
const timePoints = ["Q1", "Q2"];
rawData.rows.forEach((row) => {
  const seriesData = [];
  timePoints.forEach((tp, index) => {
    seriesData.push([index, row[tp], row.product]);
  });
  transformedData.push({ name: row.product, data: seriesData });
  categories.push(row.product);
});
