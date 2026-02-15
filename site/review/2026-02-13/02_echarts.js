// review export
// date: 2026-02-13
// chart_id: horizon-chart
// section: echarts_js

option = {
  xAxis: {
    type: 'category',
    data: transformedData.map((d) => d.label) },
  yAxis: {
    type: 'value' },
  series: [{
    type: 'bar',
    data: transformedData.map((d) => d.value) }
  ] };
