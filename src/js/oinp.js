// OINP Ontario Workforce Priority stream: expression of interest points.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('oinp-rules').textContent);
const form = $('#oinp-form');
const STORE = 'crsplanner.oinp.v1';
const TEER_IDX = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 };
const BROAD_IDX = { 3: 0, 7: 1, 2: 2, 0: 3, 1: 3, 4: 3, 8: 3, 9: 3, 5: 4, 6: 4 };

function fromNoc() {
  const noc = form.elements.noc.value.trim();
  const hint = $('#noc-hint');
  if (!/^\d{5}$/.test(noc)) { hint.textContent = noc ? 'Enter the 5-digit NOC 2021 code.' : ''; return; }
  form.elements.teer.value = TEER_IDX[noc[1]];
  form.elements.broad.value = BROAD_IDX[noc[0]];
  hint.textContent = `Broad category ${noc[0]}, TEER ${noc[1]}: set below.`;
}

// Self-employed physicians have their own Ontario work experience scale.
const optsFor = (f, physician) => (physician && f.physicianOptions ? f.physicianOptions : f.options);
let shownPhysician = false;
function syncOptions(physician) {
  if (physician === shownPhysician) return;
  shownPhysician = physician;
  for (const f of R.factors.filter((x) => x.physicianOptions)) {
    const sel = form.elements[f.id];
    const opts = optsFor(f, physician);
    sel.innerHTML = opts.map(([l, p], i) => `<option value="${i}">${l} (${p})</option>`).join('');
    sel.value = opts.length - 1;
  }
}

function update() {
  const physician = form.elements.physician.checked;
  syncOptions(physician);
  let total = 0;
  const rows = R.factors.map((f) => {
    const opts = optsFor(f, physician);
    const i = Math.min(Number(form.elements[f.id].value), opts.length - 1);
    let pts = opts[i][1];
    let label = opts[i][0];
    if (physician && f.physicianNA) { pts = 0; label = 'Not applicable to self-employed physicians'; }
    total += pts;
    return `<tr><td>${f.label}<div class="small">${label}</div></td><td class="n">${pts}</td></tr>`;
  });
  $('#total').textContent = total;
  $('#breakdown').innerHTML = rows.join('');
  const data = Object.fromEntries([...new FormData(form)]);
  data.physician = physician;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (!saved) for (const f of R.factors) form.elements[f.id].value = f.options.length - 1; // start from the lowest option of each factor
if (saved) { syncOptions(!!saved.physician); for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } }
form.elements.noc.addEventListener('input', () => { fromNoc(); update(); });
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
