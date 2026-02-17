// review export
// date: 2026-02-17
// chart_id: chord-diagram
// section: echarts_js

option = {
  title: {
    text: post.title,
    left: 'center'
  },
  tooltip: {
    trigger: 'item',
    formatter: (params) => {
      if (params.dataType === 'edge') {
        const edge = params.data || {
        };
      const source = String(edge.source || '');
      const target = String(edge.target || '');
      const value = edge.value ?? params.value ?? 0;
      return `${source} -> ${target}: ${value}`;
    }
  const name = String(params.name || '');
  const value = params.value ?? 0;
  return `${name}: ${value}`;
}
},
series: [
    {
  type: 'chord',
  center: ['50%',
  '52%'],
  radius: ['58%',
  '78%'],
  startAngle: 90,
  padAngle: 3,
  minAngle: 1,
  clockwise: true,
  data: transformedData.data || [],
  edges: transformedData.edges || [],
  label: {
    show: true,
    position: 'outside',
    distance: 6
      },
  itemStyle: {
    borderColor: '#ffffff',
    borderWidth: 1
      },
  lineStyle: {
    color: 'source',
    opacity: 0.38,
    width: 1.2
      },
  emphasis: {
    focus: 'adjacency',
    lineStyle: {
      opacity: 0.72,
      width: 2.5
        }
  }
}
]
};
