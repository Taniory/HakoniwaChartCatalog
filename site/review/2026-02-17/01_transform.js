// review export
// date: 2026-02-17
// chart_id: sunburst-chart
// section: transform_js

function buildHierarchy(data) {
  const dataMap = new Map();
  const rootNodes = [];
  data.forEach((item) => {
    dataMap.set(item.name, {
      name: item.name,
      value: item.value,
      children: [],
    });
  });
  data.forEach((item) => {
    const node = dataMap.get(item.name);
    if (item.parent === null) {
      rootNodes.push(node);
    } else {
      const parentNode = dataMap.get(item.parent);
      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });
  function cleanAndSum(nodes) {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        cleanAndSum(node.children);
        if (node.value === 0) {
          node.value = node.children.reduce(
            (sum, child) => sum + (child.value || 0),
            0,
          );
        }
      } else {
        delete node.children;
      }
    });
  }
  cleanAndSum(rootNodes);
  return rootNodes;
}
transformedData = buildHierarchy(rawData.rows);
