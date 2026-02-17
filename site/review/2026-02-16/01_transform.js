// review export
// date: 2026-02-16
// chart_id: radial-treemap
// section: transform_js

transformedData = {
  name: 'root',
  children: [] };
const pathMap = {
  'root': transformedData };
rawData.rows.forEach(row => {
  const parts = row.path.split('/');
  let currentParentPath = 'root';
  let currentParentNode = transformedData;
  for (let i = 0;
  i < parts.length;
  i++) {
    const part = parts[i];
    const currentPath = (currentParentPath === 'root' ? '' : currentParentPath + '/') + part;
    if (!pathMap[currentPath]) {
      const newNode = {
        name: part };
      if (i === parts.length - 1 && row.size > 0) {
        // It's a leaf node with a size                newNode.value = row.size;            } else {                newNode.children = [];            }            currentParentNode.children.push(newNode);            pathMap[currentPath] = newNode;        }        currentParentNode = pathMap[currentPath];        currentParentPath = currentPath;    }});
