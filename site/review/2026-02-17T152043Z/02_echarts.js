// review export
// date: 2026-02-17
// chart_id: sunburst-chart
// section: echarts_js

option = {
  tooltip: {
    formatter: function (info) {
      var value = info.value;
      var treePathInfo = info.treePathInfo;
      var treePath = [];
      for (var i = 1; i < treePathInfo.length; i++) {
        treePath.push(treePathInfo[i].name);
      }
      return (
        '<div style="font-size:14px;">' +
        treePath.join("/") +
        ": " +
        value +
        "</div>"
      );
    },
  },
  series: [
    {
      type: "sunburst",
      data: transformedData,
      radius: [0, "90%"],
      sort: null,
      emphasis: { focus: "ancestor" },
      levels: [
        {},
        {
          r0: "15%",
          r: "35%",
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { rotate: "radial" },
        },
        {
          r0: "35%",
          r: "60%",
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { rotate: "radial" },
        },
        {
          r0: "60%",
          r: "80%",
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { rotate: "radial" },
        },
        {
          r0: "80%",
          r: "90%",
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          label: { rotate: "radial" },
        },
      ],
    },
  ],
};
