import { calculate, whatIf, clbForScore, SKILLS } from './crs.js';

const $ = (sel, el = document) => el.querySelector(sel);
const readJson = (id) => JSON.parse(document.getElementById(id).textContent);
const rules = readJson('crs-rules');
const lang = readJson('lang-rules');
const recent = readJson('recent-draws');
const STORE = 'crsplanner.profile.v1';
// IRCC's online calculator scores TCF Canada at NCLC 4 as 0; the published criteria give 6 per ability.
const langIrccTool = JSON.parse(JSON.stringify(lang));
for (const s of SKILLS) langIrccTool.tests.tcf[s][0] = langIrccTool.tests.tcf[s][1];

const EXAMPLE = {
  marital: 'single', spouseCitizen: 'no', spouseComing: 'yes', age: '29', education: 'master', canadianEducation: 'none',
  firstTest: 'ielts', first: { speaking: 7, listening: 8, reading: 7, writing: 7 },
  secondTest: '', second: {}, canadianWorkYears: '0', foreignWorkYears: '3', certificate: false, nomination: false, sibling: false,
  spouseEducation: 'none', spouseTest: '', spouseScores: {}, spouseCanadianWorkYears: '0',
};

const form = $('#crs-form');
const fmt = (n) => n.toLocaleString('en-CA');

function testOptions(select, language, includeNone) {
  const current = select.value;
  const opts = Object.entries(lang.tests).filter(([, t]) => !language || t.language === language);
  select.innerHTML = (includeNone ? '<option value="">No test / not applicable</option>' : '') +
    opts.map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('');
  if ([...select.options].some((o) => o.value === current)) select.value = current;
}

function scoreInputs(container, prefix, testId) {
  const t = lang.tests[testId];
  container.hidden = !t;
  if (!t) return;
  for (const s of SKILLS) {
    const input = $(`#${prefix}-${s}`);
    const max = t.maxBySkill ? t.maxBySkill[s] : t.max;
    input.min = t.min; input.max = max; input.step = t.step;
  }
}

function setForm(p) {
  const assign = () => {
    for (const [k, v] of Object.entries(p)) {
      const el = form.elements[k];
      if (!el || typeof v === 'object') continue;
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    }
  };
  assign();
  syncLanguageSelects(); // second-language options depend on the first test
  assign();
  syncLanguageSelects();
  for (const [prefix, key] of [['first', 'first'], ['second', 'second'], ['spouse', 'spouseScores']]) {
    for (const s of SKILLS) { const el = $(`#${prefix}-${s}`); if (el) el.value = p[key]?.[s] ?? ''; }
  }
}

function getForm() {
  const f = form.elements;
  const scores = (prefix) => Object.fromEntries(SKILLS.map((s) => [s, $(`#${prefix}-${s}`).value]));
  return {
    marital: f.marital.value, spouseCitizen: f.spouseCitizen.value, spouseComing: f.spouseComing.value,
    age: f.age.value, education: f.education.value, canadianEducation: f.canadianEducation.value,
    firstTest: f.firstTest.value, first: scores('first'), secondTest: f.secondTest.value, second: scores('second'),
    canadianWorkYears: f.canadianWorkYears.value, foreignWorkYears: f.foreignWorkYears.value,
    certificate: f.certificate.checked, nomination: f.nomination.checked, sibling: f.sibling.checked,
    spouseEducation: f.spouseEducation.value, spouseTest: f.spouseTest.value, spouseScores: scores('spouse'),
    spouseCanadianWorkYears: f.spouseCanadianWorkYears.value,
  };
}

function toProfile(v) {
  const partner = v.marital === 'married' || v.marital === 'commonlaw';
  const spouseCounts = partner && v.spouseCitizen === 'no' && v.spouseComing === 'yes';
  const entry = (test, scores) => (test ? { test, scores: Object.fromEntries(SKILLS.map((s) => [s, scores[s] === '' ? null : Number(scores[s])])) } : null);
  return {
    age: Number(v.age), spouseCounts, education: v.education,
    firstLanguage: entry(v.firstTest, v.first), secondLanguage: entry(v.secondTest, v.second),
    canadianWorkYears: Number(v.canadianWorkYears), foreignWorkYears: Number(v.foreignWorkYears),
    certificateOfQualification: v.certificate,
    spouse: spouseCounts ? { education: v.spouseEducation, language: entry(v.spouseTest, v.spouseScores), canadianWorkYears: Number(v.spouseCanadianWorkYears) } : null,
    sibling: v.sibling, canadianEducation: v.canadianEducation, provincialNomination: v.nomination,
  };
}

function syncLanguageSelects() {
  const first = form.elements.firstTest;
  const firstLang = lang.tests[first.value]?.language;
  testOptions(form.elements.secondTest, firstLang === 'fr' ? 'en' : 'fr', true);
  scoreInputs($('#first-scores'), 'first', first.value);
  scoreInputs($('#second-scores'), 'second', form.elements.secondTest.value);
  scoreInputs($('#spouse-scores'), 'spouse', form.elements.spouseTest.value);
  const v = getFormLite();
  const partner = v.marital === 'married' || v.marital === 'commonlaw';
  $('#partner-questions').hidden = !partner;
  $('#spouse-block').hidden = !(partner && v.spouseCitizen === 'no' && v.spouseComing === 'yes');
}
function getFormLite() { const f = form.elements; return { marital: f.marital.value, spouseCitizen: f.spouseCitizen.value, spouseComing: f.spouseComing.value }; }

function clbTags() {
  for (const [prefix, sel] of [['first', 'firstTest'], ['second', 'secondTest'], ['spouse', 'spouseTest']]) {
    const test = form.elements[sel].value;
    for (const s of SKILLS) {
      const tag = $(`#${prefix}-${s}-clb`);
      if (!tag) continue;
      const val = $(`#${prefix}-${s}`).value;
      if (!test || val === '') { tag.textContent = ''; continue; }
      const c = clbForScore(lang, test, s, val);
      const name = lang.tests[test].language === 'fr' ? 'NCLC' : 'CLB';
      tag.textContent = c >= 4 ? `${name} ${c}${c === 10 ? '+' : ''}` : `below ${name} 4`;
    }
  }
}

function render(result, profile) {
  $('#total').textContent = fmt(result.total);
  const mini = $('#total-mini'); if (mini) mini.textContent = fmt(result.total);
  const coreMax = result.spouseCounts ? 460 : 500;
  const parts = [
    ['Core / human capital', result.sections.core, coreMax],
    ...(result.spouseCounts ? [['Spouse or partner', result.sections.spouse, 40]] : []),
    ['Skill transferability', result.sections.transferability, 100],
    ['Additional points', result.sections.additional, 600],
  ];
  $('#bars').innerHTML = parts.map(([label, v, max]) => `
    <div class="bar"><span>${label}</span><span class="num">${v} / ${max}</span>
    <div class="track" aria-hidden="true"><div class="fill" style="width:${Math.min(100, (v / max) * 100)}%"></div></div></div>`).join('');

  const names = { core: 'Core / human capital', spouse: 'Spouse or partner', transferability: 'Skill transferability (max 100)', additional: 'Additional points (max 600)' };
  let rows = '';
  for (const sec of ['core', 'spouse', 'transferability', 'additional']) {
    const items = result.items.filter((i) => i.section === sec);
    if (!items.length) continue;
    rows += `<tr class="section"><td>${names[sec]}</td><td class="n">${result.sections[sec]}</td></tr>`;
    rows += items.map((i) => `<tr><td>${i.label}</td><td class="n">${i.points} <span class="small">/ ${i.max}</span></td></tr>`).join('');
  }
  $('#breakdown-body').innerHTML = rows;
  const capNotes = [];
  const t = result.transferRaw;
  if (result.items.filter((i) => i.key.startsWith('education')).reduce((s, i) => s + i.points, 0) > t.education) capNotes.push('Education combinations are capped at 50.');
  if (result.items.filter((i) => i.key.startsWith('foreignWork')).reduce((s, i) => s + i.points, 0) > t.foreignWork) capNotes.push('Foreign work combinations are capped at 50.');
  $('#cap-notes').textContent = capNotes.join(' ');

  const w = whatIf(rules, lang, profile).filter((x) => x.delta !== 0).sort((a, b) => b.delta - a.delta);
  $('#whatif').innerHTML = w.length
    ? w.map((x) => `<li><span>${x.label}</span><span class="delta ${x.delta > 0 ? 'up' : ''}">${x.delta > 0 ? '+' : ''}${x.delta} → ${x.total}</span></li>`).join('')
    : '<li><span>No single change on this list moves your score.</span></li>';

  renderComparison(result.total);
}

const niceDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function renderComparison(score) {
  const rows = recent.categories.map((c) => {
    const draws = recent.rounds.filter((r) => r.category === c.id);
    const cleared = draws.filter((r) => score >= r.crs).length;
    const crs = draws.map((r) => r.crs);
    const last = draws[0];
    const yes = cleared > 0;
    const pnp = c.id === 'pnp' ? ' Cut-offs include the 600 nomination points.' : '';
    const name = c.slug ? `<a href="/express-entry-draws/${c.slug}/">${c.label}</a>` : c.label;
    return `<div class="cmp-row"><span>${name}</span><span class="tag ${yes ? 'yes' : 'no'}">${cleared} of ${draws.length} draws</span>
      <span class="sub">Cut-offs ${Math.min(...crs)} to ${Math.max(...crs)}; latest ${last.crs} on ${niceDate(last.date)}.${pnp}</span></div>`;
  });
  $('#compare').innerHTML = rows.join('');
  renderStand(score);
}

// Where you stand: your score as a red mark on a line, with each category's latest cut-off as a tick.
const SHORT = { cec: 'CEC', fsw: 'FSW', fst: 'FST', french: 'French', health: 'Health', trades: 'Trades', stem: 'STEM', transport: 'Transport', education: 'Education', agriculture: 'Agri-food', managers: 'Managers', physicians: 'Physicians', researchers: 'Researchers', military: 'Military', general: 'All programs' };
function renderStand(score) {
  const box = $('#stand'); if (!box) return;
  const latest = recent.categories.filter((c) => c.id !== 'pnp').map((c) => { const d = recent.rounds.find((r) => r.category === c.id); return d ? { name: SHORT[c.id] || c.label, crs: d.crs, date: d.date } : null; }).filter((x) => x && x.crs >= 300);
  if (!latest.length) { box.hidden = true; return; }
  const vals = [...latest.map((x) => x.crs), score];
  const lo = Math.floor((Math.min(...vals) - 15) / 10) * 10, hi = Math.ceil((Math.max(...vals) + 15) / 10) * 10;
  const pos = (v) => `${(((v - lo) / (hi - lo)) * 100).toFixed(2)}%`;
  const sorted = [...latest].sort((a, b) => a.crs - b.crs);
  let lastPct = -100;
  const ticks = sorted.map((x) => { const p = ((x.crs - lo) / (hi - lo)) * 100; const show = p - lastPct >= 18; if (show) lastPct = p; return `<span class="stand-tick" style="left:${pos(x.crs)}" title="${x.name}: ${x.crs} (${niceDate(x.date)})">${show ? `<span>${x.name} ${x.crs}</span>` : ''}</span>`; }).join('');
  const above = latest.filter((x) => score >= x.crs).length;
  box.hidden = false;
  box.innerHTML = `<h2 class="panel-h">Where you stand</h2><div class="stand-track" role="img" aria-label="Your score ${score} against the latest cut-off of ${latest.length} round types"><span class="stand-axis"></span>${ticks}<span class="stand-you" style="left:${pos(score)}"><b>You ${score}</b></span></div><p class="stand-legend">${above ? `You are at or above the latest cut-off in ${above} of ${latest.length} round types.` : `You are below the latest cut-off in all ${latest.length} round types.`} Provincial nominee rounds are left out because their cut-offs include the 600 nomination points.</p>`;
}

function update(save = true) {
  syncLanguageSelects();
  clbTags();
  const v = getForm();
  const profile = toProfile(v);
  const result = calculate(rules, lang, profile);
  render(result, profile);
  const alt = calculate(rules, langIrccTool, profile).total;
  const note = $('#tcf-note');
  note.hidden = alt === result.total;
  if (alt !== result.total) note.textContent = `IRCC's online calculator would show ${result.total - alt} points less for this profile: it gives 0 points to TCF Canada results at NCLC 4, while the published CRS criteria give 6 per ability. This score follows the published criteria.`;
  if (save) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
}

function init() {
  testOptions(form.elements.firstTest, null, false);
  testOptions(form.elements.spouseTest, null, true);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
  const start = saved || EXAMPLE;
  form.elements.firstTest.value = start.firstTest || 'ielts';
  setForm(start);
  $('#example-note').hidden = !!saved;
  form.addEventListener('input', () => { $('#example-note').hidden = true; update(); });
  form.addEventListener('change', () => { $('#example-note').hidden = true; update(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#clear-example').addEventListener('click', () => {
    form.reset();
    for (const s of SKILLS) for (const p of ['first', 'second', 'spouse']) { const el = $(`#${p}-${s}`); if (el) el.value = ''; }
    $('#example-note').hidden = true;
    update();
  });
  update(false);
}

init();
