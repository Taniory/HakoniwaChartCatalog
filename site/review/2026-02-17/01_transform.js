// review export
// date: 2026-02-17
// chart_id: sunburst-chart
// section: transform_js

function buildTree(data) {
  const nodes = {};
  const rootNodes = [];
  data.forEach((item) => {
    nodes[item.name] = { name: item.name, value: item.value, children: [] };
  });
  data.forEach((item) => {
    if (item.parent && item.parent !== "Root") {
      if (nodes[item.parent]) {
        nodes[item.parent].children.push(nodes[item.name]);
      }
    } else {
      rootNodes.push(nodes[item.name]);
    }
  });
  if (rootNodes.length > 1) {
    return [
      {
        name: "Total",
        children: rootNodes,
        value: rootNodes.reduce((sum, node) => sum + (node.value || 0), 0),
      },
    ];
  } else if (rootNodes.length === 1) {
    return rootNodes;
  } else {
    return [];
  }
}
transformedData = buildTree(rawData.rows);
