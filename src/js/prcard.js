// PR card processing time: expected decision date, delivery window and renewal date.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('pc-data').textContent);
const form = $('#pt-form');
const out = $('#pt-out');
const STORE = 'crsplanner.prcard.v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 864e5;
const toDay = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);
const toIso = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const todayIso = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10); };
// Subtract whole months; if the day does not exist in the target month, use its last day.
function minusMonths(iso, m) {
  const [y, mo, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1 - m, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return toIso(toDay(`${t.toISOString().slice(0, 8)}${String(Math.min(d, last)).padStart(2, '0')}`));
}

function render() {
  const kind = form.elements.kind.value;
  const time = R[kind];
  const days = Number((time.match(/^(\d+) days?$/) || [])[1]);
  const date = form.elements.date.value;
  let html = `<p class="panel-h">${kind === 'new_pr' ? 'First PR card' : 'Renewing or replacing a PR card'}</p><div class="total"><span class="score" style="font-size:2.4rem">${time}</span></div><p class="small">IRCC's current processing time (updated weekly, last on ${longDate(R.updated)}).</p>`;
  if (date && days) {
    const decision = toIso(toDay(date) + days);
    const arrive = toIso(toDay(date) + days + 7 * R.extraWeeks);
    html += `<div class="table-scroll"><table><tbody>
      <tr><td>IRCC received your application</td><td class="n">${longDate(date)}</td></tr>
      <tr><td>Decision, at the current processing time (+${days} days)</td><td class="n">${longDate(decision)}</td></tr>
      <tr><td>Card should reach you by (processing time + up to ${R.extraWeeks} weeks)</td><td class="n">${longDate(arrive)}</td></tr>
    </tbody></table></div>
    <p class="small">These dates use today's processing time. Yours can be shorter or longer.</p>`;
  } else if (date) html += '<p class="small">IRCC is not showing a time in days right now, so we can\'t work out a date.</p>';
  const exp = form.elements.exp.value;
  if (kind === 'existing_pr' && exp) {
    const from = toIso(toDay(minusMonths(exp, R.renewMonths)) + 1);
    const today = todayIso();
    html += `<p><strong>Renewal:</strong> ${exp < today ? `your card expired on ${longDate(exp)}, so you can renew it now.` : from <= today ? `your card expires on ${longDate(exp)}, in less than ${R.renewMonths} months, so you can renew it now.` : `your card expires on ${longDate(exp)}. You can apply to renew it from ${longDate(from)}, when less than ${R.renewMonths} months are left.`}</p>`;
  }
  $('#pc-exp-field').hidden = kind !== 'existing_pr';
  out.innerHTML = html;
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...new FormData(form)]))); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [k, v] of Object.entries(saved)) { if (form.elements[k]) form.elements[k].value = v; }
else form.elements.date.value = todayIso();
form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('submit', (e) => e.preventDefault());
render();
