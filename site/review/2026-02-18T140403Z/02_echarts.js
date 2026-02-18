// review export
// date: 2026-02-18
// chart_id: sunburst-chart
// section: echarts_js

option = {
  tooltip: { formatter: "{b}: {c}" },
  series: {
    type: "sunburst",
    data: transformedData,
    radius: [0, "90%"],
    sort: null,
    emphasis: { focus: "ancestor" },
    label: { rotate: "radial" },
    levels: [
      {},
      {
        r0: "15%",
        r: "35%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "tangential" },
      },
      {
        r0: "35%",
        r: "60%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "tangential" },
      },
      {
        r0: "60%",
        r: "80%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "tangential" },
      },
      {
        r0: "80%",
        r: "90%",
        itemStyle: { borderWidth: 2 },
        label: { rotate: "tangential" },
      },
    ],
  },
};
