// BC PNP Skills Immigration registration score (max 200).
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('bc-rules').textContent);
const form = $('#bc-form');
const STORE = 'crsplanner.bcpnp.v1';
const wagePts = (w) => (w >= 70 ? 55 : w >= 16 ? Math.floor(w) - 15 : 0);
function update() {
  const f = form.elements;
  const o = (k) => R[k].options[Number(f[k].value)][1];
  const exp = Math.min(R.experience.max, o('experience') + (f.expCanada.checked ? R.experience.canada : 0) + (f.expBC.checked ? R.experience.currentBC : 0));
  const eduPlace = f.eduPlace.value === 'bc' ? R.education.bc : f.eduPlace.value === 'canada' ? R.education.canada : 0;
  const edu = Math.min(R.education.max, o('education') + (o('education') > 0 ? eduPlace : 0) + (f.designation.checked ? R.education.designation : 0));
  const lang = Math.min(R.language.max, o('language') + (f.both.checked ? R.language.both : 0));
  let hourly = Number(f.hourly.value) || 0;
  const annual = Number(f.annual.value) || 0, hours = Math.min(40, Math.max(30, Number(f.hours.value) || 40));
  if (!hourly && annual) hourly = annual / 52 / hours;
  const wage = wagePts(hourly);
  const areaIdx = Number(f.area.value);
  const area = Math.min(R.area.max, o('area') + (areaIdx > 0 && f.regional.checked ? R.area.regional : 0));
  const parts = [['Directly related work experience', exp, 40], ['Education', edu, 40], ['Language', lang, 40], ['Hourly wage', wage, 55], ['Area of employment', area, 25]];
  $('#total').textContent = parts.reduce((t, [, v]) => t + v, 0);
  $('#wage-note').textContent = hourly ? `Hourly wage used: $${hourly.toFixed(2)}` : '';
  $('#breakdown').innerHTML = parts.map(([l, v, m]) => `<tr><td>${l}</td><td class="n">${v} <span class="small">/ ${m}</span></td></tr>`).join('');
  const data = Object.fromEntries([...new FormData(form)]);
  for (const el of form.querySelectorAll('input[type=checkbox]')) data[el.name] = el.checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { experience: '3', education: '3', language: '2', hourly: '30', area: '0' };
for (const [k, v] of Object.entries(start)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
