// review export
// date: 2026-02-18
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      if (params.seriesName && params.data) {
        const product = params.seriesName;
        const timePoint = params.data[0] === 0 ? "Q1" : "Q4";
        const value = params.data[1];
        return `${product}<br/>${timePoint}: ${value}`;
      }
      return "";
    },
  },
  grid: {
    left: "10%",
    right: "10%",
    top: "10%",
    bottom: "10%",
    containLabel: true,
  },
  xAxis: {
    type: "value",
    min: -0.1,
    max: 1.1,
    axisLabel: {
      formatter: function (value) {
        if (value === 0) {
          return "Q1";
        } else if (value === 1) {
          return "Q4";
        }
        return "";
      },
    },
    axisTick: { show: false },
    axisLine: { show: false },
    splitLine: { show: false },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
  },
  series: transformedData.map((item) => ({
    name: item.name,
    type: "line",
    symbol: "circle",
    symbolSize: 10,
    data: item.data,
    lineStyle: { width: 2 },
    markPoint: {
      symbol: "circle",
      symbolSize: 10,
      data: [
        {
          coord: item.data[0],
          label: {
            show: true,
            position: "left",
            formatter: function (params) {
              return params.seriesName + ": " + params.value;
            },
            color: "inherit",
          },
        },
        {
          coord: item.data[1],
          label: {
            show: true,
            position: "right",
            formatter: function (params) {
              return params.seriesName + ": " + params.value;
            },
            color: "inherit",
          },
        },
      ],
    },
  })),
};
