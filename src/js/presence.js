// Physical presence for Canadian citizenship, following IRCC's published rules (see data in the page).
const $ = (s, el = document) => el.querySelector(s);
const R = JSON.parse(document.getElementById('presence-rules').textContent);
const form = $('#pp-form');
const STORE = 'crsplanner.presence.v1';
const DAY = 864e5;
const toDay = (iso) => (iso ? Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY) : null);
const toIso = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const fmt = (n) => n.toLocaleString('en-CA', { maximumFractionDigits: 1 });
const todayIso = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10); };
const minusYears = (iso, y) => { const [a, b, c] = iso.split('-').map(Number); let t = Date.UTC(a - y, b - 1, c); if (new Date(t).getUTCMonth() !== b - 1) t = Date.UTC(a - y, b - 1, c - 1); return Math.floor(t / DAY); };

// Days strictly between leaving and returning are absences; both travel days count as in Canada.
function absentSet(trips, from, to) {
  const s = new Set();
  for (const [a, b] of trips) for (let d = Math.max(a + 1, from); d <= Math.min(b - 1, to); d++) s.add(d);
  return s;
}

function count(applyIso, pr, temp, trips) {
  const start = minusYears(applyIso, R.periodYears), end = toDay(applyIso) - 1;
  const away = absentSet(trips, start, end);
  let prDays = 0, tempDays = 0, absent = away.size;
  for (let d = start; d <= end; d++) {
    if (away.has(d)) continue;
    if (pr !== null && d >= pr) prDays++;
    else if (temp !== null && d >= temp && (pr === null || d < pr)) tempDays++;
  }
  const tempCredit = Math.min(tempDays * R.temporaryDayValue, R.temporaryMaxCredit);
  return { start, end, prDays, tempDays, tempCredit, absent, total: prDays + tempCredit };
}

function trips() {
  return [...document.querySelectorAll('.trip')].map((row) => [toDay($('[name=out]', row).value), toDay($('[name=back]', row).value)])
    .filter(([a, b]) => a !== null && b !== null && b >= a);
}

function addTrip(out = '', back = '') {
  const row = document.createElement('div');
  row.className = 'row trip';
  row.innerHTML = `<div class="field"><label>Left Canada</label><input type="date" name="out" value="${out}"></div><div class="field"><label>Came back</label><input type="date" name="back" value="${back}"></div><div class="field" style="align-self:end"><button type="button" class="rm">Remove</button></div>`;
  $('.rm', row).addEventListener('click', () => { row.remove(); update(); });
  $('#trips').appendChild(row);
}

function update() {
  const applyIso = form.elements.apply.value || todayIso();
  const pr = toDay(form.elements.pr.value);
  const temp = toDay(form.elements.temp.value);
  const t = trips();
  const out = $('#pp-out');
  if (pr === null) { out.innerHTML = '<p>Enter the date you became a permanent resident.</p>'; save(t); return; }
  const r = count(applyIso, pr, temp, t);
  const ok = r.total >= R.requiredDays;
  let earliest = '';
  if (!ok) {
    const base = toDay(applyIso);
    for (let k = 1; k <= 366 * R.periodYears; k++) {
      const c = count(toIso(base + k), pr, temp, t);
      if (c.total >= R.requiredDays) { earliest = toIso(base + k); break; }
    }
  }
  out.innerHTML = `
    <div class="total"><span><span class="score">${fmt(r.total)}</span> <span class="of">/ ${R.requiredDays.toLocaleString('en-CA')} days</span></span><span class="tag ${ok ? 'yes' : 'no'}">${ok ? 'Meets the minimum' : `${fmt(R.requiredDays - r.total)} days short`}</span></div>
    <div class="table-scroll"><table><tbody>
      <tr><td>Eligibility period</td><td class="n">${toIso(r.start)} to ${toIso(r.end)}</td></tr>
      <tr><td>Days in Canada as a permanent resident</td><td class="n">${r.prDays}</td></tr>
      <tr><td>Days in Canada before becoming a permanent resident</td><td class="n">${r.tempDays}</td></tr>
      <tr><td>Credit for those days (half, max ${R.temporaryMaxCredit})</td><td class="n">${fmt(r.tempCredit)}</td></tr>
      <tr><td>Days outside Canada in the period</td><td class="n">${r.absent}</td></tr>
    </tbody></table></div>
    ${ok ? `<p class="small">IRCC encourages applying with more than the minimum, to allow for any miscalculation.</p>` : earliest ? `<p>With no trips other than the ones listed, you would reach ${R.requiredDays.toLocaleString('en-CA')} days for an application signed on <strong>${earliest}</strong>.</p>` : '<p>You would not reach the minimum within the next five years with these dates.</p>'}`;
  save(t);
}

function save(t) {
  const data = { apply: form.elements.apply.value, pr: form.elements.pr.value, temp: form.elements.temp.value, trips: t.map(([a, b]) => [toIso(a), toIso(b)]) };
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
form.elements.apply.value = saved?.apply || todayIso();
form.elements.pr.value = saved?.pr || '';
form.elements.temp.value = saved?.temp || '';
(saved?.trips?.length ? saved.trips : [['', '']]).forEach(([a, b]) => addTrip(a, b));
$('#add-trip').addEventListener('click', () => { addTrip(); });
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
