// Atlantic Immigration Program eligibility check.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('aip-rules').textContent);
const form = $('#aip-form');
const STORE = 'crsplanner.aip.v1';
const need = (n) => (n <= R.funds.length ? R.funds[n - 1] : R.funds.at(-1) + (n - R.funds.length) * R.each);
function update() {
  const f = form.elements;
  const offer = f.offer.value, exp = Number(f.exp.value), hours = Number(f.hours.value) || 0, clb = Number(f.clb.value);
  const fam = Math.max(1, Number(f.family.value) || 1), funds = Number(f.funds.value) || 0;
  const eduNeed = Number(offer) <= 1 ? 2 : 1;
  const checks = [
    ['Full-time, non-seasonal offer from a designated employer', f.designated.checked, ''],
    f.grad.checked ? ['Work experience: exempt as a recent Atlantic graduate', true, ''] : [`Experience in TEER ${R.exp[offer].join(', ')} for a TEER ${offer} offer`, R.exp[offer].includes(exp), ''],
    f.grad.checked ? null : [`At least ${R.hours.toLocaleString('en-CA')} paid hours in the last 5 years`, hours >= R.hours, hours ? `${hours.toLocaleString('en-CA')} hours` : 'enter your hours'],
    [`Language: CLB ${R.clb[offer]} in all four abilities`, clb >= R.clb[offer], clb ? `lowest ${clb}` : 'add your test result'],
    [eduNeed === 2 ? 'Education: one-year post-secondary or higher' : 'Education: high school diploma or higher', Number(f.edu.value) >= eduNeed, ''],
    f.working.checked ? ['Settlement funds: not needed (working in Canada)', true, ''] : [`Settlement funds: $${need(fam).toLocaleString('en-CA')} for ${fam}`, funds >= need(fam), funds ? `$${funds.toLocaleString('en-CA')} available` : 'enter your funds'],
  ].filter(Boolean);
  const ok = checks.every((c) => c[1]);
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Meets the AIP requirements' : 'Not yet';
  $('#checks').innerHTML = checks.map(([l, v, n]) => `<div class="cmp-row"><span>${l}</span><span class="tag ${v ? 'yes' : 'no'}">${v ? 'met' : 'not met'}</span>${n ? `<span class="sub">${n}</span>` : ''}</div>`).join('');
  const data = Object.fromEntries([...new FormData(form)]);
  for (const el of form.querySelectorAll('input[type=checkbox]')) data[el.name] = el.checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
