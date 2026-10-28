// LMIA processing time (/lmia-processing-time/): ESDC's average business days for last month, counted from the submission date.
const $ = (s) => document.querySelector(s);
const D = JSON.parse(document.getElementById('lm-data').textContent);
const form = $('#lm-form');
const out = $('#lm-out');
const STORE = 'crsplanner.lmia.v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const iso = (d) => d.toISOString().slice(0, 10);
const longDate = (s) => `${MONTHS[Number(s.slice(5, 7)) - 1]} ${Number(s.slice(8, 10))}, ${s.slice(0, 4)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Adds n business days (Monday to Friday) after the start date; the start date itself is day 0. Public holidays are not skipped.
export function addBusinessDays(startIso, n) {
  const d = new Date(`${startIso}T00:00:00Z`);
  let k = 0;
  while (k < n) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) k++; }
  return iso(d);
}
function render() {
  const f = form.elements;
  let hint = '';
  if (f.prov.value && f.wage.value !== '') {
    const [name, thr] = D.thresholds[f.prov.value];
    const w = Number(f.wage.value);
    const s = w >= thr ? 'high' : 'low';
    if (f.stream.value !== s && (f.stream.value === 'high' || f.stream.value === 'low')) f.stream.value = s;
    hint = `<p class="small">CA$${w.toFixed(2)} an hour is ${w >= thr ? 'at or above' : 'below'} the ${esc(name)} threshold of CA$${thr.toFixed(2)}, so it goes in the ${s === 'high' ? 'high-wage' : 'low-wage'} stream.</p>`;
  }
  const k = f.stream.value, days = D.times[k];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const start = f.date.value || today;
  const end = addBusinessDays(start, days);
  const done = end < today;
  out.innerHTML = `<p class="panel-h">${esc(D.streams[k])}</p><div class="total"><span class="score" style="font-size:2.4rem">${days} business days</span></div>
<p>Counting ${days} business days from ${longDate(start)}${f.date.value ? '' : ' (today)'} gives <strong>${WD[new Date(`${end}T00:00:00Z`).getUTCDay()]}, ${longDate(end)}</strong>${done ? ', which has already passed' : ''}.</p>
<p class="small">The average for LMIAs decided in ${MONTHS[Number(D.latest.slice(5, 7)) - 1]} ${D.latest.slice(0, 4)}. It is not a promise: a single application can take longer or shorter, and public holidays add days.</p>${hint}`;
  const data = Object.fromEntries([...new FormData(form)]);
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [key, v] of Object.entries(saved)) { const el = form.elements[key]; if (el) el.value = v; }
form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('submit', (e) => e.preventDefault());
render();
