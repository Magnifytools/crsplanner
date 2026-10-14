// SINP International Skilled Worker points grid.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('sinp-rules').textContent);
const form = $('#sinp-form');
const STORE = 'crsplanner.sinp.v1';
function update() {
  const f = form.elements;
  const offerSub = f.sub.value === 'offer';
  $('#conn-offer').hidden = !offerSub;
  $('#conn-other').hidden = offerSub;
  const rows = R.factors.map((x) => { const o = x.options[Number(f[x.id].value)]; return [x.label, o[1]]; });
  const c = R.connection;
  const conn = offerSub ? (f.offer.checked ? c.offer[1] : 0) : Math.min(c.max, (f.relative.checked ? c.relative[1] : 0) + (f.pastWork.checked ? c.pastWork[1] : 0) + (f.pastStudy.checked ? c.pastStudy[1] : 0));
  rows.push(['Connection to Saskatchewan', conn]);
  const total = rows.reduce((t, [, p]) => t + p, 0);
  $('#total').textContent = total;
  $('#breakdown').innerHTML = rows.map(([l, p]) => `<tr><td>${l}</td><td class="n">${p}</td></tr>`).join('');
  const ok = total >= R.minimumToApply;
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? `Meets the ${R.minimumToApply}-point minimum` : `${R.minimumToApply - total} points below the minimum`;
  const data = Object.fromEntries([...new FormData(form)]);
  for (const k of ['offer', 'relative', 'pastWork', 'pastStudy']) data[k] = f[k].checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const start = saved || { sub: 'ee', education: '1', exp5: '2', exp10: '4', lang1: '1', lang2: '5', age: '2' };
for (const [k, v] of Object.entries(start)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
