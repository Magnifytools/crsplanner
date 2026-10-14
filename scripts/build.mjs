// Static site build: node scripts/build.mjs  ->  dist/
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = { name: 'CRS Planner', url: 'https://crsplanner.com', checked: '2026-10-14' };
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const crs = read('data/rules/crs.json');
const lang = read('data/rules/language-tests.json');
const draws = read('data/draws.json');
const changelog = read('data/changelog.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-CA'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const jsonScript = (id, obj) => `<script type="application/json" id="${id}">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const NAV = [['/', 'CRS calculator'], ['/clb-converter/', 'CLB converter'], ['/express-entry-draws/', 'Express Entry draws']];

function page({ path, title, description, body, scripts = '', jsonld = [], crumbs = null }) {
  const url = SITE.url + path;
  const ld = [...jsonld];
  if (crumbs) {
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE.url + p })) });
  }
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const crumbHtml = crumbs ? `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.map(([n, p], i) => (i < crumbs.length - 1 ? `<a href="${p}">${esc(n)}</a> / ` : esc(n))).join('')}</nav>` : '';
  return `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${SITE.name}">
<meta name="theme-color" content="#111827">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<header class="site-head"><div class="wrap"><a class="mark" href="/"><b>CRS</b> Planner</a><nav class="nav" aria-label="Main">${nav}</nav></div></header>
<main class="wrap">${crumbHtml}
${body}
</main>
<footer class="site-foot"><div class="wrap">
<p>CRS Planner is an independent site. It is not affiliated with Immigration, Refugees and Citizenship Canada (IRCC) or the Government of Canada, and it is not immigration or legal advice. Rules last checked ${longDate(SITE.checked)}.</p>
<nav aria-label="Site"><a href="/about/">About and method</a><a href="/changelog/">Changelog</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
</div></footer>
${scripts}
</body>
</html>`;
}

// ---------- Shared bits ----------
const EDU_LABELS = {
  none: 'Less than secondary school (high school)',
  secondary: 'Secondary diploma (high school graduation)',
  oneYear: 'One-year program at a university, college, trade or technical school',
  twoYear: 'Two-year program at a university, college, trade or technical school',
  bachelor: "Bachelor's degree, or a program of three years or more",
  twoOrMore: 'Two or more credentials, one of them for a program of three years or more',
  master: "Master's degree, or a professional degree needed to practise a licensed profession",
  phd: 'Doctoral degree (PhD)',
};
const eduOptions = Object.entries(EDU_LABELS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
const years = (max, plusLabel) => Array.from({ length: max + 1 }, (_, i) => `<option value="${i}">${i === 0 ? 'None or less than a year' : i === max ? plusLabel : `${i} year${i > 1 ? 's' : ''}`}</option>`).join('');
const ageOptions = Array.from({ length: 29 }, (_, i) => 17 + i).map((a) => `<option value="${a}">${a === 17 ? '17 or younger' : a === 45 ? '45 or older' : a}</option>`).join('');
const scoreFields = (prefix) => `<div class="scores">${['speaking', 'listening', 'reading', 'writing'].map((s) => `
  <div class="field"><label for="${prefix}-${s}">${s[0].toUpperCase() + s.slice(1)}</label><input type="number" inputmode="decimal" id="${prefix}-${s}" name="${prefix}-${s}"><span class="clb-tag" id="${prefix}-${s}-clb" aria-live="polite"></span></div>`).join('')}</div>`;

// Recent draws (last 12 months) for the score comparison
const latestDate = draws.latestRound.date;
const yearAgo = `${Number(latestDate.slice(0, 4)) - 1}${latestDate.slice(4)}`;
const recentRounds = draws.rounds.filter((r) => r.date > yearAgo && r.crs !== null).map(({ date, category, crs: c, name }) => ({ date, category, crs: c, name }));
const recentCats = draws.categories.filter((c) => recentRounds.some((r) => r.category === c.id))
  .map((c) => ({ ...c, last: recentRounds.find((r) => r.category === c.id).date }))
  .sort((a, b) => (a.last < b.last ? 1 : -1));

// ---------- Points tables (generated from the rules file) ----------
function ageTable() {
  const rows = Object.entries(crs.core.age.byAge).map(([a, [w, s]]) => `<tr><td>${a === '17' ? '17 or younger' : a === '45' ? '45 or older' : a}</td><td class="n">${s}</td><td class="n">${w}</td></tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr><th>Age</th><th class="n">Single</th><th class="n">With partner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function eduTable() {
  const rows = Object.entries(crs.core.education.levels).map(([k, [w, s]]) => `<tr><td>${esc(EDU_LABELS[k])}</td><td class="n">${s}</td><td class="n">${w}</td></tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr><th>Level of education</th><th class="n">Single</th><th class="n">With partner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function langTable() {
  const t = crs.core.firstLanguage.perAbilityByClb;
  const label = (r, i) => (i === 0 ? 'CLB 10 or more' : r.minClb === 4 ? 'CLB 4 or 5' : r.minClb === 0 ? 'Below CLB 4' : `CLB ${r.minClb}`);
  const rows = t.map((r, i) => `<tr><td>${label(r, i)}</td><td class="n">${r.points[1]}</td><td class="n">${r.points[0]}</td></tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr><th>First official language, per ability</th><th class="n">Single</th><th class="n">With partner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function cwTable() {
  const rows = Object.entries(crs.core.canadianWork.byYears).map(([y, [w, s]]) => `<tr><td>${y === '0' ? 'None or less than a year' : y === '5' ? '5 years or more' : `${y} year${y === '1' ? '' : 's'}`}</td><td class="n">${s}</td><td class="n">${w}</td></tr>`).join('');
  return `<div class="table-scroll"><table><thead><tr><th>Canadian work experience</th><th class="n">Single</th><th class="n">With partner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------- Calculator (home) ----------
function home() {
  const body = `
<section class="intro">
  <h1>CRS Calculator for Express Entry (2026)</h1>
  <p class="lede">Work out your Comprehensive Ranking System score, see where every point comes from, and compare it with the cut-offs of the last 12 months of Express Entry draws, category by category.</p>
  <p class="meta"><span>Rules checked ${longDate(SITE.checked)}</span><span>Source: <a href="${crs.source}" rel="noopener">IRCC CRS criteria</a>, modified ${longDate(crs.sourceModified)}</span><span>Draw data to ${longDate(latestDate)}</span></p>
</section>

<div class="tool">
<form id="crs-form" novalidate>
  <p class="example-note" id="example-note"><span>Showing an example profile. Change any answer to get your own score.</span><button type="button" id="clear-example">Start from blank</button></p>

  <fieldset><legend>You and your partner</legend>
    <div class="field"><label for="marital">Marital status</label>
      <select id="marital" name="marital"><option value="single">Never married or single</option><option value="married">Married</option><option value="commonlaw">Common-law</option><option value="separated">Divorced, separated, widowed or annulled marriage</option></select></div>
    <div id="partner-questions" hidden>
      <div class="row">
        <div class="field"><label for="spouseCitizen">Is your partner a Canadian citizen or permanent resident?</label><select id="spouseCitizen" name="spouseCitizen"><option value="no">No</option><option value="yes">Yes</option></select></div>
        <div class="field"><label for="spouseComing">Will your partner come with you to Canada?</label><select id="spouseComing" name="spouseComing"><option value="yes">Yes</option><option value="no">No</option></select></div>
      </div>
      <p class="hint">If your partner is a citizen or permanent resident, or is not coming, you are scored as a single applicant.</p>
    </div>
    <div class="field"><label for="age">Your age on the day you would be invited</label><select id="age" name="age">${ageOptions}</select></div>
  </fieldset>

  <fieldset><legend>Education</legend>
    <div class="field"><label for="education">Highest level of education</label><select id="education" name="education">${eduOptions}</select>
      <span class="hint">A credential from outside Canada needs an Educational Credential Assessment (ECA).</span></div>
    <div class="field"><label for="canadianEducation">Post-secondary studies completed in Canada</label>
      <select id="canadianEducation" name="canadianEducation"><option value="none">None</option><option value="oneOrTwoYears">A credential of one or two years</option><option value="threePlusYears">A credential of three years or more</option></select></div>
  </fieldset>

  <fieldset><legend>Official languages</legend>
    <div class="field"><label for="firstTest">First official language test</label><select id="firstTest" name="firstTest"></select>
      <span class="hint">Results must be less than two years old. IELTS counts only the General Training option.</span></div>
    <div id="first-scores">${scoreFields('first')}</div>
    <div class="field" style="margin-top:14px"><label for="secondTest">Second official language test (optional)</label><select id="secondTest" name="secondTest"></select></div>
    <div id="second-scores" hidden>${scoreFields('second')}</div>
  </fieldset>

  <fieldset><legend>Work experience</legend>
    <div class="row">
      <div class="field"><label for="canadianWorkYears">Skilled work in Canada (last 10 years)</label><select id="canadianWorkYears" name="canadianWorkYears">${years(5, '5 years or more')}</select></div>
      <div class="field"><label for="foreignWorkYears">Skilled work outside Canada (last 10 years)</label><select id="foreignWorkYears" name="foreignWorkYears">${years(3, '3 years or more')}</select></div>
    </div>
    <span class="hint">Skilled means TEER 0, 1, 2 or 3 of the National Occupational Classification, full time or the part-time equivalent.</span>
  </fieldset>

  <fieldset><legend>Other factors</legend>
    <div class="field check"><input type="checkbox" id="certificate" name="certificate"><label for="certificate">I have a certificate of qualification in a trade from a Canadian province or territory</label></div>
    <div class="field check"><input type="checkbox" id="sibling" name="sibling"><label for="sibling">I or my partner have a brother or sister in Canada who is 18 or older and a citizen or permanent resident</label></div>
    <div class="field check"><input type="checkbox" id="nomination" name="nomination"><label for="nomination">I have a nomination from a province or territory</label></div>
    <p class="hint">Job offers no longer give CRS points since March 25, 2025.</p>
  </fieldset>

  <fieldset id="spouse-block" hidden><legend>Your partner</legend>
    <div class="field"><label for="spouseEducation">Partner's highest level of education</label><select id="spouseEducation" name="spouseEducation">${eduOptions}</select></div>
    <div class="field"><label for="spouseTest">Partner's language test</label><select id="spouseTest" name="spouseTest"></select></div>
    <div id="spouse-scores" hidden>${scoreFields('spouse')}</div>
    <div class="field" style="margin-top:14px"><label for="spouseCanadianWorkYears">Partner's skilled work in Canada</label><select id="spouseCanadianWorkYears" name="spouseCanadianWorkYears">${years(5, '5 years or more')}</select></div>
  </fieldset>
</form>

<aside class="results" id="results" aria-label="Your CRS score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ 1,200</span></span><span class="small">Estimated CRS score</span></div>
  <div class="bars" id="bars"></div>
  <details class="breakdown"><summary>Every point, line by line</summary>
    <div class="table-scroll"><table><tbody id="breakdown-body"></tbody></table></div><p class="small" id="cap-notes"></p></details>
  <div><h2 class="panel-h">Against the last 12 months of draws</h2><div class="cmp" id="compare"></div>
    <p class="small">Each draw only invites candidates eligible for its program or category. Clearing a cut-off does not mean you would have been invited.</p></div>
  <div><h2 class="panel-h">How your score could change</h2><ul class="whatif" id="whatif"></ul></div>
</aside>
</div>
<a class="scorebar" href="#results"><span>Your CRS score</span><span class="score" id="total-mini">0</span><span>See breakdown</span></a>

<article class="prose">
<h2>How the CRS score is built</h2>
<p>Express Entry ranks every profile in the pool on a scale of 0 to 1,200. The score has four parts: core human capital (age, education, languages and Canadian work experience), your partner's factors if they come with you, skill transferability, and additional points such as a provincial nomination.</p>
<p>Couples split their points. If your partner comes with you and is not a Canadian citizen or permanent resident, your core maximum drops from 500 to 460 and up to 40 points come from your partner instead. Skill transferability is capped at 100 points and additional points at 600.</p>
<p class="callout">Job offers stopped adding CRS points on March 25, 2025. A job offer can still matter for eligibility in some programs.</p>

<h3>Age</h3>${ageTable()}
<h3>Level of education</h3>${eduTable()}
<h3>First official language</h3>
<p>Points are given for each of the four abilities (speaking, listening, reading and writing), based on your Canadian Language Benchmark (CLB) level. Use the <a href="/clb-converter/">CLB converter</a> to turn IELTS, CELPIP, PTE Core, TEF or TCF results into CLB levels.</p>
${langTable()}
<h3>Canadian work experience</h3>${cwTable()}

<h3>Skill transferability</h3>
<p>These points reward combinations. Education and foreign work experience each earn up to 50 points when paired with strong language results (CLB 7 or higher, with the top rate from CLB 9 in all four abilities) or with Canadian work experience. A trade certificate of qualification adds up to 50 with CLB 5 or higher. The total for this part never goes above 100.</p>

<h3>Additional points</h3>
<div class="table-scroll"><table><thead><tr><th>Factor</th><th class="n">Points</th></tr></thead><tbody>
<tr><td>Provincial or territorial nomination</td><td class="n">${crs.additional.provincialNomination}</td></tr>
<tr><td>French at NCLC 7 or higher in all four abilities, and CLB 5 or higher in all four English abilities</td><td class="n">${crs.additional.french.withEnglishClb5}</td></tr>
<tr><td>French at NCLC 7 or higher in all four abilities, with English at CLB 4 or lower or no English test</td><td class="n">${crs.additional.french.withWeakOrNoEnglish}</td></tr>
<tr><td>Post-secondary credential from Canada, three years or longer</td><td class="n">${crs.additional.canadianEducation.threePlusYears}</td></tr>
<tr><td>Post-secondary credential from Canada, one or two years</td><td class="n">${crs.additional.canadianEducation.oneOrTwoYears}</td></tr>
<tr><td>Brother or sister in Canada (citizen or permanent resident, 18 or older)</td><td class="n">${crs.additional.sibling}</td></tr>
</tbody></table></div>

<h2>Questions</h2>
<h3>Is this the official calculator?</h3>
<p>No. IRCC publishes its own tool. CRS Planner uses the same published rules and we test it against IRCC's calculator with sample profiles; the score in your Express Entry profile is the one that counts.</p>
<h3>How often are the rules checked?</h3>
<p>Every week, and on the day IRCC announces a change. Each change is listed in the <a href="/changelog/">changelog</a> with its date.</p>
<h3>Do you store my answers?</h3>
<p>Your answers stay in your browser so the form is filled in when you come back. Nothing is sent to us. See the <a href="/privacy/">privacy page</a>.</p>

<h2>Sources</h2>
<ul>
<li><a href="${crs.source}" rel="noopener">Comprehensive Ranking System (CRS) criteria</a>, IRCC, modified ${longDate(crs.sourceModified)}</li>
<li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC</li>
<li><a href="${draws.page}" rel="noopener">Express Entry rounds of invitations</a>, IRCC</li>
</ul>
</article>`;
  const scripts = `${jsonScript('crs-rules', crs)}${jsonScript('lang-rules', lang)}${jsonScript('recent-draws', { categories: recentCats, rounds: recentRounds })}<script type="module" src="/js/calculator.js"></script>`;
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'CRS Calculator', url: SITE.url + '/',
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' }, dateModified: SITE.checked,
    description: 'Comprehensive Ranking System score calculator for Express Entry with a full breakdown and a comparison with recent draws.',
  }];
  return page({ path: '/', title: 'CRS Calculator 2026: Express Entry Score with Full Breakdown', description: 'Free CRS calculator for Express Entry. See every point of your score, what would raise it, and how it compares with each draw category in the last 12 months.', body, scripts, jsonld });
}

// ---------- CLB converter ----------
function clbPage() {
  const tests = Object.entries(lang.tests);
  const tables = tests.map(([id, t]) => {
    const nm = t.language === 'fr' ? 'NCLC' : 'CLB';
    const fmtRange = (arr, i, s) => {
      const lo = arr[i];
      const next = arr[i + 1];
      const hiMax = t.maxBySkill ? t.maxBySkill[s] : t.max;
      if (next === undefined) return lo === hiMax ? `${lo}` : `${lo} to ${hiMax}`;
      const hi = Math.round((next - t.step) * 10) / 10;
      return hi <= lo ? `${lo}` : `${lo} to ${hi}`;
    };
    const rows = [...lang.levels].map((lvl, i) => ({ lvl, i })).reverse().map(({ lvl, i }) =>
      `<tr><td>${nm} ${lvl}${lvl === 10 ? '+' : ''}</td>${['speaking', 'listening', 'reading', 'writing'].map((s) => `<td class="n">${fmtRange(t[s], i, s)}</td>`).join('')}</tr>`).join('');
    return `<h3 id="${id}">${esc(t.name)} to ${nm}</h3><div class="table-scroll"><table><thead><tr><th>Level</th><th class="n">Speaking</th><th class="n">Listening</th><th class="n">Reading</th><th class="n">Writing</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('');
  const body = `
<section class="intro">
  <h1>CLB Converter: IELTS, CELPIP, PTE Core, TEF and TCF</h1>
  <p class="lede">Turn your test results into Canadian Language Benchmark (CLB) or NCLC levels for Express Entry, ability by ability, and check them against each program's minimum.</p>
  <p class="meta"><span>Equivalences checked ${longDate(SITE.checked)}</span><span>Source: <a href="${lang.source}" rel="noopener">IRCC language test results</a></span></p>
</section>
<div class="tool">
<form id="clb-form" novalidate>
  <fieldset><legend>Your test</legend>
    <div class="field"><label for="test">Test</label><select id="test" name="test">${tests.map(([id, t]) => `<option value="${id}">${esc(t.name)}</option>`).join('')}</select>
    <span class="hint">IELTS One Skill Retake is not accepted for Express Entry.</span></div>
    <div class="scores">${['speaking', 'listening', 'reading', 'writing'].map((s) => `<div class="field"><label for="${s}">${s[0].toUpperCase() + s.slice(1)}</label><input type="number" inputmode="decimal" id="${s}" name="${s}"></div>`).join('')}</div>
  </fieldset>
</form>
<aside class="results" aria-label="Your CLB levels">
  <div class="cards">${['speaking', 'listening', 'reading', 'writing'].map((s) => `<div class="card"><div class="k">${s[0].toUpperCase() + s.slice(1)}</div><div class="v" id="out-${s}">–</div></div>`).join('')}</div>
  <div><h2 class="panel-h">Lowest level across the four</h2><p class="score" id="out-min" style="font-size:1.4rem;margin:0"></p></div>
  <div class="cmp" id="out-checks"></div>
  <p class="small">See what these levels are worth in points with the <a href="/">CRS calculator</a>.</p>
</aside>
</div>
<article class="prose">
<h2>Equivalence tables</h2>
<p>Each table shows the score range that gives each level. A result below the lowest row is under CLB or NCLC 4.</p>
${tables}
<h2>Sources</h2>
<ul><li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC</li></ul>
</article>`;
  const scripts = `${jsonScript('lang-rules', lang)}<script type="module" src="/js/clb.js"></script>`;
  return page({ path: '/clb-converter/', title: 'CLB Converter: IELTS, CELPIP, PTE Core, TEF, TCF to CLB (2026)', description: 'Convert IELTS General, CELPIP, PTE Core, TEF Canada and TCF Canada scores to CLB and NCLC levels, with the official equivalence tables and program minimums.', body, scripts, crumbs: [['Home', '/'], ['CLB converter', '/clb-converter/']] });
}

// ---------- Draws ----------
function drawsPage() {
  const L = draws.latestRound;
  const catLabel = Object.fromEntries(draws.categories.map((c) => [c.id, c.label]));
  const counts = Object.fromEntries(draws.categories.map((c) => [c.id, draws.rounds.filter((r) => r.category === c.id).length]));
  const chipsHtml = `<button type="button" data-cat="all" aria-pressed="true">All (${draws.rounds.length})</button>` +
    draws.categories.map((c) => `<button type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.label)} (${counts[c.id]})</button>`).join('');
  const rows = draws.rounds.map((r) => `<tr data-cat="${r.category}"><td>${r.date}</td><td class="n">${esc(r.n)}</td><td>${esc(r.name)}</td><td class="n">${fmt(r.size)}</td><td class="n">${fmt(r.crs)}</td></tr>`).join('');
  const main = draws.distribution.buckets.filter((b) => !b.sub);
  const maxB = Math.max(...main.map((b) => b.count));
  const distRows = draws.distribution.buckets.map((b) => `<tr${b.sub ? '' : ' class="section"'}><td>${b.sub ? '&nbsp;&nbsp;' : ''}${b.range}</td><td class="n">${fmt(b.count)}</td><td class="n">${((b.count / draws.distribution.total) * 100).toFixed(1)}%</td></tr>`).join('');
  const W = 760, rowH = 30, H = main.length * rowH + 10;
  const bars = main.map((b, i) => `<text x="0" y="${i * rowH + 19}">${b.range}</text><rect class="bar-r" x="80" y="${i * rowH + 6}" height="18" width="${((b.count / maxB) * 560).toFixed(1)}" rx="3"/><text x="${(86 + (b.count / maxB) * 560).toFixed(1)}" y="${i * rowH + 19}">${fmt(b.count)}</text>`).join('');
  const chartFrom = `${Number(latestDate.slice(0, 4)) - 3}${latestDate.slice(4)}`;
  const year = latestDate.slice(0, 4);
  const thisYear = draws.rounds.filter((r) => r.date.startsWith(year));
  const body = `
<section class="intro">
  <h1>Express Entry Draws: Every Round Since 2015</h1>
  <p class="lede">All ${fmt(draws.rounds.length)} rounds of invitations with their cut-off scores and invitations, filterable by program and category, plus the current score distribution of the pool.</p>
  <p class="meta"><span>Updated daily from IRCC data</span><span>Latest round: #${esc(L.n)} on ${longDate(L.date)}</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>

<div class="cards">
  <div class="card"><div class="k">Latest round</div><div class="v">#${esc(L.n)}</div><div class="small">${longDate(L.date)}</div></div>
  <div class="card"><div class="k">Type</div><div style="font-weight:600">${esc(L.name)}</div></div>
  <div class="card"><div class="k">Invitations</div><div class="v">${fmt(L.size)}</div></div>
  <div class="card"><div class="k">Lowest score invited</div><div class="v">${fmt(L.crs)}</div></div>
</div>
<p class="small">${fmt(thisYear.length)} rounds so far in ${year}, with ${fmt(thisYear.reduce((s, r) => s + (r.size || 0), 0))} invitations in total.</p>

<h2>Cut-off scores, last three years</h2>
<div class="chips" id="chips" role="group" aria-label="Filter by program or category">${chipsHtml}</div>
<svg class="chart" id="cutoff-chart" viewBox="0 0 760 260" role="img" aria-label="Cut-off score of each draw over time"></svg>
<p class="small" id="chart-summary" aria-live="polite"></p>

<h2>All rounds</h2>
<div class="table-scroll"><table id="draws-table"><thead><tr><th>Date</th><th class="n">Round</th><th>Program or category</th><th class="n">Invitations</th><th class="n">Lowest score</th></tr></thead><tbody>${rows}</tbody></table></div>

<h2>Score distribution of the pool</h2>
<p>${fmt(draws.distribution.total)} profiles were in the pool on ${esc(draws.distribution.asOf)}.</p>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Number of profiles by CRS score range">${bars}</svg>
<div class="table-scroll"><table><thead><tr><th>CRS score range</th><th class="n">Profiles</th><th class="n">Share</th></tr></thead><tbody>${distRows}</tbody></table></div>

<article class="prose">
<h2>How to read the draws</h2>
<p>IRCC holds general rounds, program rounds (for example Canadian Experience Class or Provincial Nominee Program) and category rounds for occupations or French ability. A round only invites candidates eligible for it, so each type has its own cut-off. Provincial Nominee Program cut-offs are high because a nomination adds 600 points.</p>
<p>When several candidates share the lowest score, IRCC uses the tie-breaking rule: the profile submitted first is invited first. Compare your own score with each category on the <a href="/">CRS calculator</a>.</p>
<h2>About this data</h2>
<p>We read IRCC's published data every day, keep a dated copy and rebuild this page when a new round appears. Program and category names are IRCC's own; we group their yearly versions so trends can be compared.</p>
</article>`;
  const chartData = { chartFrom, latest: latestDate, rounds: draws.rounds.filter((r) => r.date >= chartFrom).map(({ date, category, crs: c, name }) => ({ date, category, crs: c, name })) };
  const scripts = `${jsonScript('draws-data', chartData)}<script type="module" src="/js/draws.js"></script>`;
  const jsonld = [{
    '@context': 'https://schema.org', '@type': 'Dataset', name: 'Express Entry rounds of invitations, 2015 to present',
    description: `All ${draws.rounds.length} Express Entry rounds of invitations with date, program or category, invitations issued and lowest CRS score invited.`,
    url: SITE.url + '/express-entry-draws/', isBasedOn: draws.page, dateModified: latestDate,
    temporalCoverage: `2015-01-31/${latestDate}`, spatialCoverage: 'Canada',
    creator: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  }];
  return page({ path: '/express-entry-draws/', title: `Express Entry Draws ${year}: All Rounds, Cut-off Scores and Categories`, description: `Every Express Entry draw since 2015 (${draws.rounds.length} rounds), filterable by CEC, PNP, French and other categories, with cut-off trends and the current CRS distribution.`, body, scripts, jsonld, crumbs: [['Home', '/'], ['Express Entry draws', '/express-entry-draws/']] });
}

// ---------- Simple pages ----------
function simple(path, title, description, h1, html) {
  return page({ path, title, description, body: `<section class="intro"><h1>${h1}</h1></section><article class="prose">${html}</article>`, crumbs: [['Home', '/'], [h1, path]] });
}
const aboutHtml = `
<p>CRS Planner is an independent site with free tools for people preparing an Express Entry profile. It is published by Magnify Digital S.L. (Spain); contact: <a href="mailto:hola@magnify.ing">hola@magnify.ing</a>. It is not affiliated with IRCC or the Government of Canada, and nothing here is immigration or legal advice. For advice on your case, talk to a licensed immigration consultant (RCIC) or a lawyer.</p>
<h2>Method</h2>
<ul>
<li>Every rule comes from an IRCC page, linked next to the tool that uses it, with the date that page was last modified and the date we last checked it.</li>
<li>The CRS calculator is tested against IRCC's own calculator with sample profiles before each release. The first three test profiles (single, couple, and French as first language) matched it point for point on ${longDate(SITE.checked)}.</li>
<li>Draw data is read every day from the data IRCC publishes for its rounds of invitations page. We keep a dated copy of each download.</li>
<li>When a rule changes, we update the tool, note it in the <a href="/changelog/">changelog</a> and show the new revision date on the page.</li>
</ul>
<h2>Corrections</h2>
<p>If you find a difference with IRCC's calculator or an outdated rule, write to <a href="mailto:hola@magnify.ing">hola@magnify.ing</a> with the page and, if you have it, the IRCC source. We check it against the official source and update the page and its revision date.</p>`;
const privacyHtml = `
<p>Last updated ${longDate(SITE.checked)}.</p>
<p>The calculators run in your browser. The answers you enter are saved in your browser's local storage so the form is filled in when you come back; they are not sent to us. You can clear them at any time by clearing this site's data in your browser.</p>
<p>This site does not set cookies of its own and does not use analytics or advertising yet. If that changes, this page will say which services are used, what they collect and how to opt out, before they are switched on.</p>
<p>The fonts are loaded from Google Fonts, which receives your IP address when the font files are requested.</p>
<p>The site is served through Cloudflare, which processes your IP address and technical connection data to deliver the pages and protect them from attacks.</p>
<p>The controller is Magnify Digital S.L. (Spain). For any question about your data, or to exercise your rights of access, rectification, erasure or objection, write to <a href="mailto:hola@magnify.ing">hola@magnify.ing</a>.</p>`;
const termsHtml = `
<p>Last updated ${longDate(SITE.checked)}.</p>
<p>The tools on CRS Planner give estimates based on the rules IRCC publishes. Your official score is the one calculated in your Express Entry profile. Rules can change without notice; check the source linked on each page before you make a decision.</p>
<p>CRS Planner is not affiliated with IRCC or the Government of Canada and does not give immigration or legal advice. We are not responsible for decisions taken on the basis of these estimates.</p>
<p>Data about rounds of invitations comes from IRCC and is shown with a link to its source.</p>`;
function changelogPage() {
  const rows = changelog.map((c) => `<tr><td>${c.date}</td><td>${esc(c.what)}</td></tr>`).join('');
  return simple('/changelog/', 'Changelog: Rule Updates and Changes | CRS Planner', 'Every change to the rules and data used by CRS Planner, with its date and source.', 'Changelog',
    `<p>Every change to the rules or data behind our tools, newest first.</p><div class="table-scroll"><table><thead><tr><th>Date</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

// ---------- Write ----------
rmSync(DIST, { recursive: true, force: true });
const out = (p, html) => { const f = join(DIST, p, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); };
out('', home());
out('clb-converter', clbPage());
out('express-entry-draws', drawsPage());
out('about', simple('/about/', 'About CRS Planner and How We Check the Rules', 'Who runs CRS Planner, where the rules come from and how the calculators are tested against IRCC.', 'About CRS Planner', aboutHtml));
out('privacy', simple('/privacy/', 'Privacy | CRS Planner', 'What CRS Planner stores and what it does not.', 'Privacy', privacyHtml));
out('terms', simple('/terms/', 'Terms of Use | CRS Planner', 'Terms of use and disclaimer for CRS Planner.', 'Terms of use', termsHtml));
out('changelog', changelogPage());
writeFileSync(join(DIST, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#111827"/><text x="16" y="21" font-family="monospace" font-size="12" font-weight="700" text-anchor="middle" fill="#ff6b6b">CRS</text></svg>');
cpSync(join(ROOT, 'src/css'), join(DIST, 'css'), { recursive: true });
cpSync(join(ROOT, 'src/js'), join(DIST, 'js'), { recursive: true });
const urls = ['/', '/clb-converter/', '/express-entry-draws/', '/about/', '/changelog/', '/privacy/', '/terms/'];
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE.url}${u}</loc><lastmod>${u === '/express-entry-draws/' ? latestDate : SITE.checked}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(DIST, '404.html'), page({ path: '/404', title: 'Page not found | CRS Planner', description: 'Page not found.', body: '<section class="intro"><h1>Page not found</h1><p>Try the <a href="/">CRS calculator</a> or the <a href="/express-entry-draws/">draws history</a>.</p></section>' }));
cpSync(join(ROOT, 'extras/_worker.js'), join(DIST, '_worker.js'));
console.log(`Built ${urls.length} pages into dist/`);
