// Rural Community Immigration Pilot eligibility check.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('rcip-rules').textContent);
const form = $('#rcip-form');
const STORE = 'crsplanner.rcip.v1';
const need = (n) => (n <= R.funds.length ? R.funds[n - 1] : R.funds.at(-1) + (n - R.funds.length) * R.each);
const EXP = { 0: [0, 1, 2, 3], 1: [0, 1, 2, 3], 2: [1, 2, 3, 4], 3: [2, 3, 4], 4: [2, 3, 4] };
const CLB = { 0: 6, 1: 6, 2: 5, 3: 5, 4: 4, 5: 4 };
function update() {
  const f = form.elements;
  const offer = Number(f.offer.value), exp = Number(f.exp.value), hours = Number(f.hours.value) || 0, clb = Number(f.clb.value);
  const fam = Math.max(1, Number(f.family.value) || 1), funds = Number(f.funds.value) || 0;
  const expOk = offer === 5 ? f.same.checked : EXP[offer].includes(exp);
  const checks = [
    [`Job offer from a designated employer in ${f.community.value}`, f.designated.checked, ''],
    f.grad.checked ? ['Work experience: exempt as a recent graduate in the community', true, ''] : [offer === 5 ? 'Experience in the same 5-digit NOC as the TEER 5 offer' : `Experience in TEER ${EXP[offer].join(', ')} for a TEER ${offer} offer`, expOk, ''],
    f.grad.checked ? null : [`At least ${R.hours.toLocaleString('en-CA')} paid hours in the last 3 years`, hours >= R.hours, hours ? `${hours.toLocaleString('en-CA')} hours` : 'enter your hours'],
    [`Language: CLB ${CLB[offer]} in all four abilities`, clb >= CLB[offer], clb ? `lowest ${clb}` : 'add your test result'],
    ['Education: high school or higher (ECA if foreign)', f.edu.checked, ''],
    f.working.checked ? ['Settlement funds: not needed (working in Canada)', true, ''] : [`Settlement funds: $${need(fam).toLocaleString('en-CA')} for ${fam}`, funds >= need(fam), funds ? `$${funds.toLocaleString('en-CA')} available` : 'enter your funds'],
  ].filter(Boolean);
  const ok = checks.every((c) => c[1]);
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Meets the RCIP requirements' : 'Not yet';
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
