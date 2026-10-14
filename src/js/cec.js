// Canadian Experience Class eligibility check.
import { clbForScore, SKILLS } from './crs.js';
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('cec-rules').textContent);
const lang = JSON.parse(document.getElementById('lang-rules').textContent);
const form = $('#cec-form');
const STORE = 'crsplanner.cec.v1';
function update() {
  const f = form.elements;
  const clbs = SKILLS.map((s) => (f[s].value === '' ? null : clbForScore(lang, f.test.value, s, f[s].value)));
  const name = lang.tests[f.test.value].language === 'fr' ? 'NCLC' : 'CLB';
  SKILLS.forEach((s, i) => { $(`#${s}-clb`).textContent = clbs[i] === null ? '' : clbs[i] >= 4 ? `${name} ${clbs[i]}` : `below ${name} 4`; });
  const minClb = clbs.every((c) => c !== null) ? Math.min(...clbs) : null;
  const need = f.teer.value === '01' ? R.languageMin.teer01 : R.languageMin.teer23;
  const hours = Number(f.hours.value) || 0;
  const checks = [
    [`At least ${R.hours.toLocaleString('en-CA')} hours of skilled work (TEER 0 to 3) in Canada in the last ${R.years} years`, hours >= R.hours, hours ? `${hours.toLocaleString('en-CA')} hours entered` : 'enter your hours'],
    ['Work done while authorized to work in Canada under temporary resident status', f.authorized.checked, ''],
    ['Not counting time as a full-time student, co-op term, self-employed (except eligible physicians), volunteer or unpaid intern', f.clean.checked, ''],
    [`Language: ${name} ${need} or higher in all four abilities`, minClb !== null && minClb >= need, minClb === null ? 'enter your four scores' : `lowest ${name} ${minClb}`],
    ['Plan to live outside Quebec', f.quebec.checked, ''],
  ];
  const ok = checks.every(([, v]) => v);
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Meets the CEC minimum requirements' : 'Not yet';
  $('#checks').innerHTML = checks.map(([l, v, n]) => `<div class="cmp-row"><span>${l}</span><span class="tag ${v ? 'yes' : 'no'}">${v ? 'met' : 'not met'}</span>${n ? `<span class="sub">${n}</span>` : ''}</div>`).join('');
  const data = Object.fromEntries([...new FormData(form)]);
  for (const el of form.querySelectorAll('input[type=checkbox]')) data[el.name] = el.checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
const hoursFrom = () => { const w = Number(form.elements.weeks.value) || 0, h = Math.min(30, Number(form.elements.hpw.value) || 0); if (w && h) form.elements.hours.value = Math.round(w * h); };
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.elements.weeks.addEventListener('input', () => { hoursFrom(); update(); });
form.elements.hpw.addEventListener('input', () => { hoursFrom(); update(); });
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
