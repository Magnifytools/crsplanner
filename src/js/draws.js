const data = JSON.parse(document.getElementById('draws-data').textContent);
const chips = document.getElementById('chips');
const rows = [...document.querySelectorAll('#draws-table tbody tr')];
const chart = document.getElementById('cutoff-chart');
const summary = document.getElementById('chart-summary');

function drawChart(cat) {
  const list = data.rounds.filter((r) => (cat === 'all' ? true : r.category === cat) && r.crs !== null && r.date >= data.chartFrom).reverse();
  const W = 760, H = 260, L = 44, R = 12, T = 12, B = 28;
  if (list.length < 2) { chart.innerHTML = ''; summary.textContent = 'Not enough draws in this period to draw a line.'; return; }
  const t = (d) => Date.parse(d);
  const x0 = t(data.chartFrom), x1 = t(data.latest);
  const ys = list.map((r) => r.crs);
  const span = Math.max(...ys) - Math.min(...ys);
  const step = span <= 60 ? 10 : span <= 150 ? 25 : span <= 300 ? 50 : 100;
  let lo = Math.floor(Math.min(...ys) / step) * step, hi = Math.ceil(Math.max(...ys) / step) * step;
  if (hi === lo) hi += step;
  const X = (d) => L + ((t(d) - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let g = '';
  for (let v = lo; v <= hi; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  const y0 = new Date(x0).getUTCFullYear();
  const y1 = new Date(x1).getUTCFullYear();
  for (let y = y0 + 1; y <= y1; y++) { const d = `${y}-01-01`; g += `<text x="${X(d)}" y="${H - 8}" text-anchor="middle">${y}</text>`; }
  const path = list.map((r, i) => `${i ? 'L' : 'M'}${X(r.date).toFixed(1)} ${Y(r.crs).toFixed(1)}`).join('');
  const dots = list.map((r) => `<circle class="dot" cx="${X(r.date).toFixed(1)}" cy="${Y(r.crs).toFixed(1)}" r="2.5"><title>${r.date}: ${r.crs} (${r.name})</title></circle>`).join('');
  chart.innerHTML = cat === 'all' ? `${g}${dots}` : `${g}<path class="line" d="${path}"/>${dots}`;
  const last = list[list.length - 1];
  summary.textContent = `${list.length} draws since ${data.chartFrom}; cut-offs from ${Math.min(...ys)} to ${Math.max(...ys)}; latest ${last.crs} on ${last.date}.`;
}

function select(cat) {
  [...chips.querySelectorAll('button')].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  rows.forEach((tr) => { tr.hidden = !(cat === 'all' || tr.dataset.cat === cat); });
  drawChart(cat);
  try { localStorage.setItem('crsplanner.drawcat', cat); } catch (e) { /* ignore */ }
}

chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) select(b.dataset.cat); });
let start = 'cec';
try { start = localStorage.getItem('crsplanner.drawcat') || 'cec'; } catch (e) { start = 'cec'; }
if (!chips.querySelector(`[data-cat="${start}"]`)) start = 'all';
select(start);
