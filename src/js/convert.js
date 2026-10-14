import { clbForScore, SKILLS } from './crs.js';

const $ = (s) => document.querySelector(s);
const lang = JSON.parse(document.getElementById('lang-rules').textContent);
const form = $('#conv-form');
const STORE = 'crsplanner.convert.v1';
const fmt = (t, v) => (t.step < 1 ? Number(v).toFixed(1) : String(v));

function range(t, s, i) {
  const lo = t[s][i];
  const next = t[s][i + 1];
  if (next === undefined) return `${fmt(t, lo)}+`;
  const hi = Math.round((next - t.step) * 10) / 10;
  return hi <= lo ? fmt(t, lo) : `${fmt(t, lo)}–${fmt(t, hi)}`;
}

function limits() {
  const t = lang.tests[form.elements.from.value];
  for (const s of SKILLS) { const i = form.elements[s]; i.min = t.min; i.max = t.maxBySkill ? t.maxBySkill[s] : t.max; i.step = t.step; }
}

function update() {
  limits();
  const from = form.elements.from.value, to = form.elements.to.value;
  const tt = lang.tests[to];
  for (const s of SKILLS) {
    const v = form.elements[s].value;
    const out = $(`#eq-${s}`), sub = $(`#clb-${s}`);
    if (v === '') { out.textContent = '–'; sub.textContent = ''; continue; }
    const c = clbForScore(lang, from, s, v);
    if (c < 4) { out.textContent = '–'; sub.textContent = 'below CLB 4'; continue; }
    out.textContent = from === to ? v : range(tt, s, lang.levels.indexOf(c));
    sub.textContent = `CLB ${c}${c === 10 ? '+' : ''}`;
  }
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...new FormData(form)]))); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { from: 'celpip', to: 'ielts', speaking: '9', listening: '9', reading: '9', writing: '9' };
for (const [k, v] of Object.entries(start)) if (form.elements[k]) form.elements[k].value = v;
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
