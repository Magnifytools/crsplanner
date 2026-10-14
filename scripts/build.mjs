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
const cats = read('data/rules/categories.json');
// Scheduled pages go live when scripts/release.mjs adds them to data/released.json (daily GitHub Action).
// PREVIEW=1 builds every scheduled page.
const schedule = read('data/schedule.json');
const released = new Set(read('data/released.json'));
const isLive = (path) => !(path in schedule.pages) || released.has(path) || process.env.PREVIEW === '1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-CA'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const jsonScript = (id, obj) => `<script type="application/json" id="${id}">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const NAV = [['/', 'CRS calculator'], ['/clb-converter/', 'CLB converter'], ['/express-entry-draws/', 'Draws'], ['/express-entry-categories/', 'Categories'], ['/crs-score-distribution/', 'Score distribution']];
const LEVELS = [4, 5, 6, 7, 8, 9, 10];
const footerTools = [['/', 'CRS calculator'], ['/clb-converter/', 'CLB converter'], ['/express-entry-draws/', 'Express Entry draws'], ['/express-entry-categories/', 'Express Entry categories'], ['/crs-score-distribution/', 'CRS score distribution']];

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
<div class="foot-grid">
<div><p class="foot-h">Tools</p><ul>${footerTools.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">Draws by category</p><ul>${catPagesList().map((c) => `<li><a href="/express-entry-draws/${CAT_PAGES[c.id].slug}/">${esc(CAT_PAGES[c.id].short)}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">English: CLB levels</p><ul>${LEVELS.map((l) => `<li><a href="/clb-${l}/">CLB ${l}${l === 10 ? '+' : ''}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">French: NCLC levels</p><ul>${LEVELS.map((l) => `<li><a href="/nclc-${l}/">NCLC ${l}${l === 10 ? '+' : ''}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">CRS Planner</p><ul><li><a href="/about/">About and method</a></li><li><a href="/changelog/">Changelog</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li></ul></div>
</div>
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
  <p class="callout small" id="tcf-note" hidden></p>
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
  const scripts = `${jsonScript('crs-rules', crs)}${jsonScript('lang-rules', lang)}${jsonScript('recent-draws', { categories: recentCats.map((c) => ({ ...c, slug: CAT_PAGES[c.id] && catPagesList().some((x) => x.id === c.id) ? CAT_PAGES[c.id].slug : null })), rounds: recentRounds })}<script type="module" src="/js/calculator.js"></script>`;
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
    const fmtRange = (arr, i, s) => scoreRange(t, s, i);
    const rows = [...lang.levels].map((lvl, i) => ({ lvl, i })).reverse().map(({ lvl, i }) =>
      `<tr><td>${nm} ${lvl}${lvl === 10 ? '+' : ''}</td>${['speaking', 'listening', 'reading', 'writing'].map((s) => `<td class="n">${fmtRange(t[s], i, s)}</td>`).join('')}</tr>`).join('');
    const chart = CHART_PAGES[id] && isLive(`/${CHART_PAGES[id].slug}/`) ? `<p class="small">Minimum scores per program and CRS points: <a href="/${CHART_PAGES[id].slug}/">${CHART_PAGES[id].short} score chart</a>.</p>` : '';
    return `<h3 id="${id}">${esc(t.name)} to ${nm}</h3>${chart}<div class="table-scroll"><table><thead><tr><th>Level</th><th class="n">Speaking</th><th class="n">Listening</th><th class="n">Reading</th><th class="n">Writing</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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
<p class="callout">${TCF_NOTE}</p>
<h2>CLB and NCLC levels one by one</h2>
<p>English: ${LEVELS.map((l) => `<a href="/clb-${l}/">CLB ${l}${l === 10 ? '+' : ''}</a>`).join(', ')}. French: ${LEVELS.map((l) => `<a href="/nclc-${l}/">NCLC ${l}${l === 10 ? '+' : ''}</a>`).join(', ')}.</p>
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

<h2>Draws by category</h2>
<p>What each category requires and which occupations it covers: <a href="/express-entry-categories/">Express Entry categories</a>.</p>
<p class="levels">${catPagesList().map((c) => `<a href="/express-entry-draws/${CAT_PAGES[c.id].slug}/">${esc(CAT_PAGES[c.id].short)}</a>`).join(' ')}</p>

<h2>Cut-off scores, last three years</h2>
<div class="chips" id="chips" role="group" aria-label="Filter by program or category">${chipsHtml}</div>
<svg class="chart" id="cutoff-chart" viewBox="0 0 760 260" role="img" aria-label="Cut-off score of each draw over time"></svg>
<p class="small" id="chart-summary" aria-live="polite"></p>

<h2>All rounds</h2>
<div class="table-scroll"><table id="draws-table"><thead><tr><th>Date</th><th class="n">Round</th><th>Program or category</th><th class="n">Invitations</th><th class="n">Lowest score</th></tr></thead><tbody>${rows}</tbody></table></div>

<h2>Score distribution of the pool</h2>
<p>${fmt(draws.distribution.total)} profiles were in the pool on ${esc(draws.distribution.asOf)}. See how they spread by score range on the <a href="/crs-score-distribution/">CRS score distribution</a> page.</p>

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
  return page({ path: '/express-entry-draws/', title: `Express Entry Draws ${year}: All Rounds and Cut-off Scores`, description: `Every Express Entry draw since 2015 (${draws.rounds.length} rounds), filterable by CEC, PNP, French and other categories, with cut-off trends and the current CRS distribution.`, body, scripts, jsonld, crumbs: [['Home', '/'], ['Express Entry draws', '/express-entry-draws/']] });
}

// ---------- CLB / NCLC level pages ----------
const SK = ['speaking', 'listening', 'reading', 'writing'];
const SKL = { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing' };
const rowFor = (table, l) => table.find((r) => l >= r.minClb);
const fmtScore = (t, v) => (t.step < 1 ? Number(v).toFixed(1) : String(v));
function scoreRange(t, s, i) {
  const lo = t[s][i];
  const next = t[s][i + 1];
  if (next === undefined) return `${fmtScore(t, lo)} or higher`;
  const hi = Math.round((next - t.step) * 10) / 10;
  return hi <= lo ? fmtScore(t, lo) : `${fmtScore(t, lo)} to ${fmtScore(t, hi)}`;
}
const TCF_NOTE = 'IRCC’s online CRS calculator gives 0 points for TCF Canada results at NCLC 4, while the published CRS criteria give 6 points per ability for CLB or NCLC 4 and 5, and the same calculator does give them for TEF Canada. CRS Planner follows the published criteria. We found this on 14 October 2026 while testing our calculator against IRCC’s with 1,000 random profiles.';

function levelPage(language, L) {
  const fr = language === 'fr';
  const name = fr ? 'NCLC' : 'CLB';
  const tests = Object.entries(lang.tests).filter(([, t]) => t.language === language);
  const i = lang.levels.indexOf(L);
  const plus = L === 10 ? '+' : '';
  const testNames = tests.map(([, t]) => t.name);
  const listNames = testNames.length === 2 ? testNames.join(' and ') : `${testNames.slice(0, -1).join(', ')} and ${testNames.at(-1)}`;
  const tables = tests.map(([id, t]) => `<h3>${esc(t.name)}</h3>${CHART_PAGES[id] && isLive(`/${CHART_PAGES[id].slug}/`) ? `<p class="small">All levels: <a href="/${CHART_PAGES[id].slug}/">${CHART_PAGES[id].short} score chart</a>.</p>` : ''}<div class="table-scroll"><table><thead><tr><th>Ability</th><th class="n">Score for ${name} ${L}${plus}</th></tr></thead><tbody>${SK.map((s) => `<tr><td>${SKL[s]}</td><td class="n">${scoreRange(t, s, i)}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const first = rowFor(crs.core.firstLanguage.perAbilityByClb, L).points;
  const second = rowFor(crs.core.secondLanguage.perAbilityByClb, L).points;
  const spouse = rowFor(crs.spouse.language.perAbilityByClb, L).points;
  const transfer = L >= 9 ? 'the top rate: up to 50 points for education and 50 for foreign work experience' : L >= 7 ? 'the lower rate: up to 25 points for education and 25 for foreign work experience; CLB 9 in all four abilities doubles them' : 'nothing for education or foreign work experience, which start at CLB 7';
  const programs = [
    ['Federal Skilled Worker Program', `${name} 7 in all four abilities`, L >= 7],
    ['Canadian Experience Class, TEER 0 or 1 jobs', `${name} 7 in all four abilities`, L >= 7],
    ['Canadian Experience Class, TEER 2 or 3 jobs', `${name} 5 in all four abilities`, L >= 5],
    ['Federal Skilled Trades Program', `${name} 5 in speaking and listening, ${name} 4 in reading and writing`, L >= 5],
  ];
  const progRows = programs.map(([p, need, ok]) => `<tr><td>${p}</td><td>${need}</td><td>${ok ? 'Met' : 'Not met'}</td></tr>`).join('');
  const nav = `<p class="levels">${LEVELS.map((l) => (l === L ? `<strong>${name} ${l}${l === 10 ? '+' : ''}</strong>` : `<a href="/${fr ? 'nclc' : 'clb'}-${l}/">${name} ${l}${l === 10 ? '+' : ''}</a>`)).join(' ')}</p>`;
  const frenchBonus = fr
    ? `<h2>French bonus points</h2><p>${L >= 7 ? `At NCLC ${L} in all four abilities you qualify for the French bonus: 50 additional points if you also have CLB 5 or higher in all four English abilities, or 25 if your English is CLB 4 or lower or you have no English test.` : `The French bonus starts at NCLC 7 in all four abilities. At NCLC ${L} it does not apply.`}</p>`
    : '';
  const tcfNote = fr && L === 4 ? `<p class="callout">${TCF_NOTE}</p>` : '';
  const other = fr ? `<a href="/clb-${L}/">CLB ${L}${plus} in English</a>` : `<a href="/nclc-${L}/">NCLC ${L}${plus} in French</a>`;
  const body = `
<section class="intro">
  <h1>${fr ? `NCLC ${L}${plus} in French: TEF Canada and TCF Canada scores` : `CLB ${L}${plus}: the IELTS, CELPIP and PTE Core scores you need`}</h1>
  <p class="lede">${fr ? `NCLC ${L} is the French equivalent of CLB ${L}.` : ''} These are the ${listNames} results that count as ${name} ${L}${plus} for Express Entry, ability by ability, and what that level is worth in CRS points.</p>
  <p class="meta"><span>Equivalences checked ${longDate(SITE.checked)}</span><span>Source: <a href="${lang.source}" rel="noopener">IRCC language test results</a></span></p>
</section>
${nav}
<article class="prose">
<h2>Scores for ${name} ${L}${plus}</h2>
<p>You need the score in each ability separately. Your level is set ability by ability, so one weaker result does not lower the others.</p>
${tables}
${tcfNote}
<h2>What ${name} ${L}${plus} is worth in the CRS</h2>
<div class="table-scroll"><table><thead><tr><th>Used as</th><th class="n">Per ability</th><th class="n">All four abilities</th></tr></thead><tbody>
<tr><td>First official language, single applicant</td><td class="n">${first[1]}</td><td class="n">${first[1] * 4}</td></tr>
<tr><td>First official language, with a partner who counts</td><td class="n">${first[0]}</td><td class="n">${first[0] * 4}</td></tr>
<tr><td>Second official language</td><td class="n">${second[1]}</td><td class="n">${Math.min(second[1] * 4, crs.core.secondLanguage.max[1])}</td></tr>
<tr><td>Your partner’s language</td><td class="n">${spouse}</td><td class="n">${Math.min(spouse * 4, crs.spouse.language.max)}</td></tr>
</tbody></table></div>
<p>With ${name} ${L} in all four abilities of your first official language, skill transferability gives ${transfer}.</p>
${frenchBonus}
<h2>Program minimums</h2>
<div class="table-scroll"><table><thead><tr><th>Program</th><th>Minimum</th><th>With ${name} ${L}${plus} in all four</th></tr></thead><tbody>${progRows}</tbody></table></div>
<p>Calculate your full score with the <a href="/">CRS calculator</a>, convert a mixed set of results with the <a href="/clb-converter/">CLB converter</a>, or see ${other}.</p>
<h2>Sources</h2>
<ul><li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC</li><li><a href="${crs.source}" rel="noopener">CRS criteria</a>, IRCC, modified ${longDate(crs.sourceModified)}</li></ul>
</article>`;
  const path = `/${fr ? 'nclc' : 'clb'}-${L}/`;
  const title = fr ? `NCLC ${L}${plus} French: TEF and TCF Canada Scores (2026)` : `CLB ${L}${plus} Equivalent: IELTS, CELPIP and PTE Core Scores (2026)`;
  const desc = fr ? `TEF Canada and TCF Canada scores for NCLC ${L} (CLB ${L} in French), CRS points per ability, the French bonus and program minimums.` : `IELTS General, CELPIP and PTE Core scores for CLB ${L}, ability by ability, with the CRS points it gives and the Express Entry programs it qualifies you for.`;
  return page({ path, title, description: desc, body, crumbs: [['Home', '/'], ['CLB converter', '/clb-converter/'], [`${name} ${L}${plus}`, path]] });
}

// ---------- CRS score distribution ----------
function distributionPage() {
  const d = draws.distribution;
  const main = d.buckets.filter((b) => !b.sub);
  const maxB = Math.max(...main.map((b) => b.count));
  const W = 760, rowH = 30, H = main.length * rowH + 10;
  const bars = main.map((b, i) => `<text x="0" y="${i * rowH + 19}">${b.range}</text><rect class="bar-r" x="80" y="${i * rowH + 6}" height="18" width="${((b.count / maxB) * 560).toFixed(1)}" rx="3"/><text x="${(86 + (b.count / maxB) * 560).toFixed(1)}" y="${i * rowH + 19}">${fmt(b.count)}</text>`).join('');
  const rows = d.buckets.map((b) => `<tr${b.sub ? '' : ' class="section"'}><td>${b.sub ? '&nbsp;&nbsp;' : ''}${b.range}</td><td class="n">${fmt(b.count)}</td><td class="n">${((b.count / d.total) * 100).toFixed(1)}%</td></tr>`).join('');
  // Share of the pool at 501+ and 451+ in the latest snapshot
  const above = (ranges) => main.filter((b) => ranges.includes(b.range)).reduce((s, b) => s + b.count, 0);
  const a501 = above(['601-1200', '501-600']);
  const a451 = a501 + above(['451-500']);
  const hist = draws.distributionHistory || { snapshots: [] };
  const snaps = hist.snapshots.filter((s) => s.asOf >= `${Number(latestDate.slice(0, 4)) - 2}${latestDate.slice(4)}`);
  let histHtml = '';
  if (snaps.length >= 2) {
    const HW = 760, HH = 240, L0 = 56, R0 = 12, T0 = 12, B0 = 28;
    const t = (x) => Date.parse(x);
    const x0 = t(snaps[0].asOf), x1 = t(snaps.at(-1).asOf);
    const maxT = Math.ceil(Math.max(...snaps.map((s) => s.total)) / 50000) * 50000;
    const X = (x) => L0 + ((t(x) - x0) / Math.max(1, x1 - x0)) * (HW - L0 - R0);
    const Y = (v) => T0 + (1 - v / maxT) * (HH - T0 - B0);
    let g = '';
    for (let v = 0; v <= maxT; v += 50000) g += `<line class="grid" x1="${L0}" x2="${HW - R0}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L0 - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    const path = snaps.map((s, k) => `${k ? 'L' : 'M'}${X(s.asOf).toFixed(1)} ${Y(s.total).toFixed(1)}`).join('');
    const y0 = new Date(x0).getUTCFullYear(), y1 = new Date(x1).getUTCFullYear();
    for (let y = y0 + 1; y <= y1; y++) g += `<text x="${X(`${y}-01-01`)}" y="${HH - 8}" text-anchor="middle">${y}</text>`;
    const first = snaps[0], last = snaps.at(-1);
    histHtml = `<h2>Size of the pool over time</h2><svg class="chart" viewBox="0 0 ${HW} ${HH}" role="img" aria-label="Number of profiles in the Express Entry pool over time">${g}<path class="line" d="${path}"/></svg><p class="small">${snaps.length} snapshots published by IRCC between ${first.asOf} and ${last.asOf}: from ${fmt(first.total)} to ${fmt(last.total)} profiles.</p>`;
  }
  const body = `
<section class="intro">
  <h1>CRS Score Distribution of the Express Entry Pool</h1>
  <p class="lede">How many profiles sit in each CRS score range, from IRCC's latest snapshot of the pool, and how the pool has changed.</p>
  <p class="meta"><span>Snapshot of ${esc(d.asOf)}</span><span>Updated with every round</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Profiles in the pool</div><div class="v">${fmt(d.total)}</div></div>
  <div class="card"><div class="k">With 501 points or more</div><div class="v">${fmt(a501)}</div><div class="small">${((a501 / d.total) * 100).toFixed(1)}% of the pool</div></div>
  <div class="card"><div class="k">With 451 points or more</div><div class="v">${fmt(a451)}</div><div class="small">${((a451 / d.total) * 100).toFixed(1)}% of the pool</div></div>
</div>
<h2>Profiles by score range</h2>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Number of profiles by CRS score range">${bars}</svg>
<div class="table-scroll"><table><thead><tr><th>CRS score range</th><th class="n">Profiles</th><th class="n">Share</th></tr></thead><tbody>${rows}</tbody></table></div>
${histHtml}
<article class="prose">
<h2>How to use it</h2>
<p>Find your score with the <a href="/">CRS calculator</a> and look at how many profiles are above you. A general round only invites from the top of the whole pool, but most rounds now target one program or category, so the profiles that matter are the ones competing in the same round as you. Compare with each category's recent cut-offs on the <a href="/express-entry-draws/">draws page</a>.</p>
<p>IRCC publishes this snapshot with each round of invitations. The 451 to 500 and 401 to 450 ranges are also broken down in ten-point steps.</p>
</article>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'CRS score distribution of the Express Entry pool', description: 'Number of Express Entry profiles by CRS score range, as published by IRCC with each round of invitations.', url: SITE.url + '/crs-score-distribution/', isBasedOn: draws.page, dateModified: d.asOfIso || latestDate, spatialCoverage: 'Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
  return page({ path: '/crs-score-distribution/', title: `CRS Score Distribution ${latestDate.slice(0, 4)}: Express Entry Pool by Score`, description: `${fmt(d.total)} profiles in the Express Entry pool on ${d.asOf}, by CRS score range, with the share above 450 and 500 points and the pool size over time.`, body, jsonld, crumbs: [['Home', '/'], ['CRS score distribution', '/crs-score-distribution/']] });
}

// ---------- Draws by program or category ----------
const CAT_PAGES = {
  cec: { slug: 'cec', short: 'CEC', kw: 'CEC Draw', h1: 'CEC Draws: Canadian Experience Class Cut-off Scores', about: 'Canadian Experience Class rounds invite only candidates eligible for the CEC, which requires at least one year of skilled work experience in Canada in the last three years.' },
  pnp: { slug: 'pnp', short: 'PNP', kw: 'PNP Draw', h1: 'PNP Draws: Provincial Nominee Program Cut-off Scores', about: 'Provincial Nominee Program rounds invite only candidates with a provincial or territorial nomination. The nomination adds 600 points, which is why these cut-offs sit above 600.' },
  french: { slug: 'french', short: 'French', kw: 'French Draw', h1: 'French-Language Proficiency Draws: Cut-off Scores', about: 'French-language proficiency rounds invite candidates with strong French results. IRCC sets the exact requirement for each year’s version of the category.' },
  health: { slug: 'healthcare', short: 'Healthcare', kw: 'Healthcare Draw', h1: 'Healthcare Draws: Healthcare and Social Services Cut-off Scores', about: 'Healthcare and social services rounds invite candidates with recent work experience in the eligible occupations listed by IRCC for each version of the category.' },
  trades: { slug: 'trades', short: 'Trades', kw: 'Trades Draw', h1: 'Trades Draws: Trade Occupations Cut-off Scores', about: 'Trade occupation rounds invite candidates with recent work experience in the trades listed by IRCC for each version of the category.' },
  stem: { slug: 'stem', short: 'STEM', kw: 'STEM Draw', h1: 'STEM Draws: STEM Occupations Cut-off Scores', about: 'STEM rounds invited candidates with recent work experience in eligible science, technology, engineering and math occupations.' },
  transport: { slug: 'transport', short: 'Transport', kw: 'Transport Draw', h1: 'Transport Draws: Transport Occupations Cut-off Scores', about: 'Transport occupation rounds invite candidates with recent work experience in the transport occupations listed by IRCC.' },
  education: { slug: 'education', short: 'Education', kw: 'Education Draw', h1: 'Education Draws: Education Occupations Cut-off Scores', about: 'Education occupation rounds invite candidates with recent work experience in the education occupations listed by IRCC.' },
  agriculture: { slug: 'agriculture', short: 'Agriculture', kw: 'Agriculture Draw', h1: 'Agriculture Draws: Agriculture and Agri-Food Cut-off Scores', about: 'Agriculture and agri-food rounds invited candidates with recent work experience in the eligible occupations.' },
  managers: { slug: 'senior-managers', short: 'Senior managers', kw: 'Senior Managers Draw', h1: 'Senior Managers Draws: Cut-off Scores', about: 'This category invites senior managers with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  physicians: { slug: 'physicians', short: 'Physicians', kw: 'Physicians Draw', h1: 'Physicians Draws: Physicians with Canadian Work Experience', about: 'This category invites physicians with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  researchers: { slug: 'researchers', short: 'Researchers', kw: 'Researchers Draw', h1: 'Researchers Draws: Researchers with Canadian Work Experience', about: 'This category invites researchers with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  general: { slug: 'general', short: 'General', kw: 'General Draw', h1: 'General (All-Program) Draws: Cut-off Scores', about: 'General rounds invite the top-ranked candidates from all three federal programs. They were the main type of round until category and program rounds took over.' },
};
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)) : null; };
const dayDiff = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
function catChart(list) {
  const W = 760, H = 240, L = 44, R = 12, T = 12, B = 28;
  if (list.length < 2) return '';
  const pts = [...list].reverse();
  const t = (d) => Date.parse(d);
  const x0 = t(pts[0].date), x1 = t(pts.at(-1).date);
  const ys = pts.map((r) => r.crs);
  const span = Math.max(...ys) - Math.min(...ys);
  const step = span <= 60 ? 10 : span <= 150 ? 25 : span <= 300 ? 50 : 100;
  const lo = Math.floor(Math.min(...ys) / step) * step, hi = Math.max(lo + step, Math.ceil(Math.max(...ys) / step) * step);
  const X = (d) => L + ((t(d) - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let g = '';
  for (let v = lo; v <= hi; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text x="${L - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v}</text>`;
  const y0 = new Date(x0).getUTCFullYear(), y1 = new Date(x1).getUTCFullYear();
  for (let y = y0 + 1; y <= y1; y++) g += `<text x="${X(`${y}-01-01`).toFixed(1)}" y="${H - 8}" text-anchor="middle">${y}</text>`;
  const path = pts.map((r, i) => `${i ? 'L' : 'M'}${X(r.date).toFixed(1)} ${Y(r.crs).toFixed(1)}`).join('');
  const dots = pts.map((r) => `<circle class="dot" cx="${X(r.date).toFixed(1)}" cy="${Y(r.crs).toFixed(1)}" r="2.5"><title>${r.date}: ${r.crs}</title></circle>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cut-off score of each draw">${g}<path class="line" d="${path}"/>${dots}</svg>`;
}
const catPagesList = () => draws.categories.filter((c) => CAT_PAGES[c.id] && draws.rounds.filter((r) => r.category === c.id).length >= 3);
function categoryPage(c) {
  const meta = CAT_PAGES[c.id];
  const all = draws.rounds.filter((r) => r.category === c.id && r.crs !== null);
  const last = all[0];
  const yearAgoC = `${Number(latestDate.slice(0, 4)) - 1}${latestDate.slice(4)}`;
  const recent = all.filter((r) => r.date > yearAgoC);
  const gaps = recent.slice(0, -1).map((r, i) => dayDiff(r.date, recent[i + 1].date));
  const chartFromC = `${Number(latestDate.slice(0, 4)) - 3}${latestDate.slice(4)}`;
  const chartList = all.filter((r) => r.date >= chartFromC);
  const year = latestDate.slice(0, 4);
  const thisYear = all.filter((r) => r.date.startsWith(year));
  const names = [...new Set(all.map((r) => r.name))];
  const rows = all.map((r) => `<tr><td>${r.date}</td><td class="n">${esc(r.n)}</td><td>${esc(r.name)}</td><td class="n">${fmt(r.size)}</td><td class="n">${fmt(r.crs)}</td></tr>`).join('');
  const others = catPagesList().filter((o) => o.id !== c.id).map((o) => `<a href="/express-entry-draws/${CAT_PAGES[o.id].slug}/">${esc(CAT_PAGES[o.id].short)}</a>`).join(', ');
  const stats = recent.length
    ? `<div class="cards">
  <div class="card"><div class="k">Draws in the last 12 months</div><div class="v">${recent.length}</div></div>
  <div class="card"><div class="k">Cut-off range, last 12 months</div><div class="v">${Math.min(...recent.map((r) => r.crs))}–${Math.max(...recent.map((r) => r.crs))}</div></div>
  <div class="card"><div class="k">Median cut-off, last 12 months</div><div class="v">${median(recent.map((r) => r.crs))}</div></div>
  <div class="card"><div class="k">Median days between draws</div><div class="v">${gaps.length ? median(gaps) : '–'}</div></div>
</div>`
    : `<p>There have been no ${esc(meta.short)} draws in the last 12 months. The most recent one was on ${longDate(last.date)}.</p>`;
  const path = `/express-entry-draws/${meta.slug}/`;
  const body = `
<section class="intro">
  <h1>${esc(meta.h1)}</h1>
  <p class="lede">The latest ${esc(meta.short)} round was #${esc(last.n)} on ${longDate(last.date)}: ${fmt(last.size)} invitations with a cut-off of ${fmt(last.crs)} points. Below are all ${fmt(all.length)} ${esc(meta.short)} rounds since ${all.at(-1).date.slice(0, 4)}, with the trend and how often they happen.</p>
  <p class="meta"><span>Updated daily from IRCC data</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>
${stats}
<p class="small">${fmt(thisYear.length)} ${esc(meta.short)} rounds in ${year} so far, with ${fmt(thisYear.reduce((s, r) => s + (r.size || 0), 0))} invitations.</p>
${chartList.length >= 2 ? `<h2>Cut-off scores since ${chartFromC.slice(0, 4)}</h2>${catChart(chartList)}` : ''}
<h2>All ${esc(meta.short)} rounds</h2>
<div class="table-scroll"><table><thead><tr><th>Date</th><th class="n">Round</th><th>Name used by IRCC</th><th class="n">Invitations</th><th class="n">Lowest score</th></tr></thead><tbody>${rows}</tbody></table></div>
<article class="prose">
<h2>Who these rounds invite</h2>
<p>${esc(meta.about)} Being above a cut-off only matters if you are eligible for the round.</p>
${(() => { const k = cats.categories.find((x) => x.drawId === c.id); return k ? `<p><strong>Requirement in ${cats.checked.slice(0, 4)}:</strong> ${esc(k.requirement)}${k.occupations ? ` The category covers ${k.occupations.length} occupation${k.occupations.length > 1 ? 's' : ''}; see the list with NOC codes on the <a href="/express-entry-categories/#${k.id}">Express Entry categories</a> page.` : ` More on the <a href="/express-entry-categories/#${k.id}">Express Entry categories</a> page.`}</p>` : ''; })()}
${names.length > 1 ? `<p>IRCC has used ${names.length} names for these rounds over time: ${names.map(esc).join('; ')}. We group them here so the trend can be compared.</p>` : ''}
<p>Check your own score with the <a href="/">CRS calculator</a>, which compares it with every category's cut-offs of the last 12 months. Other categories: ${others}. All rounds together are on the <a href="/express-entry-draws/">Express Entry draws</a> page.</p>
</article>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: `Express Entry ${meta.short} rounds of invitations`, description: `All ${all.length} Express Entry ${meta.short} rounds with date, invitations and lowest CRS score invited.`, url: SITE.url + path, isBasedOn: draws.page, dateModified: last.date, spatialCoverage: 'Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
  const longT = `${meta.kw} ${year}: Latest Express Entry ${meta.short} Cut-off and History`;
  const title = !recent.length ? `${meta.kw}s: Express Entry Cut-off History ${all.at(-1).date.slice(0, 4)}–${last.date.slice(0, 4)}` : longT.length <= 65 ? longT : `${meta.kw} ${year}: Latest Cut-off and History`;
  return page({ path, title, description: `Latest ${meta.short} Express Entry draw: #${last.n} on ${longDate(last.date)}, ${fmt(last.size)} invitations, cut-off ${last.crs}. All ${all.length} rounds, trend and frequency.`, body, jsonld, crumbs: [['Home', '/'], ['Express Entry draws', '/express-entry-draws/'], [meta.short, path]] });
}

// ---------- Express Entry categories ----------
const CAT_SLUG_BY_DRAW = Object.fromEntries(Object.entries(CAT_PAGES).map(([id, m]) => [id, m.slug]));
function catStats(drawId) {
  if (!drawId) return { all: [], recent: [] };
  const all = draws.rounds.filter((r) => r.category === drawId && r.crs !== null);
  const yearAgoC = `${Number(latestDate.slice(0, 4)) - 1}${latestDate.slice(4)}`;
  return { all, recent: all.filter((r) => r.date > yearAgoC) };
}
function categoriesPage() {
  const C = cats.categories;
  const drawLink = (c) => (c.drawId && catPagesList().some((x) => x.id === c.drawId) ? `/express-entry-draws/${CAT_SLUG_BY_DRAW[c.drawId]}/` : null);
  const summary = C.map((c) => {
    const { all, recent } = catStats(c.drawId);
    const last = all[0];
    const link = drawLink(c);
    const lastTxt = last ? `${link ? `<a href="${link}">` : ''}${last.date}, cut-off ${fmt(last.crs)}${link ? '</a>' : ''}` : 'No round yet';
    const lo = Math.min(...recent.map((r) => r.crs)), hi = Math.max(...recent.map((r) => r.crs));
    const range = recent.length ? `${lo === hi ? lo : `${lo}–${hi}`} (${recent.length} round${recent.length > 1 ? 's' : ''})` : '–';
    return `<tr><td><a href="#${c.id}">${esc(c.name)}</a></td><td class="n">${c.occupations ? c.occupations.length : '–'}</td><td>${lastTxt}</td><td class="n">${range}</td></tr>`;
  }).join('');
  const sections = C.map((c) => {
    const { all, recent } = catStats(c.drawId);
    const link = drawLink(c);
    const occ = c.occupations ? `<div class="table-scroll"><table><thead><tr><th>Occupation</th><th class="n">NOC 2021</th><th class="n">TEER</th></tr></thead><tbody>${c.occupations.map((o) => `<tr><td>${esc(o.title)}</td><td class="n">${o.noc}</td><td class="n">${o.teer}</td></tr>`).join('')}</tbody></table></div>` : '';
    const draw = all.length
      ? `<p>${recent.length ? `${recent.length} round${recent.length > 1 ? 's' : ''} in the last 12 months, ${recent.length > 1 ? `with cut-offs from ${Math.min(...recent.map((r) => r.crs))} to ${Math.max(...recent.map((r) => r.crs))}` : `with a cut-off of ${recent[0].crs}`}.` : 'No rounds in the last 12 months.'} The latest was on ${longDate(all[0].date)}: ${fmt(all[0].size)} invitations, cut-off ${fmt(all[0].crs)}.${link ? ` See every round on the <a href="${link}">${esc(CAT_PAGES[c.drawId].short)} draws page</a>.` : ''}</p>`
      : '<p>IRCC has not held a round for this category yet.</p>';
    const tcf = c.id === 'french' ? `<p>Check your level with the <a href="/clb-converter/">CLB converter</a> or see the TEF and TCF scores for <a href="/nclc-7/">NCLC 7</a>. NCLC 7 in all four abilities also gives up to 50 additional CRS points, whether or not you are invited through this category.</p>` : '';
    return `<h2 id="${c.id}">${esc(c.name)}</h2><p><strong>Requirement:</strong> ${esc(c.requirement)}</p>${occ}${tcf}${draw}`;
  }).join('\n');
  const PROGRAM_ROUNDS = ['cec', 'pnp', 'fsw', 'fst', 'general'];
  const retired = catPagesList().filter((c) => !PROGRAM_ROUNDS.includes(c.id) && !C.some((k) => k.drawId === c.id));
  // A data-driven example of how far apart cut-offs can be: lowest category round vs lowest CEC round, last 12 months.
  const lowCat = C.map((c) => ({ c, r: catStats(c.drawId).recent })).filter((x) => x.r.length).map((x) => ({ name: x.c.name, max: Math.max(...x.r.map((r) => r.crs)) })).sort((a, b) => a.max - b.max)[0];
  const cecRecent = catStats('cec').recent;
  const contrast = lowCat && cecRecent.length && Math.min(...cecRecent.map((r) => r.crs)) > lowCat.max
    ? ` In the last 12 months every round for ${esc(lowCat.name[0].toLowerCase() + lowCat.name.slice(1))} closed at ${lowCat.max} points or less, while no Canadian Experience Class round went below ${Math.min(...cecRecent.map((r) => r.crs))}.` : '';
  const body = `
<section class="intro">
  <h1>Express Entry Categories 2026: Who Qualifies and Recent Cut-offs</h1>
  <p class="lede">IRCC runs category-based rounds for ${C.length} categories in 2026. Here is what each one asks for, the eligible occupations with their NOC codes, and the cut-off scores of its recent rounds.</p>
  <p class="meta"><span>IRCC page modified ${longDate(cats.sourceModified)}</span><span>Checked ${longDate(cats.checked)}</span><span>Source: <a href="${cats.source}" rel="noopener">IRCC category-based selection</a></span></p>
</section>
<div class="table-scroll"><table><thead><tr><th>Category</th><th class="n">Occupations</th><th>Latest round</th><th class="n">Cut-offs, last 12 months</th></tr></thead><tbody>${summary}</tbody></table></div>
<article class="prose">
<h2>How category rounds work</h2>
<p>${esc(cats.general)}</p>
<p>In a category round IRCC ranks only the candidates who meet that category's requirement and invites the highest CRS scores. Your score is the same in every round; what changes is who you compete with. That is why a category's cut-off can be far below the others.${contrast}</p>
<p>Your occupation is matched by its NOC 2021 code. The 12 months of experience have to be in the last 3 years and in one listed occupation, but they do not need to be continuous. IRCC can also skip a category for a while if enough of its candidates are already being invited in general or program rounds.</p>
<p>Compare your own score with each category's cut-offs on the <a href="/">CRS calculator</a>.</p>
${sections}
${retired.length ? `<h2>Categories no longer on the list</h2><p>${retired.map((c) => `<a href="/express-entry-draws/${CAT_PAGES[c.id].slug}/">${esc(CAT_PAGES[c.id].short)}</a>`).join(' and ')} had their own rounds in earlier years but are not among IRCC's current categories. Their history stays on our draws pages.</p>` : ''}
<h2>Sources</h2>
<ul><li><a href="${cats.source}" rel="noopener">Express Entry: Category-based selection</a>, IRCC, modified ${longDate(cats.sourceModified)}</li><li><a href="${draws.page}" rel="noopener">Express Entry rounds of invitations</a>, IRCC</li></ul>
</article>`;
  return page({ path: '/express-entry-categories/', title: 'Express Entry Categories 2026: Eligibility, NOC List, Cut-offs', description: `The ${C.length} Express Entry categories for 2026: requirements, eligible occupations with NOC codes and the cut-off scores of each category's recent rounds.`, body, crumbs: [['Home', '/'], ['Express Entry categories', '/express-entry-categories/']] });
}

// ---------- Score chart pages, one per test ----------
const CHART_PAGES = {
  celpip: { slug: 'celpip-score-chart', short: 'CELPIP', title: 'CELPIP Score Chart: CELPIP to CLB for Express Entry (2026)', h1: 'CELPIP Score Chart for Express Entry', extra: 'For CLB 4 to 10, each CELPIP-General level is the same number as the CLB level: a 9 in an ability is CLB 9. Levels 11 and 12 count as CLB 10. CELPIP-General LS, the speaking and listening version, is not accepted for Express Entry.' },
  ielts: { slug: 'ielts-score-chart', short: 'IELTS', title: 'IELTS Score Chart for Canada PR: IELTS to CLB (2026)', h1: 'IELTS Score Chart for Canada PR (Express Entry)', extra: 'Only IELTS General Training is accepted for Express Entry; IELTS Academic is not, and neither are IELTS One Skill Retake results. Listening asks for more than the other abilities from CLB 8 up: CLB 9 is 8.0 in listening but 7.0 in speaking, reading and writing.' },
  tef: { slug: 'tef-canada-score-chart', short: 'TEF Canada', title: 'TEF Canada Score Chart: TEF to NCLC for Express Entry (2026)', h1: 'TEF Canada Score Chart for Express Entry', extra: 'Each ability has its own scale: speaking and writing are scored out of 450, listening out of 360 and reading out of 300. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  tcf: { slug: 'tcf-canada-score-chart', short: 'TCF Canada', title: 'TCF Canada Score Chart: TCF to NCLC for Express Entry (2026)', h1: 'TCF Canada Score Chart for Express Entry', extra: 'Speaking and writing are scored out of 20; listening and reading out of 699. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  pte: { slug: 'pte-core-score-chart', short: 'PTE Core', title: 'PTE Core Score Chart: PTE Core to CLB for Express Entry (2026)', h1: 'PTE Core Score Chart for Express Entry', extra: 'Only PTE Core is accepted for Express Entry; PTE Academic results are not. Each ability has its own thresholds, so the same score can give different CLB levels in speaking and in listening.' },
};
function scoreChartPage(id) {
  const t = lang.tests[id];
  const meta = CHART_PAGES[id];
  const name = t.language === 'fr' ? 'NCLC' : 'CLB';
  const rows = [...lang.levels].map((lvl, i) => ({ lvl, i })).reverse().map(({ lvl, i }) => `<tr><td>${name} ${lvl}${lvl === 10 ? '+' : ''}</td>${SK.map((s) => `<td class="n">${scoreRange(t, s, i)}</td>`).join('')}</tr>`).join('');
  const pts = [...lang.levels].reverse().map((L) => {
    const f = rowFor(crs.core.firstLanguage.perAbilityByClb, L).points;
    return `<tr><td>${name} ${L}${L === 10 ? '+' : ''}</td><td class="n">${f[1]}</td><td class="n">${f[1] * 4}</td><td class="n">${f[0] * 4}</td></tr>`;
  }).join('');
  const at = (L) => SK.map((s) => `${SKL[s].toLowerCase()} ${fmtScore(t, t[s][lang.levels.indexOf(L)])}`).join(', ');
  const minimums = [
    ['Federal Skilled Worker Program', `${name} 7 in all four`, at(7)],
    ['Canadian Experience Class, TEER 0 or 1 jobs', `${name} 7 in all four`, at(7)],
    ['Canadian Experience Class, TEER 2 or 3 jobs', `${name} 5 in all four`, at(5)],
    ['Federal Skilled Trades Program', `${name} 5 speaking and listening, ${name} 4 reading and writing`, `speaking ${fmtScore(t, t.speaking[1])}, listening ${fmtScore(t, t.listening[1])}, reading ${fmtScore(t, t.reading[0])}, writing ${fmtScore(t, t.writing[0])}`],
    ['Highest language points in the CRS', `${name} 10 in all four`, at(10)],
    ...(t.language === 'fr' ? [['French bonus (25 or 50 additional points)', 'NCLC 7 in all four', at(7)]] : []),
  ].map(([p, need, sc]) => `<tr><td>${p}</td><td>${need}</td><td>${sc}</td></tr>`).join('');
  const others = Object.entries(CHART_PAGES).filter(([k]) => k !== id && isLive(`/${CHART_PAGES[k].slug}/`)).map(([, m]) => `<a href="/${m.slug}/">${m.short} score chart</a>`);
  const path = `/${meta.slug}/`;
  const body = `
<section class="intro">
  <h1>${esc(meta.h1)}</h1>
  <p class="lede">The ${esc(t.name)} scores that give each ${name} level for Express Entry, ability by ability, the minimum scores for each program and what they are worth in CRS points. Enter your results to see your levels.</p>
  <p class="meta"><span>Equivalences checked ${longDate(SITE.checked)}</span><span>Source: <a href="${lang.source}" rel="noopener">IRCC language test results</a>, modified ${longDate(lang.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="clb-form" data-test="${id}" novalidate>
  <input type="hidden" name="test" value="${id}">
  <fieldset><legend>Your ${esc(t.name)} results</legend>
    ${SK.map((s) => `<div class="field"><label for="${s}">${SKL[s]}</label><input type="number" inputmode="decimal" id="${s}" name="${s}"></div>`).join('').replace(/^/, '<div class="scores">') + '</div>'}
    <p class="hint">The example shows the scores for ${name} 7. Replace them with yours.</p>
  </fieldset>
</form>
<aside class="results" aria-label="Your ${name} levels">
  <div class="cards">${SK.map((s) => `<div class="card"><div class="k">${SKL[s]}</div><div class="v" id="out-${s}">–</div></div>`).join('')}</div>
  <div><h2 class="panel-h">Lowest level across the four</h2><p class="score" id="out-min" style="font-size:1.4rem;margin:0"></p></div>
  <div class="cmp" id="out-checks"></div>
  <p class="small">See your full score with the <a href="/">CRS calculator</a>.</p>
</aside>
</div>
<article class="prose">
<h2>${esc(t.name)} to ${name} chart</h2>
<p>${esc(meta.extra)}</p>
<div class="table-scroll"><table><thead><tr><th>Level</th>${SK.map((s) => `<th class="n">${SKL[s]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
${id === 'tcf' ? `<p class="callout">${TCF_NOTE}</p>` : ''}
<p>A result below the ${name} 4 row does not reach ${name} 4. Each level has its own page: ${LEVELS.map((l) => `<a href="/${name.toLowerCase()}-${l}/">${name} ${l}${l === 10 ? '+' : ''}</a>`).join(', ')}.</p>
<h2>Minimum ${esc(meta.short)} scores for each program</h2>
<div class="table-scroll"><table><thead><tr><th>Program</th><th>Minimum</th><th>${esc(meta.short)} scores</th></tr></thead><tbody>${minimums}</tbody></table></div>
<h2>CRS points for each level</h2>
<p>As your first official language, per ability and for all four abilities at the same level.</p>
<div class="table-scroll"><table><thead><tr><th>Level</th><th class="n">Per ability, single</th><th class="n">All four, single</th><th class="n">All four, with a partner who counts</th></tr></thead><tbody>${pts}</tbody></table></div>
<p>${name} 7 and ${name} 9 in all four abilities also unlock skill transferability points for education and foreign work experience. The <a href="/">CRS calculator</a> adds all of it up${others.length ? `, and the same chart exists for other tests: ${others.join(', ')}` : ''}. To compare several tests at once, use the <a href="/clb-converter/">CLB converter</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC, modified ${longDate(lang.sourceModified)}</li><li><a href="${crs.source}" rel="noopener">CRS criteria</a>, IRCC, modified ${longDate(crs.sourceModified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('lang-rules', lang)}<script type="module" src="/js/clb.js"></script>`;
  return page({ path, title: meta.title, description: `${t.name} to ${name} chart for Express Entry: the score for each ${name} level by ability, minimum scores for FSW, CEC and FST, and CRS points. With a converter.`, body, scripts, crumbs: [['Home', '/'], ['CLB converter', '/clb-converter/'], [`${meta.short} score chart`, path]] });
}

// ---------- CELPIP <-> IELTS converter ----------
const EN_TESTS = Object.entries(lang.tests).filter(([, t]) => t.language === 'en');
function convertPage() {
  const tables = SK.map((s) => {
    const rows = [...lang.levels].map((lvl, i) => ({ lvl, i })).reverse().map(({ lvl, i }) => `<tr><td>CLB ${lvl}${lvl === 10 ? '+' : ''}</td>${EN_TESTS.map(([, t]) => `<td class="n">${scoreRange(t, s, i)}</td>`).join('')}</tr>`).join('');
    return `<h3>${SKL[s]}</h3><div class="table-scroll"><table><thead><tr><th>Level</th>${EN_TESTS.map(([, t]) => `<th class="n">${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('');
  const opts = (sel) => EN_TESTS.map(([id, t]) => `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  const ie = lang.tests.ielts, ce = lang.tests.celpip;
  const i9 = lang.levels.indexOf(9);
  const body = `
<section class="intro">
  <h1>CELPIP to IELTS Converter (and IELTS to CELPIP)</h1>
  <p class="lede">Turn a CELPIP-General score into the IELTS General Training score that gives the same CLB level for Canadian immigration, or the other way round. PTE Core is included too.</p>
  <p class="meta"><span>Equivalences checked ${longDate(SITE.checked)}</span><span>Source: <a href="${lang.source}" rel="noopener">IRCC language test results</a>, modified ${longDate(lang.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="conv-form" novalidate>
  <fieldset><legend>Convert</legend>
    <div class="row">
      <div class="field"><label for="from">From</label><select id="from" name="from">${opts('celpip')}</select></div>
      <div class="field"><label for="to">To</label><select id="to" name="to">${opts('ielts')}</select></div>
    </div>
    <div class="scores">${SK.map((s) => `<div class="field"><label for="${s}">${SKL[s]}</label><input type="number" inputmode="decimal" id="${s}" name="${s}"></div>`).join('')}</div>
    <p class="hint">The example is CELPIP 9 in every ability. Replace it with your scores.</p>
  </fieldset>
</form>
<aside class="results" aria-label="Equivalent scores">
  <div class="cards">${SK.map((s) => `<div class="card"><div class="k">${SKL[s]}</div><div class="v" id="eq-${s}">–</div><div class="small" id="clb-${s}"></div></div>`).join('')}</div>
  <p class="small">Each result is the score range in the other test that gives the same CLB level. See what it is worth in points with the <a href="/">CRS calculator</a>.</p>
</aside>
</div>
<article class="prose">
<h2>How the conversion works</h2>
<p>There is no official table that converts one test into another. What IRCC publishes is the score each test needs for each Canadian Language Benchmark (CLB) level. This converter reads your level from one test and gives the score range that reaches the same level in the other. For immigration that is the comparison that counts, because the CRS and the program minimums only look at your CLB level.</p>
<p>The steps are not the same in both tests, so the match is a range and not one number. CELPIP-General scores from 4 to 10 are the same number as the CLB level; IELTS needs different bands in each ability. For example, CLB ${lang.levels[i9]} is CELPIP ${ce.listening[i9]} in listening, which in IELTS is ${scoreRange(ie, 'listening', i9)} in listening but ${scoreRange(ie, 'speaking', i9)} in speaking.</p>
<h2>Equivalence tables by ability</h2>
${tables}
<p>Full charts for each test: ${Object.entries(CHART_PAGES).filter(([k]) => lang.tests[k].language === 'en' && isLive(`/${CHART_PAGES[k].slug}/`)).map(([, m]) => `<a href="/${m.slug}/">${m.short}</a>`).join(', ') || '<a href="/clb-converter/">CLB converter</a>'}. For French tests, see the <a href="/clb-converter/">CLB converter</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC, modified ${longDate(lang.sourceModified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('lang-rules', lang)}<script type="module" src="/js/convert.js"></script>`;
  return page({ path: '/celpip-to-ielts/', title: 'CELPIP to IELTS Converter (and IELTS to CELPIP) for Canada', description: 'Convert CELPIP-General to IELTS General Training scores and back through the CLB levels IRCC uses for Express Entry, ability by ability. PTE Core included.', body, scripts, crumbs: [['Home', '/'], ['CLB converter', '/clb-converter/'], ['CELPIP to IELTS', '/celpip-to-ielts/']] });
}

// ---------- Next draw: how often each type of round happens ----------
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function nextDrawPage() {
  const yearAgoC = `${Number(latestDate.slice(0, 4)) - 1}${latestDate.slice(4)}`;
  const recentAll = draws.rounds.filter((r) => r.date > yearAgoC);
  const per = draws.categories.map((c) => {
    const rs = recentAll.filter((r) => r.category === c.id);
    if (!rs.length) return null;
    const gaps = rs.slice(0, -1).map((r, i) => dayDiff(r.date, rs[i + 1].date));
    return { c, rs, last: rs[0], med: gaps.length ? median(gaps) : null, min: gaps.length ? Math.min(...gaps) : null, max: gaps.length ? Math.max(...gaps) : null };
  }).filter(Boolean).sort((a, b) => b.rs.length - a.rs.length);
  const link = (id, label) => (CAT_PAGES[id] && catPagesList().some((x) => x.id === id) ? `<a href="/express-entry-draws/${CAT_PAGES[id].slug}/">${esc(label)}</a>` : esc(label));
  const rows = per.map((p) => `<tr><td>${link(p.c.id, p.c.label)}</td><td class="n">${p.rs.length}</td><td class="n">${p.med ?? '–'}</td><td class="n">${p.min === null ? '–' : p.min === p.max ? p.min : `${p.min}–${p.max}`}</td><td>${p.last.date}</td><td class="n" data-since="${p.last.date}">–</td><td class="n">${fmt(p.last.crs)}</td></tr>`).join('');
  const byDay = [1, 2, 3, 4, 5].map((d) => [WD[d], recentAll.filter((r) => new Date(`${r.date}T12:00:00Z`).getUTCDay() === d).length]);
  const other = recentAll.length - byDay.reduce((s, [, n]) => s + n, 0);
  const dates = [...new Set(recentAll.map((r) => r.date))].sort();
  const weeks = new Set(dates.map((d) => { const t = new Date(`${d}T12:00:00Z`); const day = (t.getUTCDay() + 6) % 7; return new Date(t - day * 864e5).toISOString().slice(0, 10); }));
  const body = `
<section class="intro">
  <h1>Next Express Entry Draw: When Rounds Happen, by Category</h1>
  <p class="lede">IRCC does not publish a calendar of rounds of invitations. What it does publish is every past round, so here is how often each program and category has had a round in the last 12 months, how long ago the last one was and its cut-off.</p>
  <p class="meta"><span>Updated daily from IRCC data</span><span>Latest round: #${esc(draws.latestRound.n)} on ${longDate(latestDate)}</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Rounds in the last 12 months</div><div class="v">${recentAll.length}</div></div>
  <div class="card"><div class="k">Weeks with at least one round</div><div class="v">${weeks.size}</div><div class="small">out of the last 52</div></div>
  <div class="card"><div class="k">Latest round</div><div class="v">#${esc(draws.latestRound.n)}</div><div class="small">${longDate(latestDate)}, ${esc(draws.latestRound.name)}</div></div>
</div>
<h2>How often each type of round happens</h2>
<p>Days between rounds are counted from one round of that type to the next. The "days since" column counts to today in your browser.</p>
<div class="table-scroll"><table><thead><tr><th>Program or category</th><th class="n">Rounds, 12 months</th><th class="n">Median days between</th><th class="n">Shortest–longest gap</th><th>Last round</th><th class="n">Days since</th><th class="n">Last cut-off</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Days of the week</h2>
<div class="table-scroll"><table><thead><tr><th>Day</th><th class="n">Rounds, last 12 months</th></tr></thead><tbody>${byDay.map(([d, n]) => `<tr><td>${d}</td><td class="n">${n}</td></tr>`).join('')}${other ? `<tr><td>Weekend</td><td class="n">${other}</td></tr>` : ''}</tbody></table></div>
<article class="prose">
<h2>What this can and cannot tell you</h2>
<p>These figures describe what has happened, not what IRCC will do. IRCC decides each round on its own, can change the order of programs and categories at any time, and does not announce rounds in advance. A median gap is a reference: a type of round can come sooner or much later. We do not publish predicted dates or predicted cut-offs.</p>
<p>When a new round appears on IRCC's page, our <a href="/express-entry-draws/">draws page</a> picks it up within a few hours. To see where your own score stands against each type of round, use the <a href="/">CRS calculator</a>; for the requirements of each category, see <a href="/express-entry-categories/">Express Entry categories</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${draws.page}" rel="noopener">Express Entry rounds of invitations</a>, IRCC</li></ul>
</article>
<script>{const n=new Date(),t=Date.UTC(n.getFullYear(),n.getMonth(),n.getDate());for(const el of document.querySelectorAll('[data-since]')){const d=Math.round((t-Date.parse(el.dataset.since))/864e5);el.textContent=d>=0?d:'–';}}</script>`;
  return page({ path: '/next-express-entry-draw/', title: `Next Express Entry Draw: Frequency by Category (${latestDate.slice(0, 4)})`, description: 'When the next Express Entry draw may come: how often each program and category had a round in the last 12 months, days since the last one and its cut-off.', body, crumbs: [['Home', '/'], ['Express Entry draws', '/express-entry-draws/'], ['Next draw', '/next-express-entry-draw/']] });
}

// ---------- How to increase your CRS score ----------
function increasePage() {
  const fl = crs.core.firstLanguage.perAbilityByClb;
  const p = (L, col) => rowFor(fl, L).points[col];
  const langRows = [[7, 8], [8, 9], [9, 10]].map(([a, b]) => `<tr><td>CLB ${a} to CLB ${b} in all four</td><td class="n">+${(p(b, 1) - p(a, 1)) * 4}</td><td class="n">+${(p(b, 0) - p(a, 0)) * 4}</td></tr>`).join('');
  const cw = crs.core.canadianWork.byYears;
  const cwRows = [1, 2, 3, 4, 5].map((y) => `<tr><td>${y - 1 === 0 ? 'None' : `${y - 1} year${y - 1 > 1 ? 's' : ''}`} to ${y} year${y > 1 ? 's' : ''}${y === 5 ? ' or more' : ''}</td><td class="n">+${cw[y][1] - cw[y - 1][1]}</td><td class="n">+${cw[y][0] - cw[y - 1][0]}</td></tr>`).join('');
  const ed = crs.core.education.levels;
  const fr = crs.additional.french;
  const te = crs.transferability.education.withLanguage;
  const body = `
<section class="intro">
  <h1>How to Increase Your CRS Score: Every Lever, in Points</h1>
  <p class="lede">The ways to raise a Comprehensive Ranking System score, with the exact points each one adds under IRCC's current criteria. Run your own profile through the <a href="/">CRS calculator</a>: its "How your score could change" panel applies these to your answers.</p>
  <p class="meta"><span>Rules checked ${longDate(SITE.checked)}</span><span>Source: <a href="${crs.source}" rel="noopener">IRCC CRS criteria</a>, modified ${longDate(crs.sourceModified)}</span></p>
</section>
<article class="prose">
<h2>1. Language test results</h2>
<p>Language is usually the fastest lever, because one better test result adds points in two places: the core language points and skill transferability.</p>
<div class="table-scroll"><table><thead><tr><th>First official language</th><th class="n">Core points, single</th><th class="n">With a partner who counts</th></tr></thead><tbody>${langRows}</tbody></table></div>
<p>Reaching CLB 9 in all four abilities also doubles the transferability rates: education with language goes from ${te.twoOrMoreOrHigher[0]} to ${te.twoOrMoreOrHigher[1]} points for two or more credentials, a master's or a PhD, and foreign work experience with language from ${crs.transferability.foreignWork.withLanguage.threePlus[0]} to ${crs.transferability.foreignWork.withLanguage.threePlus[1]} for three years or more. Each of those two blocks is capped at 50 and transferability at ${crs.transferability.max} in total. Check which scores you need on the <a href="/clb-9/">CLB 9</a> page.</p>

<h2>2. French</h2>
<p>NCLC ${fr.minNclc} or higher in all four French abilities adds ${fr.withEnglishClb5} additional points if you also have CLB 5 or higher in all four English abilities, or ${fr.withWeakOrNoEnglish} if you do not. French as a second official language adds up to ${crs.core.secondLanguage.max[1]} more points (${crs.core.secondLanguage.max[0]} with a partner who counts). It also makes you eligible for French-language proficiency rounds, which have had some of the lowest cut-offs; see the <a href="/express-entry-draws/french/">French draws</a> and the scores for <a href="/nclc-7/">NCLC 7</a>.</p>

<h2>3. Canadian work experience</h2>
<div class="table-scroll"><table><thead><tr><th>Skilled work in Canada</th><th class="n">Core points, single</th><th class="n">With a partner who counts</th></tr></thead><tbody>${cwRows}</tbody></table></div>
<p>Canadian experience also combines with education and with foreign work experience in skill transferability, up to the same caps of 50 per block and 100 in total. Only skilled work counts: TEER 0, 1, 2 or 3.</p>

<h2>4. Education</h2>
<p>Each level of education has its own points. Two of the steps people miss: a second post-secondary credential, when one of them is a program of three years or more, scores ${ed.twoOrMore[1]} instead of ${ed.bachelor[1]} for a bachelor's alone (single applicant); and a credential from outside Canada only counts with an Educational Credential Assessment (ECA). A Canadian post-secondary credential adds ${crs.additional.canadianEducation.oneOrTwoYears} additional points for one or two years of study, or ${crs.additional.canadianEducation.threePlusYears} for three years or more.</p>

<h2>5. Provincial nomination</h2>
<p>A nomination from a province or territory through an Express Entry stream adds ${crs.additional.provincialNomination} points, which is why Provincial Nominee Program rounds have cut-offs above 600. See the <a href="/express-entry-draws/pnp/">PNP draws</a>.</p>

<h2>6. Your partner</h2>
<p>If your partner comes with you and is not a Canadian citizen or permanent resident, up to ${crs.spouse.max} points come from their education (up to ${crs.spouse.education.max}), language (up to ${crs.spouse.language.max}) and Canadian work experience (up to ${crs.spouse.canadianWork.max}), while your own core maximum is lower. Couples can compare the score with either of them as the principal applicant in the calculator.</p>

<h2>7. Other points</h2>
<p>A brother or sister in Canada who is 18 or older and a citizen or permanent resident adds ${crs.additional.sibling} points. A certificate of qualification in a trade from a Canadian province or territory adds up to ${crs.transferability.certificate.max} in skill transferability, with CLB 5 or higher.</p>

<h2>What no longer works</h2>
<p>Job offers stopped adding CRS points on March 25, 2025. Age points cannot be raised and fall each year from age 30; see <a href="/crs-age-points/">CRS points by age</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${crs.source}" rel="noopener">Comprehensive Ranking System (CRS) criteria</a>, IRCC, modified ${longDate(crs.sourceModified)}</li></ul>
</article>`;
  return page({ path: '/how-to-increase-crs-score/', title: 'How to Increase Your CRS Score: Every Lever, in Points (2026)', description: 'Ways to raise your Express Entry CRS score with the exact points each adds: language, French, Canadian work, education, nomination, partner and more.', body, crumbs: [['Home', '/'], ['How to increase your CRS score', '/how-to-increase-crs-score/']] });
}

// ---------- CRS points by age ----------
function agePage() {
  const ages = Object.entries(crs.core.age.byAge);
  const rows = ages.map(([a, [w, s]], i) => {
    const prev = i ? ages[i - 1][1] : null;
    const d = prev ? s - prev[1] : null;
    return `<tr><td>${a === '17' ? '17 or younger' : a === '45' ? '45 or older' : a}</td><td class="n">${s}</td><td class="n">${w}</td><td class="n">${d === null || d === 0 ? '' : d > 0 ? `+${d}` : d}</td></tr>`;
  }).join('');
  const s = (a) => crs.core.age.byAge[a][1];
  const body = `
<section class="intro">
  <h1>CRS Points by Age: Express Entry Age Points Year by Year</h1>
  <p class="lede">How many Comprehensive Ranking System points each age gives, for single applicants and for applicants whose partner comes with them, and how many you lose with each birthday.</p>
  <p class="meta"><span>Rules checked ${longDate(SITE.checked)}</span><span>Source: <a href="${crs.source}" rel="noopener">IRCC CRS criteria</a>, modified ${longDate(crs.sourceModified)}</span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Maximum, single</div><div class="v">${crs.core.age.max[1]}</div><div class="small">ages 20 to 29</div></div>
  <div class="card"><div class="k">At 35, single</div><div class="v">${s('35')}</div></div>
  <div class="card"><div class="k">At 40, single</div><div class="v">${s('40')}</div></div>
  <div class="card"><div class="k">From 45</div><div class="v">0</div></div>
</div>
<article class="prose">
<h2>Age points table</h2>
<div class="table-scroll"><table><thead><tr><th>Age</th><th class="n">Single</th><th class="n">With partner</th><th class="n">Change, single</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>How to read it</h2>
<p>The full ${crs.core.age.max[1]} points (${crs.core.age.max[0]} with a partner who counts) go to applicants aged 20 to 29. From 30 the points fall every year: ${s('29') - s('34')} points lost between 29 and 34, ${s('34') - s('39')} between 34 and 39, and ${s('39') - s('44')} between 39 and 44. The steepest yearly drops come after 40. From 45 the criteria give 0 age points.</p>
<p>Age only counts in the core part of the score. It does not affect skill transferability or the additional points, so language, Canadian experience, French or a nomination can make up for it; see <a href="/how-to-increase-crs-score/">how to increase your CRS score</a>. Enter your age in the <a href="/">CRS calculator</a> to see your full score.</p>
<h2>Sources</h2>
<ul><li><a href="${crs.source}" rel="noopener">Comprehensive Ranking System (CRS) criteria</a>, IRCC, modified ${longDate(crs.sourceModified)}</li></ul>
</article>`;
  return page({ path: '/crs-age-points/', title: 'CRS Points by Age: Express Entry Age Points Table (2026)', description: 'Express Entry CRS age points for every age from 17 to 45, single or with a partner, and how many points each birthday costs after 29.', body, crumbs: [['Home', '/'], ['CRS points by age', '/crs-age-points/']] });
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
<li>The CRS calculator is tested against IRCC's own calculator. On 14 October 2026 we ran 1,000 random profiles through both: 917 matched point for point. The other 83 all had a TCF Canada result at NCLC 4, which IRCC's calculator scores as 0 while the published criteria give 6 points per ability; with that one difference applied, all 1,000 matched. We follow the published criteria and the calculator tells you when the two differ.</li>
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
const written = [];
const out = (p, html, lastmod = SITE.checked) => { const f = join(DIST, p, 'index.html'); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); written.push([p ? `/${p}/` : '/', lastmod]); };
out('', home());
out('clb-converter', clbPage());
out('express-entry-draws', drawsPage(), latestDate);
out('crs-score-distribution', distributionPage(), draws.distribution.asOfIso || latestDate);
out('express-entry-categories', categoriesPage(), cats.checked);
for (const [slug, fn] of [['celpip-to-ielts', convertPage], ['next-express-entry-draw', nextDrawPage], ['how-to-increase-crs-score', increasePage], ['crs-age-points', agePage]]) if (isLive(`/${slug}/`)) out(slug, fn(), slug === 'next-express-entry-draw' ? latestDate : (schedule.pages[`/${slug}/`] || SITE.checked));
for (const id of Object.keys(CHART_PAGES)) if (isLive(`/${CHART_PAGES[id].slug}/`)) out(CHART_PAGES[id].slug, scoreChartPage(id), schedule.pages[`/${CHART_PAGES[id].slug}/`] || SITE.checked);
for (const c of catPagesList()) out(`express-entry-draws/${CAT_PAGES[c.id].slug}`, categoryPage(c), draws.rounds.find((r) => r.category === c.id).date);
for (const l of LEVELS) { out(`clb-${l}`, levelPage('en', l)); out(`nclc-${l}`, levelPage('fr', l)); }
out('about', simple('/about/', 'About CRS Planner and How We Check the Rules', 'Who runs CRS Planner, where the rules come from and how the calculators are tested against IRCC.', 'About CRS Planner', aboutHtml));
out('privacy', simple('/privacy/', 'Privacy | CRS Planner', 'What CRS Planner stores in your browser, what it does not collect, and who processes connection data. Contact for data requests.', 'Privacy', privacyHtml));
out('terms', simple('/terms/', 'Terms of Use | CRS Planner', 'Terms of use and disclaimer for CRS Planner: estimates based on IRCC rules, not immigration or legal advice.', 'Terms of use', termsHtml));
out('changelog', changelogPage());
writeFileSync(join(DIST, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#111827"/><text x="16" y="21" font-family="monospace" font-size="12" font-weight="700" text-anchor="middle" fill="#ff6b6b">CRS</text></svg>');
cpSync(join(ROOT, 'src/css'), join(DIST, 'css'), { recursive: true });
cpSync(join(ROOT, 'src/js'), join(DIST, 'js'), { recursive: true });
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${written.map(([u, d]) => `<url><loc>${SITE.url}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(DIST, '404.html'), page({ path: '/404', title: 'Page not found | CRS Planner', description: 'Page not found.', body: '<section class="intro"><h1>Page not found</h1><p>Try the <a href="/">CRS calculator</a> or the <a href="/express-entry-draws/">draws history</a>.</p></section>' }));
cpSync(join(ROOT, 'extras/_worker.js'), join(DIST, '_worker.js'));
console.log(`Built ${written.length} pages into dist/`);
