// review export
// date: 2026-02-19
// chart_id: slope-graph
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      if (params.seriesType === "line") {
        const product = params.seriesName;
        const itemData = transformedData.data.find(
          (d) => d.product === product,
        );
        if (itemData) {
          return `${product}<br/>${transformedData.categories[0]}: ${itemData.year1Value}<br/>${transformedData.categories[1]}: ${itemData.year2Value}`;
        }
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
    type: "category",
    data: transformedData.categories,
    axisTick: { alignWithLabel: true },
    axisLine: { show: false },
    axisLabel: { fontSize: 14 },
  },
  yAxis: {
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: { show: false },
  },
  series: transformedData.data.map((item, index) => {
    const isIncrease = item.year2Value > item.year1Value;
    return {
      name: item.product,
      type: "line",
      symbol: "circle",
      symbolSize: 8,
      lineStyle: { width: 2, color: isIncrease ? "#5470C6" : "#91CC75" },
      itemStyle: { color: isIncrease ? "#5470C6" : "#91CC75" },
      data: [
        {
          value: [0, item.year1Value],
          label: {
            show: true,
            formatter: `{product|${item.product}}{value|${item.year1Value}}`,
            position: "left",
            distance: 10,
            backgroundColor: "#fff",
            borderColor: "#999",
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 8],
            rich: {
              product: { fontSize: 12, color: "#333" },
              value: {
                fontSize: 12,
                fontWeight: "bold",
                color: "#333",
                padding: [0, 0, 0, 5],
              },
            },
          },
        },
        {
          value: [1, item.year2Value],
          label: {
            show: true,
            formatter: `{product|${item.product}}{value|${item.year2Value}}`,
            position: "right",
            distance: 10,
            backgroundColor: "#fff",
            borderColor: "#999",
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 8],
            rich: {
              product: { fontSize: 12, color: "#333" },
              value: {
                fontSize: 12,
                fontWeight: "bold",
                color: "#333",
                padding: [0, 0, 0, 5],
              },
            },
          },
        },
      ],
      z: 10,
    };
  }),
};
