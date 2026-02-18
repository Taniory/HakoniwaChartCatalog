// review export
// date: 2026-02-18
// chart_id: slope-graph
// section: transform_js

transformedData = [];
const years = Object.keys(rawData.rows[0]).filter((key) => key !== "item");
const year1 = years[0];
const year2 = years[1];
rawData.rows.forEach((row) => {
  transformedData.push({
    name: row.item,
    data: [
      [0, row[year1]],
      [1, row[year2]],
    ],
  });
});
