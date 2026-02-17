// review export
// date: 2026-02-17
// chart_id: chord-diagram
// section: transform_js

transformedData = { nodes: [], links: [] };
const nodeMap = new Map();
rawData.rows.forEach((row) => {
  if (!nodeMap.has(row.source)) {
    nodeMap.set(row.source, { name: row.source, value: 0 });
  }
  nodeMap.get(row.source).value += row.value;
  if (!nodeMap.has(row.target)) {
    nodeMap.set(row.target, { name: row.target, value: 0 });
  }
  nodeMap.get(row.target).value += row.value;
  transformedData.links.push({
    source: row.source,
    target: row.target,
    value: row.value,
  });
});
transformedData.nodes = Array.from(nodeMap.values());
