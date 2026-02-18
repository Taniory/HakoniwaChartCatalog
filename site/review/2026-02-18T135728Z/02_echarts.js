// review export
// date: 2026-02-18
// chart_id: chord-diagram
// section: echarts_js

option = {
  tooltip: {
    formatter: function (params) {
      if (params.dataType === "node") {
        return params.name + ": " + (params.value || "N/A");
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
      labelLayout: { hideOverlap: true },
      force: { repulsion: 1000 },
      edgeSymbol: ["circle", "arrow"],
      edgeSymbolSize: [4, 10],
      edgeLabel: { show: false, formatter: "{c}" },
      lineStyle: { opacity: 0.9, width: 2, curveness: 0.3 },
      itemStyle: {
        borderColor: "#fff",
        borderWidth: 1,
        shadowBlur: 10,
        shadowColor: "rgba(0, 0, 0, 0.3)",
      },
    },
  ],
};
