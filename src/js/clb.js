import { clbForScore, SKILLS } from './crs.js';

const $ = (s) => document.querySelector(s);
const lang = JSON.parse(document.getElementById('lang-rules').textContent);
const form = $('#clb-form');
const STORE = 'crsplanner.clb.v1';

function limits() {
  const t = lang.tests[form.elements.test.value];
  for (const s of SKILLS) {
    const i = form.elements[s];
    i.min = t.min; i.max = t.maxBySkill ? t.maxBySkill[s] : t.max; i.step = t.step;
  }
}

function update() {
  limits();
  const test = form.elements.test.value;
  const t = lang.tests[test];
  const name = t.language === 'fr' ? 'NCLC' : 'CLB';
  const levels = SKILLS.map((s) => {
    const v = form.elements[s].value;
    return v === '' ? null : clbForScore(lang, test, s, v);
  });
  SKILLS.forEach((s, i) => {
    const c = levels[i];
    $(`#out-${s}`).textContent = c === null ? '–' : c >= 4 ? `${name} ${c}${c === 10 ? '+' : ''}` : `below ${name} 4`;
  });
  const done = levels.every((c) => c !== null);
  const min = done ? Math.min(...levels) : null;
  $('#out-min').textContent = done ? (min >= 4 ? `${name} ${min}` : `below ${name} 4`) : 'Enter all four scores';
  const fstOk = done && levels[0] >= 5 && levels[1] >= 5 && levels[2] >= 4 && levels[3] >= 4;
  const checks = [
    ['Federal Skilled Worker: 7 in all four', done && min >= 7],
    ['Canadian Experience Class, TEER 0 or 1 jobs: 7 in all four', done && min >= 7],
    ['Canadian Experience Class, TEER 2 or 3 jobs: 5 in all four', done && min >= 5],
    ['Federal Skilled Trades: 5 speaking and listening, 4 reading and writing', fstOk],
    ['Maximum language points in the CRS: 10 in all four', done && min >= 10],
  ];
  $('#out-checks').innerHTML = done
    ? checks.map(([label, ok]) => `<div class="cmp-row"><span>${label}</span><span class="tag ${ok ? 'yes' : 'no'}">${ok ? 'met' : 'not met'}</span></div>`).join('')
    : '';
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...new FormData(form)]))); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { test: 'ielts', speaking: '6.5', listening: '7.5', reading: '6.5', writing: '6.5' };
for (const [k, v] of Object.entries(start)) if (form.elements[k]) form.elements[k].value = v;
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
