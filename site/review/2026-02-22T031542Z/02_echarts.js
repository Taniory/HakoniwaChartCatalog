// review export
// date: 2026-02-22
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      const product = params.seriesName;
      const timePointIndex = params.data[0];
      const value = params.data[1];
      const timePointLabel = timePointIndex === 0 ? "Q1" : "Q2";
      return `${product}<br/>${timePointLabel}: ${value}`;
    },
  },
  xAxis: { type: "category", data: ["Q1", "Q2"], axisLabel: { interval: 0 } },
  yAxis: { type: "value", name: "Value", axisLabel: { formatter: "{value}" } },
  series: transformedData.map((item) => ({
    name: item.name,
    type: "line",
    data: item.data,
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { width: 2 },
    label: {
      show: true,
      formatter: function (params) {
        return params.data[2] + " " + params.data[1];
      },
      position: function (params) {
        return params.data[0] === 0 ? "left" : "right";
      },
      distance: 10,
    },
    emphasis: { focus: "series" },
  })),
};
