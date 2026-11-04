// Express Entry profile: expiry of the profile, test results, ECA and the invitation deadline.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('eep-rules').textContent);
const form = $('#eep-form');
const STORE = 'crsplanner.eeprofile.v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const DAY = 864e5;
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
// Same day N months later; if that day does not exist (Feb 29, Jan 31 + 1 month), the last day of that month.
const addMonths = (iso, m) => { const [y, mo, d] = iso.split('-').map(Number); const last = new Date(Date.UTC(y, mo - 1 + m + 1, 0)).getUTCDate(); return new Date(Date.UTC(y, mo - 1 + m, Math.min(d, last))).toISOString().slice(0, 10); };
const todayIso = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };

function update() {
  const f = form.elements;
  const out = $('#eep-out');
  const sub = f.submitted.value;
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(['submitted', 'ita', 'lang1', 'lang2', 'eca'].map((k) => [k, f[k].value])))); } catch (e) { /* ignore */ }
  if (!sub) { out.innerHTML = '<p>Enter the date you submitted your profile.</p>'; return; }
  const today = todayIso();
  const items = [];
  const profileEnd = addMonths(sub, R.profileMonths);
  const ita = f.ita.value && f.ita.value >= sub && f.ita.value <= profileEnd ? f.ita.value : '';
  if (!ita) items.push({ what: 'Profile expires if you are not invited', last: profileEnd, kind: 'profile' });
  // "Less than N years old": the last day it counts is the day before its N-year anniversary.
  for (const [k, label, yrs] of [['lang1', 'Language test results', R.languageYears], ['lang2', 'Second language test results', R.languageYears], ['eca', 'ECA report', R.ecaYears]]) {
    if (f[k].value) items.push({ what: `${label} last valid`, last: addDays(addMonths(f[k].value, yrs * 12), -1), kind: 'doc' });
  }
  const deadline = ita ? addDays(ita, R.itaDays) : null;
  if (deadline) items.push({ what: 'Apply by (invitation date + 60 days)', last: deadline, kind: 'ita' });
  items.sort((a, b) => a.last.localeCompare(b.last));
  const docs = items.filter((i) => i.kind === 'doc');
  const until = deadline || profileEnd;
  const short = docs.filter((d) => d.last < until);
  const gone = docs.filter((d) => d.last < today);
  const names = (list) => list.map((d) => d.what.replace(' last valid', '').replace('Language', 'language').replace('Second', 'second')).join(' and ');
  const goal = deadline ? 'your application deadline' : 'your profile expires';
  let tag, msg;
  if (gone.length) { tag = '<span class="tag no">Something has expired</span>'; msg = `Your ${names(gone)} no longer count${gone.length > 1 || /results/.test(gone[0].what) ? '' : 's'}. Your profile may not be eligible any more: renew and update your profile.`; }
  else if (short.length) { tag = '<span class="tag no">Renew before you apply</span>'; msg = `Your ${names(short)} stop${short.length > 1 || /results/.test(short[0].what) ? '' : 's'} counting after ${longDate(short[0].last)}, before ${goal}. ${deadline ? 'Apply before then or renew first.' : 'If you are invited after that date, you would need to renew before applying.'}`; }
  else { tag = '<span class="tag yes">Documents cover the whole period</span>'; msg = docs.length ? `Your documents stay valid until ${goal}.` : 'Add your test and ECA dates to check them too.'; }
  const left = Math.round((Date.parse(deadline || profileEnd) - Date.parse(today)) / DAY);
  const bad = f.ita.value && !ita ? '<p class="small">The invitation date must fall between the day you submitted the profile and the day it expires.</p>' : '';
  out.innerHTML = `<div class="total"><span><span class="of">${deadline ? 'Apply for permanent residence by' : 'Profile expires around'}</span><br><span class="score" style="font-size:2.2rem">${longDate(deadline || profileEnd)}</span></span>${tag}</div>
  <p>${msg}</p>${bad}
  <div class="table-scroll"><table><tbody>${items.map((i) => `<tr><td>${i.what}</td><td class="n">${longDate(i.last)}</td></tr>`).join('')}</tbody></table></div>
  <p class="small">${left >= 0 ? `${left} days left. ` : deadline ? 'This deadline has passed. ' : 'This date has passed: if you were not invited, create a new profile. '}Your IRCC account shows the exact expiry date and invitation deadline; if they differ from these, go by your account.</p>`;
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const init = saved || { submitted: '2026-05-15', ita: '', lang1: '2025-03-10', lang2: '', eca: '2023-01-20' };
for (const [k, v] of Object.entries(init)) if (form.elements[k]) form.elements[k].value = v;
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
