// review export
// date: 2026-02-21
// chart_id: slope-graph
// section: transform_js

transformedData = { points2023: [], points2024: [], lines: [], categories: [] };
rawData.rows.forEach(function (row) {
  transformedData.points2023.push({
    name: row.category,
    value: [0, row.year_2023],
  });
  transformedData.points2024.push({
    name: row.category,
    value: [1, row.year_2024],
  });
  transformedData.lines.push({
    name: row.category,
    data: [
      [0, row.year_2023],
      [1, row.year_2024],
    ],
  });
  transformedData.categories.push(row.category);
});
