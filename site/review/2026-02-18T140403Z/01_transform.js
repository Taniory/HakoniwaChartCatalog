// review export
// date: 2026-02-18
// chart_id: sunburst-chart
// section: transform_js

function buildTree(data) {
  const map = new Map();
  const roots = [];
  data.forEach((item) => {
    map.set(item.name, { name: item.name, value: item.value, children: [] });
  });
  data.forEach((item) => {
    const node = map.get(item.name);
    if (item.parent === null) {
      roots.push(node);
    } else {
      const parentNode = map.get(item.parent);
      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });
  return roots;
}
transformedData = buildTree(rawData.rows);
