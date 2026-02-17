// review export
// date: 2026-02-17
// chart_id: sunburst-chart
// section: transform_js

function buildTree(data, idField, parentField, valueField) {
  const nodes = {};
  const rootNodes = [];
  data.forEach((item) => {
    const id = item[idField];
    nodes[id] = { name: item[idField], value: item[valueField], children: [] };
  });
  data.forEach((item) => {
    const id = item[idField];
    const parentId = item[parentField];
    if (parentId === null || parentId === undefined) {
      rootNodes.push(nodes[id]);
    } else {
      if (nodes[parentId]) {
        nodes[parentId].children.push(nodes[id]);
      } else {
        rootNodes.push(nodes[id]);
      }
    }
  });
  return rootNodes;
}
transformedData = buildTree(rawData.rows, "name", "parent", "value");
