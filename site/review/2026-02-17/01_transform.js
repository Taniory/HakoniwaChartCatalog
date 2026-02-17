// review export
// date: 2026-02-17
// chart_id: chord-diagram
// section: transform_js

transformedData = {
  data: [],
  edges: [] };
if (rawData && Array.isArray(rawData.rows)) {
  const nodeMap = new Map();
  const edgeMap = new Map();
  function ensureNode(name) {
    const safeName = String(name || '').trim();
    if (!safeName) {
      return null;
    }
  if (!nodeMap.has(safeName)) {
    nodeMap.set(safeName,
    {
      name: safeName,
      value: 0 }
    );
  }
return nodeMap.get(safeName);
}
rawData.rows.forEach((row) => {
  if (!row || typeof row !== 'object') {
    return;
  }
const source = String(row.source || '').trim();
const target = String(row.target || '').trim();
const value = Number(row.value);
if (!source || !target || !Number.isFinite(value) || value <= 0) {
  return;
}
const sourceNode = ensureNode(source);
const targetNode = ensureNode(target);
if (!sourceNode || !targetNode) {
  return;
}
sourceNode.value += value;
targetNode.value += value;
const edgeKey = `${source}=>${target}`;
if (!edgeMap.has(edgeKey)) {
  edgeMap.set(edgeKey,
  {
    source,
    target,
    value: 0 }
  );
}
edgeMap.get(edgeKey).value += value;
}
);
transformedData.data = Array.from(nodeMap.values());
transformedData.edges = Array.from(edgeMap.values());
}
