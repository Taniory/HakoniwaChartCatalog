// review export
// date: 2026-02-19
// chart_id: slope-graph
// section: transform_js

transformedData = { categories: ["2023", "2024"], data: [] };
const year1Key = "2023";
const year2Key = "2024";
rawData.rows.forEach((row) => {
  transformedData.data.push({
    product: row.product,
    year1Value: row[year1Key],
    year2Value: row[year2Key],
  });
});
