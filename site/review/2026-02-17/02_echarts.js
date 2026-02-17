// review export
// date: 2026-02-17
// chart_id: sunburst-chart
// section: echarts_js

option = {
  tooltip: { formatter: "{b}: {c} (単位: 百万円)" },
  series: {
    type: "sunburst",
    data: transformedData,
    radius: [0, "90%"],
    sort: null,
    emphasis: { focus: "ancestor" },
    levels: [
      {},
      {
        r0: "15%",
        r: "35%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "radial" },
      },
      {
        r0: "35%",
        r: "60%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "radial" },
      },
      {
        r0: "60%",
        r: "80%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "radial" },
      },
      {
        r0: "80%",
        r: "90%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "radial" },
      },
    ],
  },
};
