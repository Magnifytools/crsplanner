// IEC: numbers for one country from IRCC's rounds of invitations, and the deadlines after an invitation.
const $ = (s) => document.querySelector(s);
const D = JSON.parse(document.getElementById('iec-data').textContent);
const form = $('#iec-form');
const STORE = 'crsplanner.iec.v1';
const CAT = { wh: 'Working Holiday', yp: 'Young Professionals', coop: 'International Co-op (Internship)' };
const RT = { 1: 'Excellent', 2: 'Very good', 3: 'Fair', 4: 'Low', 5: 'Very low' };
const RANGE = { 1: '80% to 99%', 2: '60% to 79%', 3: '40% to 59%', 4: '20% to 39%', 5: '1% to 19%' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const fmt = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toLocaleString('en-CA'));
// "Week of January 19, 2026" + "Week of October 19, 2026" -> "From the week of January 19 to the week of October 19, 2026"
const rounds = (r) => { const a = (r.firstRound || '').replace(/^Week of /, ''), b = (r.finalRound || '').replace(/^Week of /, ''); if (!a || !b) return `${r.firstRound || ''} ${r.finalRound || ''}`.trim(); const ya = a.slice(-4), yb = b.slice(-4); return `From the week of ${ya === yb ? a.replace(/, \d{4}$/, '') : a} to the week of ${b}`; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function update() {
  const f = form.elements;
  const code = f.country.value;
  const rows = D.rows.filter((r) => r.code === code);
  const prev = D.prev ? D.prev.rows.filter((r) => r.code === code) : [];
  const cards = rows.map((r) => {
    const p = prev.find((x) => x.category === r.category && x.sub === r.sub);
    const rating = D.closed ? 'Season closed' : RT[r.rating] ? `${RT[r.rating]} (${RANGE[r.rating]} chance in the next round)` : 'No rating this week';
    return `<h3>${CAT[r.category]}${r.sub ? ` (${esc(r.sub)})` : ''}</h3>
    <div class="table-scroll"><table><tbody>
      <tr><td>Quota ${D.season}</td><td class="n">${fmt(r.quota)}</td></tr>
      ${p ? `<tr><td>Quota ${D.prev.season}</td><td class="n">${fmt(p.quota)}</td></tr>` : ''}
      <tr><td>Invitations sent</td><td class="n">${fmt(r.invitations)}</td></tr>
      <tr><td>Candidates in the pool</td><td class="n">${fmt(r.candidates)}</td></tr>
      <tr><td>Spots left</td><td class="n">${fmt(r.spots)}</td></tr>
      <tr><td>Chances</td><td>${rating}</td></tr>
      <tr><td>Rounds</td><td>${esc(rounds(r))}</td></tr>
    </tbody></table></div>`;
  }).join('');
  let dl = '';
  const ita = f.ita.value, acc = f.accepted.value;
  if (ita || acc) {
    const rowsDl = [];
    if (ita) rowsDl.push(['Accept by (invitation + ' + D.acceptDays + ' days)', longDate(addDays(ita, D.acceptDays))]);
    if (acc) rowsDl.push(['Send your work permit application by (acceptance + ' + D.applyDays + ' days)', longDate(addDays(acc, D.applyDays))]);
    if (ita && acc && acc > addDays(ita, D.acceptDays)) rowsDl.push(['Check', 'This acceptance date is after the ' + D.acceptDays + '-day limit']);
    dl = `<h3>Your deadlines</h3><div class="table-scroll"><table><tbody>${rowsDl.map(([a, b]) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`).join('')}</tbody></table></div>`;
  }
  $('#iec-out').innerHTML = `<div class="total"><span><span class="of">${esc(rows[0]?.country || '')}, ${D.season} season</span></span><span class="tag ${D.closed ? 'no' : 'yes'}">${D.closed ? 'Season closed' : 'Season open'}</span></div>${cards}${dl}<p class="small">IRCC numbers as of ${longDate(D.asOf)}.</p>`;
  for (const tr of document.querySelectorAll('#iec-table tbody tr')) tr.classList.toggle('hl', tr.dataset.c === code);
  try { localStorage.setItem(STORE, JSON.stringify({ country: code, ita, accepted: acc })); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const init = saved || { country: 'fr', ita: '', accepted: '' };
for (const [k, v] of Object.entries(init)) if (form.elements[k] && v !== undefined) form.elements[k].value = v;
if (!form.elements.country.value) form.elements.country.selectedIndex = 0;
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
