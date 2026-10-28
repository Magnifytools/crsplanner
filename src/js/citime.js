// Citizenship processing time (/citizenship-processing-time/): IRCC's estimate for the month an application was received.
const $ = (s) => document.querySelector(s);
const D = JSON.parse(document.getElementById('ct-data').textContent);
const form = $('#ct-form');
const out = $('#ct-out');
const STORE = 'crsplanner.citime.v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => Number(n).toLocaleString('en-CA');
const LABEL = { grant: 'Citizenship grant', proof: 'Citizenship certificate' };
// "4 months left" or "About 1 month left" -> 4 / 1
const left = (s) => { const m = String(s).match(/(\d+) months? left/i); return m ? Number(m[1]) : null; };
function around(n) { const d = new Date(Date.UTC(Number(D.updated.slice(0, 4)), Number(D.updated.slice(5, 7)) - 1 + n, 1)); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }

function months() {
  const sel = form.elements.month;
  const keep = sel.value;
  const p = D[form.elements.kind.value];
  sel.innerHTML = `<option value="">Not applied yet (received today)</option>${p.months.map(([m]) => `<option value="${m}">${monthName(m)}</option>`).join('')}`;
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}
function render() {
  const kind = form.elements.kind.value, p = D[kind], m = form.elements.month.value;
  const row = m && p.months.find((r) => r[0] === m);
  let big, note, extra = '';
  if (row) {
    big = row[1];
    const n = left(big);
    if (/more time/i.test(big)) note = `IRCC's answer for an application received in ${monthName(m)}: it has passed IRCC's estimate. IRCC asks you to contact it if the normal processing time has passed and you can't check your status online.`;
    else note = `Time IRCC estimates is left for an application received in ${monthName(m)}, counted from its update of ${longDate(D.updated)}.${n ? ` That points to around ${around(n)}.` : ''}`;
    if (row[2]) extra = `<p>${esc(row[2])}.</p>`;
  } else {
    big = p.today;
    note = `IRCC's estimate for an application received today (updated monthly, last on ${longDate(D.updated)}).`;
    if (p.waiting) extra = `<p>About ${fmt(p.waiting)} people are waiting for a decision.</p>`;
  }
  out.innerHTML = `<p class="panel-h">${LABEL[kind]}</p><div class="total"><span class="score" style="font-size:2.4rem">${esc(big)}</span></div><p class="small">${esc(note)}</p>${extra}`;
  try { localStorage.setItem(STORE, JSON.stringify({ kind, month: m })); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved && LABEL[saved.kind]) form.elements.kind.value = saved.kind;
months();
if (saved && saved.month) { form.elements.month.value = saved.month; if (form.elements.month.value !== saved.month) form.elements.month.value = ''; }
form.elements.kind.addEventListener('change', () => { months(); render(); });
form.elements.month.addEventListener('change', render);
form.addEventListener('submit', (e) => e.preventDefault());
render();
