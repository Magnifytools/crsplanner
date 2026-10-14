// PGWP length, language requirement and deadline.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('pgwp-rules').textContent);
const form = $('#pgwp-form');
const STORE = 'crsplanner.pgwp.v1';
const addDays = (iso, d) => { const t = new Date(`${iso}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); };
const monthsBetween = (a, b) => { const x = new Date(`${a}T12:00:00Z`), y = new Date(`${b}T12:00:00Z`); return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth() - (y.getUTCDate() < x.getUTCDate() ? 1 : 0); };
const fmtD = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
function update() {
  const f = form.elements;
  const lv = f.level.value, m = Number(f.months.value) || 0;
  const uni = lv !== 'college';
  const needClb = uni ? R.clbDegree : R.clbCollege;
  const clb = Number(f.clb.value);
  const needField = (lv === 'uni' || lv === 'college') && !f.before.checked;
  let len = m < R.min ? 0 : lv === 'master' || m >= 24 ? 36 : m;
  let note = m < R.min ? `Programs shorter than ${R.min} months do not qualify.` : lv === 'master' ? 'Master’s degree of at least 8 months: up to 3 years.' : m >= 24 ? 'Program of 2 years or more: up to 3 years.' : 'Up to the length of your program.';
  const today = new Date().toISOString().slice(0, 10);
  if (len && f.passport.value) {
    const start = f.done.value && f.done.value > today ? f.done.value : today;
    const cap = monthsBetween(start, f.passport.value);
    if (cap < len) { note += ` Your passport limits it to about ${Math.max(0, cap)} months; renew it to get the full length.`; len = Math.max(0, cap); }
  }
  const checks = [
    [`Program of at least ${R.min} months at a PGWP-eligible institution`, m >= R.min && f.dli.checked, ''],
    ['Full-time student every semester', f.fulltime.checked, ''],
    ['No more than 50% by distance learning', (Number(f.online.value) || 0) <= 50, ''],
    [`Language: CLB/NCLC ${needClb} in all four abilities`, clb >= needClb, clb ? `lowest ${clb}` : 'add your test result'],
    [needField ? 'Eligible field of study (study permit applied on or after Nov 1, 2024)' : 'No field of study requirement for your case', needField ? f.field.checked : true, ''],
    ['Never had a PGWP before', !f.had.checked, ''],
  ];
  if (f.done.value) { const dl = addDays(f.done.value, R.days); checks.push([`Apply by ${fmtD(dl)} (${R.days} days after completion)`, today <= dl, today > dl ? 'deadline passed' : '']); }
  const ok = checks.every((c) => c[1]);
  $('#len').textContent = len >= 36 ? '3' : len;
  $('#len-unit').textContent = len >= 36 ? 'years' : 'months';
  $('#len-note').textContent = note;
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Likely eligible' : 'Not yet';
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
