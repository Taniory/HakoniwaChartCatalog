// review export
// date: 2026-02-20
// chart_id: slope-graph
// section: transform_js

transformedData = { years: [], series: [] };
if (rawData && rawData.rows && rawData.rows.length > 0) {
  const firstRow = rawData.rows[0];
  const yearKeys = Object.keys(firstRow).filter((key) => key !== "category");
  transformedData.years = yearKeys.sort();
  rawData.rows.forEach((row) => {
    const dataPoints = transformedData.years.map((year, index) => {
      const point = { value: [year, row[year]] };
      if (index === 0) {
        point.label = {
          show: true,
          formatter: "{b|" + row.category + "}\n{a|" + row[year] + "}",
          position: "left",
          align: "right",
          verticalAlign: "middle",
          distance: 10,
          rich: {
            a: { color: "#000", fontSize: 14, fontWeight: "bold" },
            b: { color: "#333", fontSize: 12 },
          },
        };
      } else if (index === transformedData.years.length - 1) {
        point.label = {
          show: true,
          formatter: "{b|" + row.category + "}\n{a|" + row[year] + "}",
          position: "right",
          align: "left",
          verticalAlign: "middle",
          distance: 10,
          rich: {
            a: { color: "#000", fontSize: 14, fontWeight: "bold" },
            b: { color: "#333", fontSize: 12 },
          },
        };
      }
      return point;
    });
    transformedData.series.push({ name: row.category, data: dataPoints });
  });
}
