// review export
// date: 2026-02-16
// chart_id: radial-treemap
// section: echarts_js

option = {
  tooltip: {
    formatter: (info) => {
      const value = info.value;
      const name = info.name;
      return `${name}: ${value}`;
    },
  },
  series: [
    {
      type: "treemap",
      data: transformedData.children,
      roam: false,
      nodeClick: false,
      renderMode: "radial",
      width: "90%",
      height: "90%",
      left: "center",
      top: "center",
      label: {
        show: true,
        formatter: "{b}",
        position: "inside",
        color: "#fff",
        fontSize: 10,
        overflow: "truncate",
      },
      itemStyle: { borderColor: "#fff" },
      levels: [
        {
          itemStyle: { borderColor: "#777", borderWidth: 0, gapWidth: 1 },
          upperLabel: { show: false },
        },
        {
          itemStyle: { borderColor: "#555", borderWidth: 5, gapWidth: 1 },
          emphasis: { itemStyle: { borderColor: "#ddd" } },
        },
        {
          itemStyle: { borderColor: "#333", borderWidth: 0, gapWidth: 0 },
          emphasis: { itemStyle: { borderColor: "#ddd" } },
        },
        {
          itemStyle: { borderColor: "#000", borderWidth: 0, gapWidth: 0 },
          emphasis: { itemStyle: { borderColor: "#ddd" } },
        },
      ],
    },
  ],
};
