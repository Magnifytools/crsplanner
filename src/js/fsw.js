// Federal Skilled Worker Program: 67-point selection grid.
import { clbForScore, SKILLS } from './crs.js';
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('fsw-rules').textContent);
const lang = JSON.parse(document.getElementById('lang-rules').textContent);
const form = $('#fsw-form');
const STORE = 'crsplanner.fsw.v1';
function agePts(a) { if (a < 18) return 0; if (a <= 35) return R.age['18-35']; if (a >= 47) return 0; return R.age[String(a)]; }
function update() {
  const f = form.elements;
  const clbs = SKILLS.map((s) => (f[s].value === '' ? null : clbForScore(lang, f.test.value, s, f[s].value)));
  SKILLS.forEach((s, i) => { $(`#${s}-clb`).textContent = clbs[i] === null ? '' : clbs[i] >= 4 ? `CLB ${clbs[i]}` : 'below CLB 4'; });
  const done = clbs.every((c) => c !== null);
  const minClb = done ? Math.min(...clbs) : null;
  const langOk = done && minClb >= R.language.firstMinClb;
  const first = langOk ? clbs.reduce((t, c) => t + R.language.firstPerAbility.find(([m]) => c >= m)[1], 0) : 0;
  const lang2 = f.second.checked ? R.language.secondAllClb5 : 0;
  const edu = R.education[Number(f.edu.value)][1];
  const exp = R.experience[Number(f.exp.value)][1];
  const age = agePts(Number(f.age.value));
  const ae = f.offer.checked ? R.arrangedEmployment : 0;
  const adapt = Math.min(R.adaptabilityMax, R.adaptability.reduce((t, [id, , p]) => t + (id === 'arranged' ? (f.offer.checked ? p : 0) : f[id].checked ? p : 0), 0));
  const parts = [['Language', first + lang2, R.language.max], ['Education', edu, 25], ['Experience', exp, 15], ['Age', age, 12], ['Arranged employment', ae, 10], ['Adaptability', adapt, R.adaptabilityMax]];
  const total = parts.reduce((t, [, v]) => t + v, 0);
  $('#total').textContent = total;
  $('#breakdown').innerHTML = parts.map(([l, v, m]) => `<tr><td>${l}</td><td class="n">${v} <span class="small">/ ${m}</span></td></tr>`).join('');
  const st = $('#status');
  if (done && !langOk) { st.className = 'tag no'; st.textContent = `Not eligible: needs CLB ${R.language.firstMinClb} in all four`; }
  else if (total >= R.passMark) { st.className = 'tag yes'; st.textContent = `Pass: ${total} of ${R.passMark} needed`; }
  else { st.className = 'tag no'; st.textContent = `${R.passMark - total} points short of ${R.passMark}`; }
  const data = Object.fromEntries([...new FormData(form)]);
  for (const el of form.querySelectorAll('input[type=checkbox]')) data[el.name] = el.checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { test: 'ielts', speaking: '7', listening: '8', reading: '7', writing: '7', edu: '3', exp: '1', age: '30' };
for (const [k, v] of Object.entries(start)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
