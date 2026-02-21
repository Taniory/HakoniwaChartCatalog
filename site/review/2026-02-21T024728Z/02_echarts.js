// review export
// date: 2026-02-21
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      if (params.seriesType === "scatter") {
        return params.name + ": " + params.value[1];
      } else if (params.seriesType === "line") {
        return (
          params.seriesName +
          ": 2023: " +
          params.data[0][1] +
          ", 2024: " +
          params.data[1][1]
        );
      }
      return "";
    },
  },
  xAxis: {
    type: "value",
    min: -0.1,
    max: 1.1,
    axisLabel: {
      formatter: function (value) {
        if (value === 0) {
          return "2023";
        } else if (value === 1) {
          return "2024";
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
  series: [],
};
transformedData.lines.forEach(function (lineData) {
  option.series.push({
    name: lineData.name,
    type: "line",
    data: lineData.data,
    symbol: "none",
    lineStyle: { width: 2, opacity: 0.7 },
    z: 1,
  });
});
option.series.push({
  name: "2023 Points",
  type: "scatter",
  data: transformedData.points2023,
  symbolSize: 10,
  label: {
    show: true,
    formatter: function (params) {
      return params.name + ": " + params.value[1];
    },
    position: "left",
  },
  z: 2,
});
option.series.push({
  name: "2024 Points",
  type: "scatter",
  data: transformedData.points2024,
  symbolSize: 10,
  label: {
    show: true,
    formatter: function (params) {
      return params.name + ": " + params.value[1];
    },
    position: "right",
  },
  z: 2,
});
