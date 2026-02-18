// review export
// date: 2026-02-18
// chart_id: chord-diagram
// section: transform_js

transformedData = {};
const nodeMap = new Map();
const links = [];
rawData.rows.forEach((row) => {
  nodeMap.set(row.source, (nodeMap.get(row.source) || 0) + row.value);
  nodeMap.set(row.target, (nodeMap.get(row.target) || 0) + row.value);
  links.push({ source: row.source, target: row.target, value: row.value });
});
const nodes = Array.from(nodeMap.entries()).map(([name, value]) => ({
  name: name,
  value: value,
}));
transformedData.nodes = nodes;
transformedData.links = links;
