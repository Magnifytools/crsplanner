// AAIP Worker Expression of Interest points (max 100).
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('aaip-rules').textContent);
const form = $('#aaip-form');
const STORE = 'crsplanner.aaip.v1';
const pts = (id) => { const f = R.factors.find((x) => x.id === id); return f.options[Number(form.elements[id].value)][1]; };
function update() {
  const e = pts('english'), fr = pts('french');
  const eLvl = Number(form.elements.english.value), fLvl = Number(form.elements.french.value);
  const bil = eLvl <= 2 && fLvl <= 2 ? R.bilingual.points : 0; // level 4 or higher in both
  const parts = [
    ['Education', pts('education') + pts('eduLocation'), 22],
    ['Language', Math.max(e, fr) + bil, 13],
    ['Work experience', pts('workTotal') + pts('workCanada'), 21],
    ['Age', pts('age'), 5],
    ['Family in Alberta', pts('family'), 8],
    ['Alberta job offer', pts('offer') + pts('offerSpecial'), 16],
    ['Job offer location', pts('location'), 5],
    ['Regulated occupation', pts('regulated'), 10],
  ];
  $('#total').textContent = parts.reduce((t, [, v]) => t + v, 0);
  $('#breakdown').innerHTML = parts.map(([l, v, m]) => `<tr><td>${l}</td><td class="n">${v} <span class="small">/ ${m}</span></td></tr>`).join('');
  $('#lang-warn').hidden = eLvl <= 2 || fLvl <= 2;
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries([...new FormData(form)]))); } catch (err) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (err) { saved = null; }
if (!saved) for (const f of R.factors) form.elements[f.id].value = f.options.length - 1;
if (saved) for (const [k, v] of Object.entries(saved)) if (form.elements[k]) form.elements[k].value = v;
if (!saved) { form.elements.age.value = 1; form.elements.english.value = 0; }
form.addEventListener('change', update);
form.addEventListener('submit', (ev) => ev.preventDefault());
update();
