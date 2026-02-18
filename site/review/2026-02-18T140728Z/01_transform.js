// review export
// date: 2026-02-18
// chart_id: slope-graph
// section: transform_js

transformedData = rawData.rows.map((row) => {
  return {
    name: row.product,
    data: [
      [0, row.Q1],
      [1, row.Q4],
    ],
  };
});
