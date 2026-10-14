// PR residency obligation (IRPA s. 28): 730 days in a five-year period.
const $ = (s, el = document) => el.querySelector(s);
const R = JSON.parse(document.getElementById('residency-rules').textContent);
const form = $('#ro-form');
const STORE = 'crsplanner.residency.v1';
const DAY = 864e5;
const toDay = (iso) => (iso ? Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY) : null);
const toIso = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const todayIso = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10); };
const addYears = (iso, y) => { const [a, b, c] = iso.split('-').map(Number); let t = Date.UTC(a + y, b - 1, c); if (new Date(t).getUTCMonth() !== b - 1) t = Date.UTC(a + y, b - 1, c - 1); return Math.floor(t / DAY); };

// Days strictly between leaving and returning are days outside Canada, unless the trip counts.
function outside(trips, from, to) {
  const s = new Set();
  for (const t of trips) if (!t.counts) for (let d = Math.max(t.a + 1, from); d <= Math.min(t.b - 1, to); d++) s.add(d);
  return s;
}

function trips() {
  return [...document.querySelectorAll('.trip')].map((row) => ({ a: toDay($('[name=out]', row).value), b: toDay($('[name=back]', row).value), counts: $('[name=counts]', row).checked }))
    .filter((t) => t.a !== null && t.b !== null && t.b >= t.a);
}

function addTrip(out = '', back = '', counts = false) {
  const row = document.createElement('div');
  row.className = 'trip';
  row.innerHTML = `<div class="row"><div class="field"><label>Left Canada</label><input type="date" name="out" value="${out}"></div><div class="field"><label>Came back</label><input type="date" name="back" value="${back}"></div><div class="field" style="align-self:end"><button type="button" class="rm">Remove</button></div></div>
  <div class="field check"><input type="checkbox" name="counts"${counts ? ' checked' : ''}><label>This time abroad counts (see the conditions below)</label></div>`;
  $('.rm', row).addEventListener('click', () => { row.remove(); update(); });
  $('#trips').appendChild(row);
}

function update() {
  const checkIso = form.elements.check.value || todayIso();
  const prIso = form.elements.pr.value;
  const t = trips();
  const out = $('#ro-out');
  save(t);
  if (!prIso) { out.innerHTML = '<p>Enter the date you became a permanent resident.</p>'; return; }
  const pr = toDay(prIso), check = toDay(checkIso);
  if (check < pr) { out.innerHTML = '<p>The date to check is before you became a permanent resident.</p>'; return; }
  const under5 = check < addYears(prIso, R.periodYears);
  let html;
  if (under5) {
    const end = addYears(prIso, R.periodYears) - 1;
    const away = outside(t, pr, end);
    let sofar = 0; for (let d = pr; d < check; d++) if (!away.has(d)) sofar++;
    let planned = 0; for (let d = check; d <= end; d++) if (!away.has(d)) planned++;
    const need = Math.max(0, R.requiredDays - sofar);
    const ok = sofar + planned >= R.requiredDays;
    html = `<div class="total"><span><span class="score">${sofar}</span> <span class="of">/ ${R.requiredDays} days so far</span></span><span class="tag ${ok ? 'yes' : 'no'}">${ok ? 'On track' : 'Cannot reach 730'}</span></div>
    <div class="table-scroll"><table><tbody>
      <tr><td>Your first five-year period</td><td class="n">${prIso} to ${toIso(end)}</td></tr>
      <tr><td>Days counted up to ${checkIso}</td><td class="n">${sofar}</td></tr>
      <tr><td>Days still needed</td><td class="n">${need}</td></tr>
      <tr><td>Days left in the period, minus trips you entered</td><td class="n">${planned}</td></tr>
    </tbody></table></div>
    <p class="small">You have been a permanent resident for less than five years, so what matters is whether you can reach ${R.requiredDays} days in your first five years.${ok && need ? ` You could still spend up to ${planned - need} more days outside Canada in that period.` : ''}</p>`;
  } else {
    const start = addYears(checkIso, -R.periodYears), end = check - 1;
    const away = outside(t, start, end);
    let n = 0; for (let d = start; d <= end; d++) if (!away.has(d)) n++;
    const ok = n >= R.requiredDays;
    html = `<div class="total"><span><span class="score">${n}</span> <span class="of">/ ${R.requiredDays} days</span></span><span class="tag ${ok ? 'yes' : 'no'}">${ok ? 'Meets the obligation' : `${R.requiredDays - n} days short`}</span></div>
    <div class="table-scroll"><table><tbody>
      <tr><td>Five-year period checked</td><td class="n">${toIso(start)} to ${toIso(end)}</td></tr>
      <tr><td>Days that count</td><td class="n">${n}</td></tr>
      <tr><td>Days outside Canada that do not count</td><td class="n">${away.size}</td></tr>
    </tbody></table></div>`;
  }
  out.innerHTML = html;
}

function save(t) {
  const data = { check: form.elements.check.value, pr: form.elements.pr.value, trips: t.map((x) => [toIso(x.a), toIso(x.b), x.counts]) };
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
form.elements.check.value = saved?.check || todayIso();
form.elements.pr.value = saved?.pr || '';
(saved?.trips?.length ? saved.trips : [['', '', false]]).forEach(([a, b, c]) => addTrip(a, b, c));
$('#add-trip').addEventListener('click', () => addTrip());
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
