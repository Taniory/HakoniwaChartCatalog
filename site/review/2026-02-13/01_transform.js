// review export
// date: 2026-02-13
// chart_id: horizon-chart
// section: transform_js

transformedData = rawData.rows.map((x) => ({
  label: x.label,
  value: Number(x.value) }
));
