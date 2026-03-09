import fs from 'fs';

const file = 'C:/Users/tanio/home/daily_charts_antigrabity/DailyCharts/site/posts/2026-04-06T000000Z.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Seeded random for reproducible generation
let s = 42;
function rand() {
  s |= 0; s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function randn() {
  let u = 0, v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const n = 2000;
const cx = 450, cy = 220, sx = 120, sy = 85;
const rows = [];
for (let i = 0; i < n; i++) {
  rows.push({
    x: Math.round((cx + randn() * sx) * 10) / 10,
    y: Math.round((cy + randn() * sy) * 10) / 10
  });
}

data.sample_data_json = { rows };

data.transform_js = `
const HEX_R = 28; // data-space radius

// Extract points from rawData
const points = rawData.rows.map(r => [r.x, r.y]);

// --- Hexbin in data space (flat-top hexagons) ---
const axialToData = (q, r) => [
  HEX_R * 1.5 * q,
  HEX_R * Math.sqrt(3) * (r + q / 2)
];

const dataToAxialRound = (x, y) => {
  const q_f = (2/3 * x) / HEX_R;
  const r_f = (-1/3 * x + Math.sqrt(3)/3 * y) / HEX_R;
  let q = Math.round(q_f);
  let r = Math.round(r_f);
  let z = Math.round(-q_f - r_f);
  const dq = Math.abs(q - q_f), dr = Math.abs(r - r_f), dz = Math.abs(z - (-q_f - r_f));
  if (dq > dr && dq > dz) q = -r - z;
  else if (dr > dz) r = -q - z;
  return [q, r];
};

const bins = {};
points.forEach(([px, py]) => {
  const [q, r] = dataToAxialRound(px, py);
  const key = q + ',' + r;
  if (!bins[key]) bins[key] = {q, r, count: 0};
  bins[key].count++;
});

const hexData = Object.values(bins).map(b => {
  const [cx2, cy2] = axialToData(b.q, b.r);
  return {cx: cx2, cy: cy2, count: b.count};
});

const maxCount = Math.max(...hexData.map(b => b.count), 1);

transformedData = {hexData, maxCount, HEX_R};
`.trim();

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Successfully updated hexbin sample data and transform_js');
