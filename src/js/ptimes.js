// IRCC processing times: hub (/ircc-processing-times/) and work permits (/work-permit-processing-time/).
// Data: /data/ptimes.json, copied from IRCC's own JSON files by scripts/ptimes.mjs.
const $ = (s) => document.querySelector(s);
const C = JSON.parse(document.getElementById('pt-conf').textContent);
const form = $('#pt-form');
const out = $('#pt-out');
const STORE = `crsplanner.ptimes.${C.mode}.v1`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const monthName = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => Number(n).toLocaleString('en-CA');
const shown = (s) => (/^No processing time available$/i.test(s) ? 'No time posted' : String(s).replace(/^1 (day|week|month)s$/, '1 $1'));
const COUNTRY = Object.fromEntries(C.country);
const SINGLE = Object.fromEntries(C.single.flatMap(([, l]) => l));
const FLPT = Object.fromEntries(C.groups.flatMap(([, l]) => l));
const INSIDE = { 'work-ca': ['work', 'Work permit in Canada'], 'study-ca': ['study', 'Study permit in Canada'] };
const WEEKLY = { 'WP-EXT': 'Work permit extension in Canada', 'SP-EXT': 'Study permit extension in Canada' };

// Same week numbering as IRCC's tool: weeks of the month starting on Sunday, the 5th week includes any 6th.
function weekKey(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const w = Math.min(5, Math.floor((d + first - 1) / 7) + 1);
  return `${y}/${String(m).padStart(2, '0')}/0${w}`;
}

let D = null;
function options() {
  const sel = form.elements.type;
  if (C.mode === 'hub') {
    const og = (label, items) => `<optgroup label="${esc(label)}">${items.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</optgroup>`;
    sel.innerHTML = C.groups.map(([g, l]) => og(g, l.filter(([k]) => D.flpt[k]).map(([k, t]) => [`f:${k}`, t]))).join('')
      + og('From outside Canada', C.country.map(([id, l]) => [`c:${id}`, l]))
      + og('From inside Canada', [['s:work-ca', INSIDE['work-ca'][1]], ['s:study-ca', INSIDE['study-ca'][1]], ...Object.entries(WEEKLY).filter(([k]) => D.flptWeek[k]).map(([k, l]) => [`w:${k}`, l])])
      + C.single.map(([g, l]) => og(g, l.map(([k, t]) => [`i:${k}`, t]))).join('');
  }
  const names = Object.entries(D.names).filter(([c]) => c !== 'CA' && D.country.work[c] !== undefined).sort((a, b) => a[1].localeCompare(b[1], 'en'));
  form.elements.country.innerHTML = names.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
}

function show(id, on) { const el = $(id); if (el) el.hidden = !on; }

function render() {
  const [kind, key] = form.elements.type.value.split(':');
  show('#pt-country-field', kind === 'c');
  show('#pt-month-field', kind === 'f');
  show('#pt-date-field', kind === 'w');
  let title = '', big = '', note = '', extra = '';
  if (kind === 'f') {
    const p = D.flpt[key];
    title = FLPT[key];
    const month = form.elements.month ? form.elements.month.value : '';
    const row = month && p.months.find((r) => r[0] === month);
    if (month && row) {
      big = row[1];
      note = /\d/.test(big) ? `Time IRCC estimates is left for an application received in ${monthName(month)} (IRCC data updated ${longDate(D.updated.flpt)}).` : `IRCC's answer for an application received in ${monthName(month)} (data updated ${longDate(D.updated.flpt)}).`;
      if (row[2]) extra = `<p>${esc(row[2])}.</p>`;
    } else {
      big = p.today;
      note = `IRCC's estimate for an application received today (updated monthly, last on ${longDate(D.updated.flpt)}).`;
      if (month) {
        const newest = p.months[0][0], oldest = p.months.at(-1)[0];
        extra = `<p class="small">${month > newest ? `IRCC has no estimate yet for applications received in ${monthName(month)}; its latest month is ${monthName(newest)}.` : `We keep IRCC's figures from ${monthName(oldest)} onwards; for an older application, check IRCC's tool.`}</p>`;
      }
      if (p.waiting) extra += `<p>About ${fmt(p.waiting)} people are waiting for a decision.</p>`;
    }
  } else if (kind === 'c') {
    const c = form.elements.country.value;
    title = `${COUNTRY[key]} from ${D.names[c]}`;
    big = shown(D.country[key][c] || '');
    note = /\d/.test(big) ? `How long IRCC took to process most complete applications in the past (updated weekly, last on ${longDate(D.updated.country)}).` : `IRCC shows no processing time for this country (data updated ${longDate(D.updated.country)}).`;
  } else if (kind === 's') {
    const [id, l] = INSIDE[key];
    title = l;
    big = D.country[id].CA;
    note = `How long IRCC took to process most complete applications in the past (updated weekly, last on ${longDate(D.updated.country)}). It does not include the time to give your biometrics.`;
  } else if (kind === 'w') {
    const p = D.flptWeek[key];
    title = WEEKLY[key];
    const date = form.elements.date.value;
    const row = date && p.weeks.find((r) => r[0] === weekKey(date));
    if (date && row) {
      big = row[1];
      note = `Time IRCC estimates is left for an application received in the week of ${longDate(date)} (IRCC data updated ${longDate(D.updated.flptWeek)}).`;
      if (row[2]) extra = `<p>${esc(row[2])}.</p>`;
    } else {
      big = p.today;
      note = `IRCC's estimate for an application received today (updated weekly, last on ${longDate(D.updated.flptWeek)}).`;
      if (date) extra = `<p class="small">${weekKey(date) > p.weeks[0][0] ? 'IRCC has no figure yet for applications received that week.' : 'IRCC\'s files have no figure for that week number, so IRCC\'s own tool, which numbers the weeks the same way, shows none either.'}</p>`;
      if (p.waiting) extra += `<p>About ${fmt(p.waiting)} people are waiting for a decision.</p>`;
    }
  } else if (kind === 'i') {
    title = SINGLE[key] || (key === 'sawp_current' ? 'Seasonal Agricultural Worker Program' : 'International Experience Canada, current season');
    big = D.single[key];
    note = key === 'eta' ? `IRCC commits to processing most complete applications within this time (updated weekly, last on ${longDate(D.updated.weekly)}).` : `IRCC's published time (updated weekly, last on ${longDate(D.updated.weekly)}).`;
  }
  out.innerHTML = `<p class="panel-h">${esc(title)}</p><div class="total"><span class="score" style="font-size:2.4rem">${esc(big)}</span></div><p class="small">${esc(note)}</p>${extra}`;
  const data = Object.fromEntries([...new FormData(form)]);
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

fetch('/data/ptimes.json').then((r) => r.json()).then((d) => {
  D = d;
  options();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
  if (saved) for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (el && [...(el.options || [{ value: v }])].some((o) => o.value === v)) el.value = v; }
  else { form.elements.type.value = C.mode === 'hub' ? 'f:cec' : 'c:work'; form.elements.country.value = 'IN'; }
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  render();
}).catch(() => { out.innerHTML = '<p>IRCC\'s data could not be loaded. The tables below have the same figures.</p>'; });
