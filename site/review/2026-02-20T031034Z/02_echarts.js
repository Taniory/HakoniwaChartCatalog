// review export
// date: 2026-02-20
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      return (
        params.seriesName + "<br/>" + params.value[0] + ": " + params.value[1]
      );
    },
  },
  grid: {
    left: "15%",
    right: "15%",
    top: "10%",
    bottom: "10%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    data: transformedData.years,
    axisTick: { alignWithLabel: true },
    axisLabel: { interval: 0 },
  },
  yAxis: { type: "value", axisLabel: { formatter: "{value}" } },
  series: transformedData.series.map((s) => ({
    name: s.name,
    type: "line",
    data: s.data,
    symbol: "circle",
    symbolSize: 8,
    lineStyle: { width: 2 },
    emphasis: { focus: "series" },
  })),
};
