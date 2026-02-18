// review export
// date: 2026-02-18
// chart_id: calendar-heatmap
// section: echarts_js

option = {
  tooltip: {
    formatter: function (params) {
      return params.data[0] + ": " + params.data[1];
    },
  },
  visualMap: {
    min: 0,
    max: 40,
    calculable: true,
    orient: "horizontal",
    left: "center",
    top: "top",
    inRange: { color: ["#ebedf0", "#c6e48b", "#7bc96d", "#239a3b", "#196127"] },
  },
  calendar: {
    top: 120,
    left: 30,
    right: 30,
    cellSize: ["auto", 13],
    range: "2025",
    itemStyle: { borderWidth: 0.5 },
    yearLabel: {
      show: true,
      margin: 40,
      textStyle: { color: "#999", fontSize: 20 },
    },
    dayLabel: { firstDay: 1, nameMap: "jp" },
    monthLabel: { nameMap: "jp" },
  },
  series: {
    type: "heatmap",
    coordinateSystem: "calendar",
    data: transformedData,
  },
};
