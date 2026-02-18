// review export
// date: 2026-02-18
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      return params.seriesName + "<br/>" + params.name + ": " + params.value[1];
    },
  },
  xAxis: { type: "category", data: years, axisTick: { alignWithLabel: true } },
  yAxis: {
    type: "value",
    min: 0,
    max: 200,
    interval: 50,
    axisLabel: { formatter: "{value}" },
  },
  grid: {
    left: "10%",
    right: "10%",
    top: "10%",
    bottom: "10%",
    containLabel: true,
  },
  series: transformedData.map((seriesItem) => ({
    name: seriesItem.name,
    type: "line",
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { width: 2 },
    data: seriesItem.data,
    label: {
      show: true,
      formatter: function (params) {
        return params.value[1];
      },
      position: function (params) {
        return params.dataIndex === 0 ? "left" : "right";
      },
    },
    emphasis: { focus: "series" },
  })),
};
