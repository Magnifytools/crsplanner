// Manitoba PNP Expression of Interest ranking points (Skilled Worker and International Education streams).
import { clbForScore, SKILLS } from './crs.js';
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('mpnp-rules').textContent);
const lang = JSON.parse(document.getElementById('lang-rules').textContent);
const form = $('#mpnp-form');
const STORE = 'crsplanner.mpnp.v1';
const perBand = (clb) => R.language.firstPerBand.find(([min]) => clb >= min)[1];
function agePts(a) {
  if (a < 18) return 0; if (a >= 21 && a <= 45) return R.age['21-45']; if (a >= 50) return 0;
  return R.age[String(a)] ?? 0;
}
function update() {
  const f = form.elements;
  const test = f.test.value;
  const clbs = SKILLS.map((s) => (f[s].value === '' ? null : clbForScore(lang, test, s, f[s].value)));
  SKILLS.forEach((s, i) => { $(`#${s}-clb`).textContent = clbs[i] === null ? '' : clbs[i] >= 4 ? `CLB ${clbs[i]}` : 'below CLB 4'; });
  const langPts = clbs.reduce((t, c) => t + (c === null ? 0 : perBand(c)), 0) + (f.second.checked ? R.language.secondOverallClb5 : 0);
  const age = agePts(Number(f.age.value));
  const exp = R.experience.options[Number(f.exp.value)][1] + (f.licensed.checked ? R.experience.licensed : 0);
  const edu = R.education.options[Number(f.edu.value)][1];
  const conn = Number(f.connection.value);
  const demand = Number(f.demand.value);
  let adapt;
  if (demand > 0) adapt = demand;
  else adapt = conn + (f.regional.checked && conn > 0 ? R.adaptability.regional : 0);
  adapt = Math.min(adapt, R.adaptability.max);
  const risk = Math.max(R.risk.min, (f.riskWork.checked ? R.risk.otherProvinceWork : 0) + (f.riskStudy.checked ? R.risk.otherProvinceStudy : 0));
  const parts = [['Language', langPts, R.language.max], ['Age', age, R.age.max], ['Work experience', exp, R.experience.max], ['Education', edu, R.education.max], ['Adaptability', adapt, R.adaptability.max], ['Risk assessment', risk, 0]];
  $('#total').textContent = parts.reduce((t, [, v]) => t + v, 0);
  $('#breakdown').innerHTML = parts.map(([l, v, m]) => `<tr><td>${l}</td><td class="n">${v}${m ? ` <span class="small">/ ${m}</span>` : ''}</td></tr>`).join('');
  $('#adapt-warn').hidden = conn > 0 || demand > 0;
  const data = Object.fromEntries([...new FormData(form)]);
  for (const k of ['second', 'licensed', 'regional', 'riskWork', 'riskStudy']) data[k] = f[k].checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { test: 'ielts', speaking: '6', listening: '6', reading: '6', writing: '6', age: '30', exp: '2', edu: '2', connection: '100', demand: '0' };
for (const [k, v] of Object.entries(start)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
