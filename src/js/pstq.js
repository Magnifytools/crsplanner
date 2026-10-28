// Quebec PSTQ stream check (/pstq-quebec/), from Québec.ca's requirements page (data/rules/pstq.json).
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('pstq-rules').textContent);
const form = $('#pstq-form');
const STORE = 'crsplanner.pstq.v1';
const S = R.streams;
const EDU1 = ['voc', 'dec', 'uni'];
const EDU2 = ['des', 'voc', 'dec', 'uni'];
function update() {
  const f = form.elements;
  const noc = f.noc.value.trim();
  if (/^\d{5}$/.test(noc)) f.teer.value = noc[1];
  const teer = Number(f.teer.value), reg = f.reg.value === 'yes';
  const exp = Number(f.exp.value) || 0, expq = Math.min(exp, Number(f.expq.value) || 0);
  const oral = Number(f.oral.value), written = Number(f.written.value), spouse = f.spouse.value;
  const high = teer <= 2;
  const stream = reg ? 3 : high ? 1 : 2;
  const spouseCheck = spouse === 'none' ? null : [`Accompanying spouse: spoken French level ${R.spouse} or higher`, Number(spouse) >= R.spouse, `level ${spouse}`];
  let checks;
  if (stream === 1) checks = [
    [`Main occupation in TEER 0, 1 or 2 and not regulated`, true, `TEER ${teer}`],
    [`At least ${S[1].experienceMonths} months of experience in it in the last 5 years`, exp >= S[1].experienceMonths, `${exp} months`],
    ['A diploma from a program of 1 year or more: DEP or ASP, AEC or technical DEC, or university', EDU1.includes(f.edu.value), ''],
    [`Spoken French level ${S[1].frenchOral} or higher`, oral >= S[1].frenchOral, `level ${oral}`],
    [`Written French level ${S[1].frenchWritten} or higher`, written >= S[1].frenchWritten, `level ${written}`],
  ];
  else if (stream === 2) checks = [
    ['Main occupation in TEER 3, 4 or 5 and not regulated', true, `TEER ${teer}`],
    [`At least ${S[2].experienceMonths} months of experience in it in the last 5 years`, exp >= S[2].experienceMonths, `${exp} months`],
    [`Of those, at least ${S[2].quebecMonths} months in Quebec`, expq >= S[2].quebecMonths, `${expq} months`],
    ['At least a secondary school diploma, or a DEP, ASP or AEC of 1 year or more', EDU2.includes(f.edu.value), ''],
    [`Spoken French level ${S[2].frenchOral} or higher`, oral >= S[2].frenchOral, `level ${oral}`],
  ];
  else checks = [
    ['The job you will do is on the list of regulated professions', true, ''],
    [`Spoken French level ${high ? 7 : 5} or higher`, oral >= (high ? 7 : 5), `level ${oral}`],
    ...(high ? [['Written French level 5 or higher', written >= 5, `level ${written}`]] : []),
    ['Authorization to practise, or recognition of your training, from the regulatory body', null, 'needed when you apply; after an invitation you get 1 year to obtain it'],
  ];
  if (spouseCheck) checks.push(spouseCheck);
  const ok = checks.every(([, v]) => v !== false);
  const talent = f.talent.checked;
  $('#pstq-stream').textContent = `Stream ${stream}: ${S[stream].name}`;
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Meets the minimum' : 'Not yet';
  $('#checks').innerHTML = checks.map(([l, v, n]) => `<div class="cmp-row"><span>${l}</span><span class="tag ${v === null ? '' : v ? 'yes' : 'no'}">${v === null ? 'later' : v ? 'met' : 'not met'}</span>${n ? `<span class="sub">${n}</span>` : ''}</div>`).join('');
  const t4 = talent ? (exp >= S[4].experienceMonths ? ` You may also fit Stream 4 (${S[4].name}): you have the achievement or opinion and ${exp} months of experience (${S[4].experienceMonths} needed).` : ` Stream 4 (${S[4].name}) also needs ${S[4].experienceMonths} months of experience in the last 5 years; you have ${exp}.`) : '';
  $('#pstq-note').textContent = `Quebec assigns the stream from your main occupation. Meeting the minimum lets you be invited, it does not guarantee it: each round has its own criteria and minimum score.${t4} You must also be ${R.minAge} or older.`;
  const data = Object.fromEntries([...new FormData(form)]);
  data.talent = talent;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
else { form.elements.teer.value = '1'; form.elements.exp.value = '24'; form.elements.edu.value = 'uni'; form.elements.oral.value = '7'; form.elements.written.value = '5'; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
