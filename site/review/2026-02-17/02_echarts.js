// review export
// date: 2026-02-17
// chart_id: chord-diagram
// section: echarts_js

option = {
  tooltip: {
    trigger: "item",
    formatter: function (params) {
      if (params.dataType === "node") {
        return params.name + ": " + params.value;
      } else if (params.dataType === "edge") {
        return (
          params.data.source + " -> " + params.data.target + ": " + params.value
        );
      }
      return "";
    },
  },
  series: [
    {
      type: "graph",
      layout: "circular",
      circular: { rotateLabel: true },
      data: transformedData.nodes,
      links: transformedData.links,
      roam: true,
      label: { show: true, position: "right", formatter: "{b}" },
      lineStyle: { color: "#a5a5a5", opacity: 0.7, width: 1, curveness: 0.3 },
      edgeLabel: { show: false, formatter: "{c}" },
      emphasis: { focus: "adjacency", lineStyle: { width: 5 } },
      itemStyle: { color: "#5470c6" },
      edgeSymbol: ["none", "arrow"],
      edgeSymbolSize: [4, 10],
    },
  ],
};
