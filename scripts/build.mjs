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
const funds = read('data/rules/proof-of-funds.json');
const citz = read('data/rules/citizenship.json');
const resid = read('data/rules/residency.json');
const owp = read('data/rules/oinp-owp.json');
const oinpDraws = read('data/provinces/oinp-draws.json');
const mpnp = read('data/rules/mpnp.json');
const mpnpDraws = read('data/provinces/mpnp-draws.json');
const sinp = read('data/rules/sinp.json');
const sinpDraws = read('data/provinces/sinp-draws.json');
const aaip = read('data/rules/aaip.json');
const aaipDraws = read('data/provinces/aaip-draws.json');
const fsw = read('data/rules/fsw.json');
const cec = read('data/rules/cec.json');
const sv = read('data/rules/super-visa.json');
const pgp = read('data/rules/pgp-income.json');
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
  <h1>CRS Score Calculator for Express Entry (2026)</h1>
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
  return page({ path: '/', title: 'CRS Calculator 2026: Check Your Express Entry CRS Score', description: 'Free CRS calculator for Express Entry. See every point of your score, what would raise it, and how it compares with each draw category in the last 12 months.', body, scripts, jsonld });
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
  <h1>Express Entry Draws: Latest Draw and Every Round Since 2015</h1>
  <p class="lede">All ${fmt(draws.rounds.length)} rounds of invitations with their cut-off scores and invitations, filterable by program and category, plus the current score distribution of the pool.</p>
  <p class="meta"><span>Updated daily from IRCC data</span><span>Latest round: #${esc(L.n)} on ${longDate(L.date)}</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>

<div class="cards">
  <div class="card"><div class="k">Latest round</div><div class="v">#${esc(L.n)}</div><div class="small">${longDate(L.date)}</div></div>
  <div class="card"><div class="k">Type</div><div style="font-weight:600">${esc(L.name)}</div></div>
  <div class="card"><div class="k">Invitations</div><div class="v">${fmt(L.size)}</div></div>
  <div class="card"><div class="k">Lowest score invited</div><div class="v">${fmt(L.crs)}</div></div>
</div>
<h2>Latest Express Entry draw</h2>
<p>${(() => { const same = thisYear.filter((r) => r.category === L.category); const ord = same.length - same.findIndex((r) => r.n === L.n); const sfx = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); return `Round #${esc(L.n)} on ${longDate(L.date)} was the ${ord}${sfx(ord)} ${esc(catLabel[L.category] || L.name)} round of ${year}. IRCC invited ${fmt(L.size)} candidates, and the lowest score invited was ${fmt(L.crs)}.${L.tieBreak ? ` Among candidates with exactly ${fmt(L.crs)} points, only profiles submitted before ${esc(L.tieBreak)} were invited (the tie-breaking rule).` : ''}`; })()} ${fmt(thisYear.length)} rounds so far in ${year}, with ${fmt(thisYear.reduce((s, r) => s + (r.size || 0), 0))} invitations in total.${L.category === 'pnp' ? ' Provincial Nominee Program cut-offs include the 600 points of the nomination.' : ''}</p>

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
  return page({ path: '/express-entry-draws/', title: `Express Entry Draws ${year}: Latest Draw, Cut-offs and History`, description: `Latest Express Entry draw: #${L.n} on ${longDate(L.date)}, ${fmt(L.size)} invitations, cut-off ${L.crs}. Every draw since 2015 (${draws.rounds.length} rounds), filterable by CEC, PNP, French and other categories, with cut-off trends and the current CRS distribution.`, body, scripts, jsonld, crumbs: [['Home', '/'], ['Express Entry draws', '/express-entry-draws/']] });
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
  celpip: { slug: 'celpip-score-chart', short: 'CELPIP', title: 'CELPIP Score Chart and CLB Calculator for Express Entry (2026)', h1: 'CELPIP Score Chart for Express Entry', extra: 'For CLB 4 to 10, each CELPIP-General level is the same number as the CLB level: a 9 in an ability is CLB 9. Levels 11 and 12 count as CLB 10. CELPIP-General LS, the speaking and listening version, is not accepted for Express Entry.' },
  ielts: { slug: 'ielts-score-chart', short: 'IELTS', title: 'IELTS to CLB Chart and Calculator for Canada PR (2026)', h1: 'IELTS to CLB: Score Chart for Canada PR (Express Entry)', extra: 'Only IELTS General Training is accepted for Express Entry; IELTS Academic is not, and neither are IELTS One Skill Retake results. Listening asks for more than the other abilities from CLB 8 up: CLB 9 is 8.0 in listening but 7.0 in speaking, reading and writing.' },
  tef: { slug: 'tef-canada-score-chart', short: 'TEF Canada', title: 'TEF Canada Score Chart: TEF to CLB and NCLC Calculator (2026)', h1: 'TEF Canada Score Chart for Express Entry', extra: 'Each ability has its own scale: speaking and writing are scored out of 450, listening out of 360 and reading out of 300. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  tcf: { slug: 'tcf-canada-score-chart', short: 'TCF Canada', title: 'TCF Canada Score Chart: TCF to CLB and NCLC Calculator (2026)', h1: 'TCF Canada Score Chart for Express Entry', extra: 'Speaking and writing are scored out of 20; listening and reading out of 699. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  pte: { slug: 'pte-core-score-chart', short: 'PTE Core', title: 'PTE Core Score Chart and PTE to CLB Calculator (2026)', h1: 'PTE Core Score Chart for Express Entry', extra: 'Only PTE Core is accepted for Express Entry; PTE Academic results are not. Each ability has its own thresholds, so the same score can give different CLB levels in speaking and in listening.' },
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

// ---------- Physical presence for citizenship ----------
function presencePage() {
  const c = citz;
  const body = `
<section class="intro">
  <h1>Physical Presence Calculator for Canadian Citizenship</h1>
  <p class="lede">Count your days in Canada for a citizenship application: ${fmt(c.requiredDays)} days in the ${c.periodYears} years before you apply, with half-day credit for time before you became a permanent resident. Add your trips and see whether you meet the minimum, and if not, the first date you would.</p>
  <p class="meta"><span>Rules checked ${longDate(c.checked)}</span><span>Source: <a href="${c.source}" rel="noopener">IRCC citizenship eligibility</a>, modified ${longDate(c.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="pp-form" novalidate>
  <fieldset><legend>Your dates</legend>
    <div class="row">
      <div class="field"><label for="apply">Date you would sign the application</label><input type="date" id="apply" name="apply"></div>
      <div class="field"><label for="pr">Date you became a permanent resident</label><input type="date" id="pr" name="pr"></div>
    </div>
    <div class="field"><label for="temp">Date you first arrived with temporary status (optional)</label><input type="date" id="temp" name="temp">
      <span class="hint">As a visitor, student, worker or protected person, before becoming a permanent resident. Leave it empty if you became a permanent resident on arrival.</span></div>
  </fieldset>
  <fieldset><legend>Trips outside Canada</legend>
    <div id="trips"></div>
    <button type="button" id="add-trip">Add a trip</button>
    <p class="hint">The day you leave and the day you come back both count as days in Canada, as in IRCC's own calculator.</p>
  </fieldset>
</form>
<aside class="results" aria-label="Your physical presence" id="pp-out" aria-live="polite"></aside>
</div>
<article class="prose">
<h2>The rules</h2>
<ul>
<li>You need at least ${fmt(c.requiredDays)} days (3 years) of physical presence in the ${c.periodYears} years immediately before the date you sign your application. For an application signed on April 1, 2018, IRCC's own example uses April 1, 2013 to March 31, 2018.</li>
<li>Each day in Canada as a permanent resident counts as one day.</li>
<li>Each day in Canada as a temporary resident or protected person before you became a permanent resident counts as half a day, up to ${c.temporaryMaxCredit} days of credit, which is ${c.temporaryMaxCredit * 2} calendar days. That is why at least ${c.requiredDays - c.temporaryMaxCredit} days must be as a permanent resident.</li>
<li>Time as a protected person counts only from the approval of your claim or PRRA until the day before you became a permanent resident. Time in prison, on parole or on probation, and time waiting for a decision on a refugee claim, does not count. The calculator does not subtract these periods; leave them out of your dates.</li>
<li>Time outside Canada as a Crown servant, or as the family member of one, counts as time in Canada.</li>
</ul>
<p>Physical presence is one of the requirements. Adults also need to have filed income taxes when required, prove English or French skills and pass the citizenship test (ages 18 to 54), and not be under a prohibition. Your answers are saved only in your browser.</p>
${isLive('/pr-residency-obligation-calculator/') ? '<p>To check the 730-day rule for keeping permanent resident status, use the <a href="/pr-residency-obligation-calculator/">PR residency obligation calculator</a>.</p>' : ''}
<p class="callout">This is an estimate. Before you apply, count your days with IRCC's official physical presence calculator; IRCC encourages applying with more than the minimum to allow for any miscalculation.</p>
<h2>Sources</h2>
<ul><li><a href="${c.source}" rel="noopener">Canadian citizenship: who can apply</a>, IRCC, modified ${longDate(c.sourceModified)}</li><li><a href="${c.calculatorFaq}" rel="noopener">Physical presence calculator: frequently asked questions</a>, IRCC</li></ul>
</article>`;
  const scripts = `${jsonScript('presence-rules', c)}<script type="module" src="/js/presence.js"></script>`;
  return page({ path: '/physical-presence-calculator/', title: 'Physical Presence Calculator for Canadian Citizenship (2026)', description: 'Count your days in Canada for citizenship: 1,095 days in 5 years, half-day credit before permanent residence, trips subtracted, and the earliest date you can apply.', body, scripts, crumbs: [['Home', '/'], ['Physical presence calculator', '/physical-presence-calculator/']] });
}

// ---------- Proof of funds ----------
function fundsPage() {
  const f = funds;
  const rows = Object.entries(f.amounts).map(([n, v]) => `<tr><td>${n}</td><td class="n">$${fmt(v)}</td></tr>`).join('') + `<tr><td>Each additional family member</td><td class="n">+$${fmt(f.eachAdditional)}</td></tr>`;
  const body = `
<section class="intro">
  <h1>Proof of Funds for Express Entry: How Much Money You Need</h1>
  <p class="lede">The minimum settlement funds IRCC asks for, by family size, who has to show them and what counts as proof. Enter your family size to see your amount.</p>
  <p class="meta"><span>Amounts updated by IRCC on ${longDate(f.tableUpdated)}</span><span>Checked ${longDate(f.checked)}</span><span>Source: <a href="${f.source}" rel="noopener">IRCC proof of funds</a></span></p>
</section>
<div class="tool">
<form id="pof-form" novalidate>
  <fieldset><legend>Your family</legend>
    <div class="field"><label for="size">Number of family members</label><input type="number" id="size" name="size" min="1" max="20" step="1" value="1" inputmode="numeric">
      <span class="hint">Count yourself, your spouse or common-law partner, your dependent children and your partner's dependent children, even if they are Canadian citizens or permanent residents or are not coming with you.</span></div>
  </fieldset>
</form>
<aside class="results" aria-label="Funds you need">
  <div class="total"><span><span class="score" id="pof-out">$${fmt(f.amounts[1])}</span> <span class="of">CAD</span></span><span class="small">Minimum funds</span></div>
  <p class="small">If you have more, IRCC asks you to list the full amount in your profile or application.</p>
</aside>
</div>
<article class="prose">
<h2>Amounts by family size</h2>
<p>IRCC sets these at ${esc(f.basis)}. The table in force was updated on ${longDate(f.tableUpdated)}.</p>
<div class="table-scroll"><table><thead><tr><th>Family members</th><th class="n">Funds you need (CAD)</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Who needs proof of funds</h2>
<p>Candidates in the Federal Skilled Worker Program and the Federal Skilled Trades Program. You do not need it if you are invited under the Canadian Experience Class, or if you are authorized to work in Canada and have a valid job offer, even under the Federal Skilled Worker or Federal Skilled Trades programs. The profile currently asks every applicant for a proof of funds document; if you are exempt, you upload a letter explaining why.</p>
<p>Because the system can find you eligible for more than one program and you do not know in advance which one you will be invited under, IRCC asks you to keep the funds in your profile up to date.</p>
<h2>What counts as proof</h2>
<ul>
<li>Official letters from each bank or financial institution where you have an account, on its letterhead, with its contact details, your name and your outstanding debts such as credit cards and loans.</li>
<li>For each account: the account number, the date it was opened, the current balance and the average balance for the past 6 months.</li>
<li>The money has to be available to you when you apply and when the permanent resident visa is issued, and you must be able to access it legally in Canada.</li>
<li>Equity in property does not count, and the money cannot be borrowed from another person.</li>
<li>If your spouse comes with you, money in a joint account counts. Money in an account only in your spouse's name may count if you prove you have access to it.</li>
</ul>
<p>Check whether you are eligible for the Canadian Experience Class or another program and where your score stands with the <a href="/">CRS calculator</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${f.source}" rel="noopener">Express Entry: Proof of funds</a>, IRCC, page modified ${longDate(f.sourceModified)}, amounts updated ${longDate(f.tableUpdated)}</li></ul>
</article>
<script>{const A=${JSON.stringify(f.amounts)},X=${f.eachAdditional},i=document.getElementById('size'),o=document.getElementById('pof-out');const u=()=>{const n=Math.max(1,Math.floor(Number(i.value)||1));const v=n<=7?A[n]:A[7]+(n-7)*X;o.textContent='$'+v.toLocaleString('en-CA');};i.addEventListener('input',u);u();}</script>`;
  return page({ path: '/proof-of-funds-express-entry/', title: 'Proof of Funds for Express Entry: Amount by Family Size', description: `Express Entry proof of funds: $${fmt(f.amounts[1])} for one person, $${fmt(f.amounts[4])} for a family of four. Full table, who is exempt and what counts as proof.`, body, crumbs: [['Home', '/'], ['Proof of funds', '/proof-of-funds-express-entry/']] });
}

// ---------- PR residency obligation ----------
function residencyPage() {
  const r = resid;
  const body = `
<section class="intro">
  <h1>PR Residency Obligation Calculator: 730 Days in 5 Years</h1>
  <p class="lede">Check whether you meet the residency obligation to keep your permanent resident status, for example before renewing your PR card: at least ${r.requiredDays} days in a five-year period, counting your trips and the time abroad that counts as time in Canada.</p>
  <p class="meta"><span>Rules checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC PR status</a>, modified ${longDate(r.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="ro-form" novalidate>
  <fieldset><legend>Your dates</legend>
    <div class="row">
      <div class="field"><label for="pr">Date you became a permanent resident</label><input type="date" id="pr" name="pr"></div>
      <div class="field"><label for="check">Date to check</label><input type="date" id="check" name="check"><span class="hint">Today, or the date you plan to apply for a PR card or come back to Canada.</span></div>
    </div>
  </fieldset>
  <fieldset><legend>Trips outside Canada</legend>
    <div id="trips"></div>
    <button type="button" id="add-trip">Add a trip</button>
    <p class="hint">The day you leave and the day you come back are counted as days in Canada, the same way IRCC's citizenship calculator counts them.</p>
  </fieldset>
</form>
<aside class="results" aria-label="Your residency days" id="ro-out" aria-live="polite"></aside>
</div>
<article class="prose">
<h2>The rule</h2>
<p>To keep your status, you must have been in Canada for at least ${r.requiredDays} days during a five-year period. The days do not need to be continuous. Which five years are checked depends on how long you have been a permanent resident:</p>
<ul>
<li>Less than five years: you must show that you will be able to reach ${r.requiredDays} days in the five years right after you became a permanent resident.</li>
<li>Five years or more: you must show that you met it in the five years right before you are examined, for example when you apply for a PR card or a permanent resident travel document.</li>
</ul>
<h2>Time abroad that counts</h2>
<p>Days outside Canada count toward the ${r.requiredDays} if, during that time, you were:</p>
<ul>
<li>working full time outside Canada for a Canadian business or organization, or for the federal, provincial or territorial government;</li>
<li>travelling with your spouse or common-law partner who is a Canadian citizen;</li>
<li>travelling with your spouse or common-law partner who is a permanent resident working full time outside Canada for a Canadian business or a Canadian government;</li>
<li>a dependent child travelling with a parent who is a Canadian citizen, or a permanent resident working full time outside Canada in the same way.</li>
</ul>
<p>Tick "This time abroad counts" on those trips. Other conditions set by regulation can also apply; check them with IRCC if you are unsure.</p>
<h2>If you are short</h2>
<p>You do not lose permanent resident status when your PR card expires, and not automatically when you fall below ${r.requiredDays} days. IRCC lists the cases where status is lost, such as an officer determining that you are no longer a permanent resident after an inquiry or a PR travel document appeal, renouncing it voluntarily, or a removal order coming into force. An officer can also decide that humanitarian and compassionate reasons justify keeping your status. If you are short, get advice before you travel or apply.</p>
<p class="callout">This is an estimate based on the dates you enter. It is not a decision on your status.</p>
<p>Planning citizenship next? Use the <a href="/physical-presence-calculator/">physical presence calculator</a>: citizenship needs 1,095 days in five years and counts time differently.</p>
<h2>Sources</h2>
<ul>
<li><a href="${r.source}" rel="noopener">Understand permanent resident status</a>, IRCC, modified ${longDate(r.sourceModified)}</li>
<li><a href="${r.timeAbroad}" rel="noopener">Can my time abroad count toward my permanent resident status?</a>, IRCC Help Centre</li>
<li><a href="${r.law}" rel="noopener">Immigration and Refugee Protection Act, section 28</a>, current to ${longDate(r.lawCurrentTo)}</li>
</ul>
</article>`;
  const scripts = `${jsonScript('residency-rules', r)}<script type="module" src="/js/residency.js"></script>`;
  return page({ path: '/pr-residency-obligation-calculator/', title: 'PR Residency Obligation Calculator: 730 Days in 5 Years', description: 'Check the 730-day residency obligation for Canadian permanent residents before renewing your PR card: your five-year period, trips, and time abroad that counts.', body, scripts, crumbs: [['Home', '/'], ['PR residency obligation', '/pr-residency-obligation-calculator/']] });
}

// ---------- Ontario (OINP) ----------
const OINP_STREAM_ORDER = ['owp', 'foreign-worker', 'international-student', 'in-demand', 'masters', 'phd', 'entrepreneur'];
function oinpCalcPage() {
  const r = owp;
  const max = r.factors.reduce((s, f) => s + Math.max(...f.options.map((o) => o[1])), 0);
  const groups = [...new Set(r.factors.map((f) => f.group))];
  const fields = groups.map((g) => `<fieldset><legend>${esc(g)}</legend>${r.factors.filter((f) => f.group === g).map((f) => `<div class="field"><label for="${f.id}">${esc(f.label)}</label><select id="${f.id}" name="${f.id}">${f.options.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('')}</select></div>`).join('')}</fieldset>`).join('');
  const tables = r.factors.map((f) => `<h3>${esc(f.label)}</h3><div class="table-scroll"><table><tbody>${f.options.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const owpRounds = oinpDraws.rounds.filter((x) => x.stream === 'owp');
  const body = `
<section class="intro">
  <h1>OINP Points Calculator: Ontario Workforce Priority Stream (2026)</h1>
  <p class="lede">Score your expression of interest for the Ontario Immigrant Nominee Program under the new Ontario Workforce Priority stream, the only OINP stream open since July 2026. Every factor and point value comes from Ontario's stream page.</p>
  <p class="meta"><span>Scoring checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">Ontario Workforce Priority stream</a>, updated ${longDate(r.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="oinp-form" novalidate>
  <fieldset><legend>Shortcut</legend>
    <div class="field"><label for="noc">NOC 2021 code of the job offer (optional)</label><input type="text" id="noc" name="noc" inputmode="numeric" maxlength="5" placeholder="e.g. 21231"><span class="hint" id="noc-hint">The first digit is the broad occupational category and the second the TEER category; we set both for you.</span></div>
    <div class="field check"><input type="checkbox" id="physician" name="physician"><label for="physician">I am applying as a self-employed physician (no job offer; the hourly wage factor does not apply)</label></div>
  </fieldset>
  ${fields}
</form>
<aside class="results" aria-label="Your OINP score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${max}</span></span><span class="small">Expression of interest score</span></div>
  <details class="breakdown" open><summary>Points by factor</summary><div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div></details>
  <p class="small">${owpRounds.length ? `Ontario has published ${owpRounds.length} Ontario Workforce Priority rounds; see the <a href="/oinp-draws/">OINP draws</a>.` : `Ontario had not published any invitation round for this stream when its invitations page was last updated (${longDate(oinpDraws.sourceUpdated)}), so there is no cut-off to compare with yet. Scores from the closed streams used other grids and are not comparable.`}</p>
</aside>
</div>
<article class="prose">
<h2>What changed in 2026</h2>
<p>Ontario replaced its Employer Job Offer, Masters Graduate and PhD Graduate streams with a single Ontario Workforce Priority stream. Its webpages were published on July 20, 2026 and the expression of interest portal opened on August 4, 2026. On October 5, 2026 Ontario changed the earnings factor so that $80,000 or more in a single year gives 10 points; this calculator includes that change. Calculators built for the old streams use a different grid.</p>
<h2>How the score works</h2>
<p>You register an expression of interest after your employer submits a job offer in Ontario's Employer Portal (self-employed physicians contact the OINP instead). Ontario scores it on the factors below and invites candidates from the pool. The score is not the same as the stream requirements: you also need to meet the work experience, language and education criteria for your job offer's TEER category, and prove every factor you claimed if you are invited.</p>
<p>Language points use the lowest of your four CLB levels, from your better test if you have both English and French; check your levels with the <a href="/clb-converter/">CLB converter</a>. A nomination that goes through Express Entry adds 600 CRS points; see the <a href="/">CRS calculator</a>.</p>
<h2>Scoring grid</h2>
${tables}
<h2>Regions</h2>
<ul>${Object.entries(r.regions).map(([k, v]) => `<li><strong>${esc(k)}</strong>: ${esc(v)}.</li>`).join('')}</ul>
<p>Past invitation rounds of the closed streams are on the <a href="/oinp-draws/">OINP draws</a> page.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Ontario Workforce Priority stream</a>, Government of Ontario, updated ${longDate(r.sourceModified)}</li><li><a href="${r.updates}" rel="noopener">2026 Ontario Immigrant Nominee Program updates</a>, Government of Ontario</li></ul>
</article>`;
  const scripts = `${jsonScript('oinp-rules', { factors: r.factors })}<script type="module" src="/js/oinp.js"></script>`;
  return page({ path: '/oinp-points-calculator/', title: 'OINP Points Calculator 2026: Ontario Workforce Priority Stream', description: `Calculate your OINP expression of interest score for the new Ontario Workforce Priority stream: all ${r.factors.length} factors, ${max} points maximum, with the October 2026 earnings update.`, body, scripts, crumbs: [['Home', '/'], ['OINP points calculator', '/oinp-points-calculator/']] });
}

function oinpDrawsPage() {
  const d = oinpDraws;
  const streams = OINP_STREAM_ORDER.filter((s) => d.rounds.some((x) => x.stream === s));
  const name = (s) => d.rounds.find((x) => x.stream === s).streamName;
  const stat = streams.map((s) => {
    const rs = d.rounds.filter((x) => x.stream === s);
    const yrs = [...new Set(rs.map((x) => x.date.slice(0, 4)))];
    return `<tr><td>${esc(name(s))}</td><td class="n">${rs.length}</td><td class="n">${fmt(rs.reduce((a, x) => a + (x.invitations || 0), 0))}</td><td>${rs[0].date}</td><td class="n">${yrs.at(-1)}–${yrs[0]}</td></tr>`;
  }).join('');
  const rows = d.rounds.map((x) => `<tr data-s="${x.stream}"><td>${x.date}</td><td>${esc(x.streamName)}</td><td class="n">${fmt(x.invitations)}</td><td class="n">${esc(x.scoreText || '')}</td><td>${esc(x.notes || '')}</td></tr>`).join('');
  const chips = `<button type="button" data-s="all" aria-pressed="true">All (${d.rounds.length})</button>` + streams.map((s) => `<button type="button" data-s="${s}" aria-pressed="false">${esc(name(s).replace('Employer Job Offer: ', ''))}</button>`).join('');
  const last = d.rounds[0];
  const owpN = d.rounds.filter((x) => x.stream === 'owp').length;
  const y = last.date.slice(0, 4);
  const yr = d.rounds.filter((x) => x.date.startsWith(y));
  const body = `
<section class="intro">
  <h1>OINP Draws: Ontario PNP Invitations and Score History</h1>
  <p class="lede">Every invitation round Ontario has published for the Ontario Immigrant Nominee Program since 2021: ${fmt(d.rounds.length)} rounds by stream, with invitations, minimum scores and targets.</p>
  <p class="meta"><span>Ontario's page updated ${longDate(d.sourceUpdated)}</span><span>Checked ${longDate(d.fetchedAt)}</span><span>Source: <a href="${d.source}" rel="noopener">Invitations to apply to the OINP</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest round published</div><div class="v" style="font-size:1.2rem">${longDate(last.date)}</div><div class="small">${esc(last.streamName)}, ${fmt(last.invitations)} invitations</div></div>
  <div class="card"><div class="k">Rounds in ${y}</div><div class="v">${yr.length}</div><div class="small">${fmt(yr.reduce((a, x) => a + (x.invitations || 0), 0))} invitations</div></div>
  <div class="card"><div class="k">Ontario Workforce Priority rounds</div><div class="v">${owpN}</div><div class="small">${owpN ? 'published so far' : 'none published yet'}</div></div>
</div>
<p class="callout">${owpN ? '' : `Since July 2026 Ontario has one open stream, Ontario Workforce Priority, and has not published any invitation round for it yet. `}The rounds below are from streams that are now closed and used other scoring grids, so their minimum scores do not translate to the new stream. Score your profile with the <a href="/oinp-points-calculator/">OINP points calculator</a>.</p>
<h2>Rounds by stream</h2>
<div class="table-scroll"><table><thead><tr><th>Stream</th><th class="n">Rounds</th><th class="n">Invitations</th><th>Latest</th><th class="n">Years</th></tr></thead><tbody>${stat}</tbody></table></div>
<h2>All rounds</h2>
<div class="chips" id="chips" role="group" aria-label="Filter by stream">${chips}</div>
<div class="table-scroll"><table id="oinp-table"><thead><tr><th>Date</th><th>Stream</th><th class="n">Invitations</th><th class="n">Score</th><th>Target</th></tr></thead><tbody>${rows}</tbody></table></div>
<article class="prose">
<h2>How to read it</h2>
<p>Most rounds since 2025 were targeted: by region, by occupation group (health, early childhood education, skilled trades, mining) or for French-speaking candidates. A round's minimum score only applies to the candidates it targeted, and the Entrepreneur stream gives a score range instead of a minimum. "N/A" means Ontario did not publish a score for that round.</p>
${d.dropped.length ? `<p class="small">Ontario's page lists ${d.dropped.length === 1 ? 'one row' : `${d.dropped.length} rows`} under a year it does not belong to that repeat${d.dropped.length === 1 ? 's' : ''} a row of another stream (${d.dropped.map((x) => `${x.date}, ${fmt(x.invitations)} invitations`).join('; ')}). We list it only once.</p>` : ''}
<p>Ontario nominations through Express Entry add 600 CRS points; federal rounds for nominees are on the <a href="/express-entry-draws/pnp/">PNP draws</a> page.</p>
<h2>Sources</h2>
<ul><li><a href="${d.source}" rel="noopener">Invitations to apply to the OINP</a>, Government of Ontario, updated ${longDate(d.sourceUpdated)}</li><li><a href="${owp.updates}" rel="noopener">2026 OINP updates</a>, Government of Ontario</li></ul>
</article>
<script>{const b=[...document.querySelectorAll('#chips button')],r=[...document.querySelectorAll('#oinp-table tbody tr')];b.forEach(x=>x.addEventListener('click',()=>{b.forEach(y=>y.setAttribute('aria-pressed',y===x));const s=x.dataset.s;r.forEach(t=>{t.hidden=s!=='all'&&t.dataset.s!==s;});}));}</script>`;
  return page({ path: '/oinp-draws/', title: `OINP Draws ${y}: Ontario PNP Invitations and Score History`, description: `All ${d.rounds.length} OINP invitation rounds since 2021 by stream, with minimum scores and targets, and the status of the new Ontario Workforce Priority stream.`, body, crumbs: [['Home', '/'], ['OINP draws', '/oinp-draws/']] });
}

// ---------- Manitoba (MPNP) ----------
function mpnpCalcPage() {
  const r = mpnp;
  const opt = (arr) => arr.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('');
  const optV = (arr) => `<option value="0">None of these</option>` + arr.map(([l, p]) => `<option value="${p}">${esc(l)} (${p})</option>`).join('');
  const ages = Array.from({ length: 33 }, (_, i) => 18 + i).map((a) => `<option value="${a}">${a === 50 ? '50 or older' : a}</option>`).join('');
  // Manitoba's page names IELTS, CELPIP, TEF and TCF as the tests behind the CLB levels.
  const enTests = Object.entries(lang.tests).filter(([id]) => ['ielts', 'celpip', 'tef', 'tcf'].includes(id)).map(([id, t]) => `<option value="${id}">${esc(t.name)}</option>`).join('');
  const ageRows = Object.entries(r.age).filter(([k]) => k !== 'max').map(([k, v]) => `<tr><td>${k === '50+' ? '50 or older' : k.replace('-', ' to ')}</td><td class="n">${v}</td></tr>`).join('');
  const t2 = (arr) => arr.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('');
  const recent = mpnpDraws.draws.slice(0, 12);
  const sw = recent.flatMap((d) => d.segments.filter((s) => s.minScore !== null).map((s) => ({ ...s, date: d.date, n: d.n })));
  const body = `
<section class="intro">
  <h1>MPNP Points Calculator: Manitoba EOI Ranking Score (2026)</h1>
  <p class="lede">Work out your Expression of Interest ranking score for the Manitoba Provincial Nominee Program, out of ${fmt(r.max)}, with every factor from Manitoba's official grid. It applies to the ${esc(r.applies)}.</p>
  <p class="meta"><span>Grid checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">MPNP Expression of Interest</a>, updated ${longDate(r.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="mpnp-form" novalidate>
  <fieldset><legend>Language (first official language)</legend>
    <div class="field"><label for="test">Test</label><select id="test" name="test">${enTests}</select></div>
    <div class="scores">${SK.map((s) => `<div class="field"><label for="${s}">${SKL[s]}</label><input type="number" inputmode="decimal" id="${s}" name="${s}"><span class="clb-tag" id="${s}-clb"></span></div>`).join('')}</div>
    <div class="field check" style="margin-top:12px"><input type="checkbox" id="second" name="second"><label for="second">I have a valid test in the other official language at CLB 5 or higher (+${r.language.secondOverallClb5})</label></div>
  </fieldset>
  <fieldset><legend>Age, experience and education</legend>
    <div class="row"><div class="field"><label for="age">Age when you submit the EOI</label><select id="age" name="age">${ages}</select></div>
    <div class="field"><label for="exp">Full years of work experience, last 5 years</label><select id="exp" name="exp">${opt(r.experience.options)}</select></div></div>
    <div class="field check"><input type="checkbox" id="licensed" name="licensed"><label for="licensed">Fully recognized by the Manitoba licensing body of my regulated profession or trade (+${r.experience.licensed})</label></div>
    <div class="field"><label for="edu">Highest completed education</label><select id="edu" name="edu">${opt(r.education.options)}</select></div>
  </fieldset>
  <fieldset><legend>Connection to Manitoba (adaptability)</legend>
    <div class="field"><label for="connection">Your strongest connection</label><select id="connection" name="connection">${optV(r.adaptability.connection)}</select></div>
    <div class="field"><label for="demand">Manitoba Demand</label><select id="demand" name="demand">${optV(r.adaptability.demand)}</select></div>
    <div class="field check"><input type="checkbox" id="regional" name="regional"><label for="regional">I plan to settle outside Winnipeg and have a connection to that region (+${r.adaptability.regional}, with a connection other than Manitoba Demand)</label></div>
    <p class="callout small" id="adapt-warn" hidden>Manitoba requires every candidate to have at least one connection to the province.</p>
  </fieldset>
  <fieldset><legend>Connections to other provinces (risk)</legend>
    <div class="field check"><input type="checkbox" id="riskWork" name="riskWork"><label for="riskWork">You or your spouse have work experience in another province (${r.risk.otherProvinceWork})</label></div>
    <div class="field check"><input type="checkbox" id="riskStudy" name="riskStudy"><label for="riskStudy">You or your spouse have studied in another province (${r.risk.otherProvinceStudy})</label></div>
  </fieldset>
</form>
<aside class="results" aria-label="Your MPNP score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${fmt(r.max)}</span></span><span class="small">EOI ranking score</span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
  <p class="small">${sw.length ? `Recent lowest scores invited: ${sw.slice(0, 4).map((s) => `${s.minScore} (${esc(s.group || 'draw')} , ${s.date})`.replace(' ,', ',')).join('; ')}. Many recent selections target occupations or strategic initiatives without a published score; see the <a href="/mpnp-draws/">MPNP draws</a>.` : 'See the <a href="/mpnp-draws/">MPNP draws</a>.'}</p>
</aside>
</div>
<article class="prose">
<h2>The ranking grid</h2>
<p>Manitoba ranks Expression of Interest profiles on six factors and invites the highest-scoring candidates with a Letter of Advice to Apply. The Business Investor Stream uses a separate process.</p>
<h3>Language</h3>
<p>Points for each of the four abilities of your first official language, by CLB level: ${r.language.firstPerBand.filter(([m]) => m > 0).map(([m, p]) => `CLB ${m}${m === 8 ? ' or higher' : ''}: ${p}`).join(', ')}, CLB 3 or lower: 0. A valid test in the other official language at CLB 5 or higher adds ${r.language.secondOverallClb5}. Maximum ${r.language.max}. Convert your scores with the <a href="/clb-converter/">CLB converter</a>.</p>
<h3>Age</h3><div class="table-scroll"><table><tbody>${ageRows}</tbody></table></div>
<h3>Work experience</h3><p>${esc(r.experience.note)}</p><div class="table-scroll"><table><tbody>${t2(r.experience.options)}<tr><td>Fully recognized by the provincial licensing body</td><td class="n">+${r.experience.licensed}</td></tr></tbody></table></div>
<h3>Education</h3><div class="table-scroll"><table><tbody>${t2(r.education.options)}</tbody></table></div>
<h3>Adaptability</h3><p>${esc(r.adaptability.note)} Maximum ${r.adaptability.max}.</p><div class="table-scroll"><table><tbody>${t2(r.adaptability.connection)}${t2(r.adaptability.demand)}<tr><td>Immigration destination in Manitoba outside Winnipeg</td><td class="n">${r.adaptability.regional}</td></tr></tbody></table></div>
<h3>Risk assessment</h3><p>Work experience in another province: ${r.risk.otherProvinceWork}. Studies in another province: ${r.risk.otherProvinceStudy}. ${esc(r.risk.note)}</p>
<p>A Manitoba nomination through Express Entry adds 600 CRS points; see the <a href="/">CRS calculator</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Expression of Interest (EOI)</a>, Manitoba Provincial Nominee Program, updated ${longDate(r.sourceModified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('mpnp-rules', r)}${jsonScript('lang-rules', lang)}<script type="module" src="/js/mpnp.js"></script>`;
  return page({ path: '/mpnp-points-calculator/', title: 'MPNP Points Calculator 2026: Manitoba EOI Ranking Score', description: 'Calculate your Manitoba PNP Expression of Interest score out of 1,000: language, age, experience, education, adaptability and risk, from the official grid.', body, scripts, crumbs: [['Home', '/'], ['MPNP points calculator', '/mpnp-points-calculator/']] });
}

function mpnpDrawsPage() {
  const d = mpnpDraws.draws;
  const last = d[0];
  const y = last.date.slice(0, 4);
  const yr = d.filter((x) => x.date.startsWith(y));
  const short = { 'Skilled Worker in Manitoba': 'SWM', 'Skilled Worker Overseas': 'SWO', 'International Education Stream': 'IES', 'Skilled Worker Stream': 'Strategic', 'Occupation-specific selections': 'Occupations', 'Completed post-secondary study in Manitoba': 'MB graduates', 'Francophone selection': 'Francophone' };
  const scores = (x) => x.segments.filter((s) => s.minScore !== null).map((s) => `${s.minScore}${s.group ? ` ${short[s.group] || s.group}` : ''}`).join(', ');
  const rows = d.map((x) => `<tr><td>${x.date}</td><td class="n"><a href="${x.url}" rel="noopener">#${x.n}</a></td><td class="n">${fmt(x.laas)}</td><td class="n">${x.expressEntry === null ? '' : fmt(x.expressEntry)}</td><td>${esc(scores(x))}</td></tr>`).join('');
  const lastSegs = last.segments.map((s) => `<tr><td>${esc(s.group || '')}<div class="small">${esc(s.criteria || '')}</div></td><td class="n">${fmt(s.laas)}</td><td class="n">${s.minScore ?? '–'}</td></tr>`).join('');
  const swm = d.flatMap((x) => x.segments.filter((s) => s.group === 'Skilled Worker in Manitoba' && s.minScore).map((s) => ({ date: x.date, crs: s.minScore }))).filter((x) => x.date >= `${Number(y) - 3}${last.date.slice(4)}`);
  const missing = []; const have = new Set(d.map((x) => x.n)); for (let i = 1; i <= last.n; i++) if (!have.has(i)) missing.push(i);
  const body = `
<section class="intro">
  <h1>MPNP Draws: Manitoba EOI Draw History and Scores</h1>
  <p class="lede">Every Manitoba Provincial Nominee Program Expression of Interest draw published on Manitoba's website: ${fmt(d.length)} draws since 2015, with Letters of Advice to Apply and the lowest ranking scores invited.</p>
  <p class="meta"><span>Updated automatically from Manitoba's posts</span><span>Latest: draw #${last.n} on ${longDate(last.date)}</span><span>Source: <a href="${mpnpDraws.source}" rel="noopener">MPNP EOI draws</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest draw</div><div class="v">#${last.n}</div><div class="small">${longDate(last.date)}</div></div>
  <div class="card"><div class="k">Letters of Advice to Apply</div><div class="v">${fmt(last.laas)}</div>${last.expressEntry !== null ? `<div class="small">${fmt(last.expressEntry)} to Express Entry candidates</div>` : ''}</div>
  <div class="card"><div class="k">Draws in ${y}</div><div class="v">${yr.length}</div><div class="small">${fmt(yr.reduce((a, x) => a + (x.laas || 0), 0))} letters</div></div>
</div>
<h2>Latest draw, by selection</h2>
<div class="table-scroll"><table><thead><tr><th>Selection</th><th class="n">Letters</th><th class="n">Lowest score</th></tr></thead><tbody>${lastSegs}</tbody></table></div>
<p class="small">Selections that target occupations or strategic recruitment initiatives often have no published score. <a href="${last.url}" rel="noopener">Manitoba's notice for draw #${last.n}</a> lists the occupations considered.</p>
${swm.length >= 2 ? `<h2>Skilled Worker in Manitoba: lowest score invited</h2>${catChart(swm)}` : ''}
<h2>All draws</h2>
<div class="table-scroll"><table><thead><tr><th>Date</th><th class="n">Draw</th><th class="n">Letters</th><th class="n">To Express Entry candidates</th><th>Lowest scores published</th></tr></thead><tbody>${rows}</tbody></table></div>
<article class="prose">
<h2>How to read it</h2>
<p>Scores are Manitoba's own EOI ranking points out of 1,000, not CRS points; estimate yours with the <a href="/mpnp-points-calculator/">MPNP points calculator</a>. SWM is Skilled Worker in Manitoba, SWO Skilled Worker Overseas, IES International Education Stream. Candidates nominated through Express Entry then receive 600 CRS points; federal rounds for nominees are on the <a href="/express-entry-draws/pnp/">PNP draws</a> page.</p>
${missing.length ? `<p class="small">Manitoba's website has no notice for ${missing.length} of the draw numbers up to #${last.n} (${missing.join(', ')}), so they are not listed.</p>` : ''}
<h2>Sources</h2>
<ul><li><a href="${mpnpDraws.source}" rel="noopener">EOI draws</a>, Manitoba Provincial Nominee Program, one notice per draw</li></ul>
</article>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Manitoba PNP Expression of Interest draws', description: `${d.length} MPNP EOI draws with letters of advice to apply and lowest ranking scores.`, url: SITE.url + '/mpnp-draws/', isBasedOn: mpnpDraws.source, dateModified: last.date, spatialCoverage: 'Manitoba, Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
  return page({ path: '/mpnp-draws/', title: `MPNP Draws ${y}: Manitoba EOI Draw History and Scores`, description: `Latest Manitoba PNP draw: #${last.n} on ${longDate(last.date)}, ${fmt(last.laas)} letters of advice to apply. All ${d.length} MPNP EOI draws with lowest scores.`, body, jsonld, crumbs: [['Home', '/'], ['MPNP draws', '/mpnp-draws/']] });
}

// ---------- Saskatchewan (SINP) ----------
function sinpCalcPage() {
  const r = sinp;
  const opt = (arr) => arr.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('');
  const fields = r.factors.map((f) => `<div class="field"><label for="${f.id}">${esc(f.label)}</label><select id="${f.id}" name="${f.id}">${opt(f.options)}</select></div>`).join('');
  const c = r.connection;
  const tables = r.factors.map((f) => `<h3>${esc(f.label)}</h3><div class="table-scroll"><table><tbody>${f.options.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const last = sinpDraws.selections[0];
  const body = `
<section class="intro">
  <h1>SINP Points Calculator: Saskatchewan International Skilled Worker Grid</h1>
  <p class="lede">Score yourself on the Saskatchewan Immigrant Nominee Program points grid for International Skilled Workers, out of ${r.max}. Saskatchewan Express Entry, Occupations In-Demand and Employment Offer candidates need at least ${r.minimumToApply} points to apply.</p>
  <p class="meta"><span>Grid checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">SINP: Assess your eligibility</a></span></p>
</section>
<div class="tool">
<form id="sinp-form" novalidate>
  <fieldset><legend>Subcategory</legend>
    <div class="field"><label for="sub">International Skilled Worker subcategory</label><select id="sub" name="sub"><option value="ee">Saskatchewan Express Entry</option><option value="oid">Occupations In-Demand</option><option value="offer">Employment Offer</option></select></div>
  </fieldset>
  <fieldset><legend>Labour market success</legend>${fields}<p class="hint">Turn your test results into CLB levels with the <a href="/clb-converter/">CLB converter</a>. Work experience must relate to the occupation in your application; one year is 12 full months.</p></fieldset>
  <fieldset><legend>Connection to Saskatchewan</legend>
    <div id="conn-offer"><div class="field check"><input type="checkbox" id="offer" name="offer"><label for="offer">${esc(c.offer[0])} (${c.offer[1]})</label></div></div>
    <div id="conn-other">
      <div class="field check"><input type="checkbox" id="relative" name="relative"><label for="relative">${esc(c.relative[0])} (${c.relative[1]})</label></div>
      <div class="field check"><input type="checkbox" id="pastWork" name="pastWork"><label for="pastWork">${esc(c.pastWork[0])} (${c.pastWork[1]})</label></div>
      <div class="field check"><input type="checkbox" id="pastStudy" name="pastStudy"><label for="pastStudy">${esc(c.pastStudy[0])} (${c.pastStudy[1]})</label></div>
    </div>
  </fieldset>
</form>
<aside class="results" aria-label="Your SINP score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${r.max}</span></span><span id="status" class="tag"></span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
  <p class="small">Meeting the minimum lets you submit an Expression of Interest; invitations go to the highest scores in the occupations Saskatchewan selects. The latest selection in Saskatchewan's published results was on ${longDate(last.date)}, with a lowest score of ${last.minScore}; see the <a href="/sinp-draws/">SINP draws</a>.</p>
</aside>
</div>
<article class="prose">
<h2>The grid</h2>
<p>Factor I, labour market success, is worth up to 80 points: education, skilled work experience, language and age. Factor II, connection to the Saskatchewan labour market, is worth up to ${c.max}: ${c.offer[1]} for a high-skilled job offer from a Saskatchewan employer in the Employment Offer subcategory, or, in the Express Entry and Occupations In-Demand subcategories, ${c.relative[1]} for a close relative in Saskatchewan and ${c.pastWork[1]} each for past work or study there.</p>
${tables}
<h2>How selection works</h2>
<p>Saskatchewan invites the highest point scores from its Expression of Interest pool. When too many candidates share a score, it chooses first those with connections to Saskatchewan, then those with the most work experience and highest language scores. It can limit selections to occupations in demand, and you will not be invited unless your occupation is selected. A nomination through the Saskatchewan Express Entry subcategory adds 600 CRS points; see the <a href="/">CRS calculator</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">SINP: Assess your eligibility (points grid)</a>, Government of Saskatchewan, checked ${longDate(r.checked)}</li><li><a href="${sinpDraws.page}" rel="noopener">International Skilled Worker EOI system</a>, Government of Saskatchewan</li></ul>
</article>`;
  const scripts = `${jsonScript('sinp-rules', { factors: r.factors, connection: r.connection, minimumToApply: r.minimumToApply })}<script type="module" src="/js/sinp.js"></script>`;
  return page({ path: '/sinp-points-calculator/', title: 'SINP Points Calculator: Saskatchewan Skilled Worker Grid (2026)', description: `Check your Saskatchewan Immigrant Nominee Program points out of ${r.max} on the International Skilled Worker grid, and whether you reach the ${r.minimumToApply}-point minimum.`, body, scripts, crumbs: [['Home', '/'], ['SINP points calculator', '/sinp-points-calculator/']] });
}

function sinpDrawsPage() {
  const d = sinpDraws;
  const s = d.selections;
  const last = s[0];
  const rows = s.map((x) => `<tr><td>${x.date}</td><td>${esc(x.subcategory)}</td><td class="n">${x.minScore}</td><td class="n">${fmt(x.invited)}</td><td>${esc(x.target)}</td></tr>`).join('');
  const byYear = [...new Set(s.map((x) => x.date.slice(0, 4)))].map((y) => { const r = s.filter((x) => x.date.startsWith(y)); return `<tr><td>${y}</td><td class="n">${r.length}</td><td class="n">${fmt(r.reduce((a, x) => a + x.invited, 0))}</td><td class="n">${Math.min(...r.map((x) => x.minScore))}–${Math.max(...r.map((x) => x.minScore))}</td></tr>`; }).join('');
  const ee = s.filter((x) => x.subcategory === 'Express Entry').map((x) => ({ date: x.date, crs: x.minScore }));
  const lastYear = last.date.slice(0, 4);
  const body = `
<section class="intro">
  <h1>SINP Draws: Saskatchewan EOI Selection Results</h1>
  <p class="lede">Every International Skilled Worker Expression of Interest selection in Saskatchewan's published results: ${s.length} selections since ${s.at(-1).date.slice(0, 4)} for the Saskatchewan Express Entry and Occupations In-Demand subcategories, with the lowest score invited out of 110.</p>
  <p class="meta"><span>Saskatchewan's results document updated ${longDate(d.documentUpdated)}</span><span>Checked ${longDate(d.checked)}</span><span>Source: <a href="${d.source}" rel="noopener">SINP ISW EOI selection results (PDF)</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest selection published</div><div class="v" style="font-size:1.2rem">${longDate(last.date)}</div><div class="small">lowest score ${last.minScore}</div></div>
  <div class="card"><div class="k">Selections in ${lastYear}</div><div class="v">${s.filter((x) => x.date.startsWith(lastYear)).length}</div></div>
  <div class="card"><div class="k">Candidates invited, all years</div><div class="v">${fmt(s.reduce((a, x) => a + x.invited, 0))}</div></div>
</div>
<p class="callout">Saskatchewan's results document was last updated on ${longDate(d.documentUpdated)} and lists no selection after that date. We check it every day and will add new selections when they appear.</p>
<h2>By year</h2>
<div class="table-scroll"><table><thead><tr><th>Year</th><th class="n">Selections</th><th class="n">Invited</th><th class="n">Lowest scores</th></tr></thead><tbody>${byYear}</tbody></table></div>
${ee.length >= 2 ? `<h2>Saskatchewan Express Entry: lowest score invited</h2>${catChart(ee)}` : ''}
<h2>All selections</h2>
<div class="table-scroll"><table><thead><tr><th>Date</th><th>Subcategory</th><th class="n">Lowest score</th><th class="n">Invited</th><th>Who was considered</th></tr></thead><tbody>${rows}</tbody></table></div>
<article class="prose">
<h2>How to read it</h2>
<p>Scores are SINP points out of 110, not CRS points; estimate yours with the <a href="/sinp-points-calculator/">SINP points calculator</a>. Most selections only considered candidates with an Educational Credential Assessment or Canadian education and in a list of occupations; the full list of occupation codes for each selection is in Saskatchewan's document. The selections for candidates living in Ukraine do not state a subcategory.</p>
<h2>Sources</h2>
<ul><li><a href="${d.source}" rel="noopener">SINP International Skilled Workers: EOI selection results</a>, Government of Saskatchewan, updated ${longDate(d.documentUpdated)}</li></ul>
</article>`;
  return page({ path: '/sinp-draws/', title: 'SINP Draws: Saskatchewan EOI Selection Results and Scores', description: `All ${s.length} Saskatchewan International Skilled Worker EOI selections with lowest scores and invitations. Latest published: ${longDate(last.date)}, score ${last.minScore}.`, body, crumbs: [['Home', '/'], ['SINP draws', '/sinp-draws/']] });
}

// ---------- Alberta (AAIP) ----------
const AAIP_STREAMS = { aee: 'Alberta Express Entry Stream', aos: 'Alberta Opportunity Stream', dhcp: 'Dedicated Health Care Pathways', rrs: 'Rural Renewal Stream', ths: 'Tourism and Hospitality Stream', other: 'Other' };
function aaipCalcPage() {
  const r = aaip;
  const groups = [...new Set(r.factors.map((f) => f.group))];
  const fields = groups.map((g) => `<fieldset><legend>${esc(g)}</legend>${r.factors.filter((f) => f.group === g).map((f) => `<div class="field"><label for="${f.id}">${esc(f.label)}</label><select id="${f.id}" name="${f.id}">${f.options.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('')}</select></div>`).join('')}${g.endsWith('language') ? `<p class="hint">${esc(r.languageRule)}</p><p class="callout small" id="lang-warn" hidden>${esc(r.minimumLanguage)}.</p>` : ''}</fieldset>`).join('');
  const tables = r.factors.map((f) => `<h3>${esc(f.label)}</h3><div class="table-scroll"><table><tbody>${f.options.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('')}</tbody></table></div>`).join('');
  const d = aaipDraws.draws;
  const recent = AAIP_STREAMS && Object.keys(AAIP_STREAMS).filter((s) => d.some((x) => x.stream === s)).map((s) => { const x = d.find((y) => y.stream === s); return `${esc(AAIP_STREAMS[s])}: ${x.minScore} on ${x.date}`; });
  const body = `
<section class="intro">
  <h1>AAIP Points Calculator: Alberta Worker EOI Score (2026)</h1>
  <p class="lede">Score your Worker Expression of Interest for the Alberta Advantage Immigration Program out of ${r.max}, with every factor from Alberta's points grid dated ${longDate(r.gridDate)}.</p>
  <p class="meta"><span>Grid checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">AAIP Worker EOI points grid (PDF)</a></span></p>
</section>
<div class="tool">
<form id="aaip-form" novalidate>${fields}</form>
<aside class="results" aria-label="Your AAIP score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${r.max}</span></span><span class="small">Worker EOI score</span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
  <p class="small">Latest minimum scores by stream: ${recent.join('; ')}. Alberta also selects by occupation and sector, so a score above these is not enough on its own; see the <a href="/aaip-draws/">AAIP draws</a>.</p>
</aside>
</div>
<article class="prose">
<h2>How the score works</h2>
<p>Alberta gives up to 69 points for human capital (education, language, work experience, age and family in Alberta) and up to 31 for economic factors (an Alberta job offer, its location and whether it is in a regulated occupation in which you are certified). ${esc(r.languageRule)} ${esc(r.minimumLanguage)}.</p>
<p>Alberta also collects your work permit and Express Entry status, the NOC code of your job offer and your employer's industry code. These give no points but are used to select candidates for draws. An Alberta nomination through the Alberta Express Entry Stream adds 600 CRS points; see the <a href="/">CRS calculator</a>.</p>
<h2>Points grid</h2>
${tables}
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Worker Expression of Interest points grid</a>, Government of Alberta, ${longDate(r.gridDate)}</li><li><a href="${r.page}" rel="noopener">AAIP processing information</a>, Government of Alberta</li></ul>
</article>`;
  const scripts = `${jsonScript('aaip-rules', { factors: r.factors, bilingual: r.bilingual })}<script type="module" src="/js/aaip.js"></script>`;
  return page({ path: '/aaip-points-calculator/', title: 'AAIP Points Calculator 2026: Alberta Worker EOI Score', description: `Calculate your Alberta AAIP Worker EOI score out of ${r.max} with the official points grid of ${longDate(r.gridDate)}, and compare it with recent draws.`, body, scripts, crumbs: [['Home', '/'], ['AAIP points calculator', '/aaip-points-calculator/']] });
}

function aaipDrawsPage() {
  const a = aaipDraws;
  const d = a.draws;
  const last = d[0];
  const streams = Object.keys(AAIP_STREAMS).filter((s) => d.some((x) => x.stream === s));
  const stat = streams.map((s) => { const r = d.filter((x) => x.stream === s); const sc = r.map((x) => x.minScore).filter((x) => x !== null); return `<tr><td>${esc(AAIP_STREAMS[s])}</td><td class="n">${r.length}</td><td class="n">${fmt(r.reduce((t, x) => t + (x.invitations || 0), 0))}</td><td class="n">${Math.min(...sc)}–${Math.max(...sc)}</td><td>${r[0].date}, ${r[0].minScore}</td></tr>`; }).join('');
  const rows = d.map((x) => `<tr data-s="${x.stream}"><td>${x.date}</td><td>${esc(x.focus)}</td><td class="n">${x.minScore ?? ''}</td><td class="n">${esc(x.invitationsText)}</td></tr>`).join('');
  const chips = `<button type="button" data-s="all" aria-pressed="true">All (${d.length})</button>` + streams.map((s) => `<button type="button" data-s="${s}" aria-pressed="false">${esc(AAIP_STREAMS[s])}</button>`).join('');
  const aos = d.filter((x) => x.stream === 'aos' && x.minScore).map((x) => ({ date: x.date, crs: x.minScore }));
  const poolRows = Object.entries(a.pool).map(([k, v]) => `<tr${k === 'Total' ? ' class="section"' : ''}><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('');
  const y = last.date.slice(0, 4);
  const body = `
<section class="intro">
  <h1>AAIP Draws: Alberta Advantage Immigration Program Draws (${y})</h1>
  <p class="lede">Every Alberta Advantage Immigration Program draw of ${y} with its stream, minimum score and invitations: ${d.length} draws so far, plus the size of the Worker Expression of Interest pool.</p>
  <p class="meta"><span>Alberta's page updated ${longDate(a.pageUpdated)}</span><span>Updated automatically</span><span>Source: <a href="${a.source}" rel="noopener">AAIP processing information</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest draw</div><div class="v" style="font-size:1.2rem">${longDate(last.date)}</div><div class="small">${esc(last.focus)}</div></div>
  <div class="card"><div class="k">Minimum score</div><div class="v">${last.minScore}</div><div class="small">${esc(last.invitationsText)} invitations</div></div>
  <div class="card"><div class="k">Worker EOIs in the pool</div><div class="v">${fmt(a.pool.Total)}</div></div>
</div>
<h2>By stream, ${y}</h2>
<div class="table-scroll"><table><thead><tr><th>Stream</th><th class="n">Draws</th><th class="n">Invitations</th><th class="n">Minimum scores</th><th>Latest</th></tr></thead><tbody>${stat}</tbody></table></div>
${aos.length >= 2 ? `<h2>Alberta Opportunity Stream: minimum score</h2>${catChart(aos)}` : ''}
<h2>All ${y} draws</h2>
<div class="chips" id="chips" role="group" aria-label="Filter by stream">${chips}</div>
<div class="table-scroll"><table id="aaip-table"><thead><tr><th>Date</th><th>Stream and focus</th><th class="n">Minimum score</th><th class="n">Invitations</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Expressions of interest in the pool</h2>
<div class="table-scroll"><table><tbody>${poolRows}</tbody></table></div>
<article class="prose">
<h2>How to read it</h2>
<p>Scores are Alberta's Worker EOI points out of 100; estimate yours with the <a href="/aaip-points-calculator/">AAIP points calculator</a>. Alberta says the score is not the only factor: it selects by stream, occupation and sector, does not publish the parameters of recent draws, and does not hold draws on a schedule. Where Alberta reports fewer than 10 invitations, the exact number is not published.</p>
<p>Nominees through the Alberta Express Entry Stream get 600 CRS points; federal rounds for nominees are on the <a href="/express-entry-draws/pnp/">PNP draws</a> page.</p>
<h2>Sources</h2>
<ul><li><a href="${a.source}" rel="noopener">Alberta Advantage Immigration Program: processing information</a>, Government of Alberta, updated ${longDate(a.pageUpdated)}</li></ul>
</article>
<script>{const b=[...document.querySelectorAll('#chips button')],r=[...document.querySelectorAll('#aaip-table tbody tr')];b.forEach(x=>x.addEventListener('click',()=>{b.forEach(y=>y.setAttribute('aria-pressed',y===x));const s=x.dataset.s;r.forEach(t=>{t.hidden=s!=='all'&&t.dataset.s!==s;});}));}</script>`;
  return page({ path: '/aaip-draws/', title: `AAIP Draws ${y}: Alberta Draw Results and Minimum Scores`, description: `Latest AAIP draw: ${longDate(last.date)}, minimum score ${last.minScore}. All ${d.length} Alberta draws of ${y} by stream, with invitations and the EOI pool size.`, body, crumbs: [['Home', '/'], ['AAIP draws', '/aaip-draws/']] });
}

// ---------- FSW 67 points and CEC eligibility ----------
const testSelect = () => Object.entries(lang.tests).map(([id, t]) => `<option value="${id}"${id === 'ielts' ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
const scoreBox = () => `<div class="scores">${SK.map((s) => `<div class="field"><label for="${s}">${SKL[s]}</label><input type="number" inputmode="decimal" id="${s}" name="${s}"><span class="clb-tag" id="${s}-clb"></span></div>`).join('')}</div>`;
function fswPage() {
  const r = fsw;
  const ages = Array.from({ length: 31 }, (_, i) => 17 + i).map((a) => `<option value="${a}">${a === 17 ? 'Under 18' : a === 47 ? '47 or older' : a}</option>`).join('');
  const t2 = (arr) => arr.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('');
  const ageRows = Object.entries(r.age).map(([k, v]) => `<tr><td>${k === 'under18' ? 'Under 18' : k === '47+' ? '47 or older' : k.replace('-', ' to ')}</td><td class="n">${v}</td></tr>`).join('');
  const body = `
<section class="intro">
  <h1>FSW Points Calculator: the 67-Point Federal Skilled Worker Grid</h1>
  <p class="lede">Check whether you reach the 67 points out of 100 needed for the Federal Skilled Worker Program, the first step before entering the Express Entry pool. These are not CRS points.</p>
  <p class="meta"><span>Rules checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC Federal Skilled Worker Program</a>, modified ${longDate(r.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="fsw-form" novalidate>
  <fieldset><legend>Language (first official language)</legend>
    <div class="field"><label for="test">Test</label><select id="test" name="test">${testSelect()}</select></div>
    ${scoreBox()}
    <div class="field check" style="margin-top:12px"><input type="checkbox" id="second" name="second"><label for="second">Second official language at CLB 5 or higher in all four abilities (+${r.language.secondAllClb5})</label></div>
  </fieldset>
  <fieldset><legend>Education, experience and age</legend>
    <div class="field"><label for="edu">Education (Canadian credential or ECA result)</label><select id="edu" name="edu">${r.education.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('')}</select></div>
    <div class="row"><div class="field"><label for="exp">Years of skilled work experience</label><select id="exp" name="exp">${r.experience.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('')}</select></div>
    <div class="field"><label for="age">Age on the day IRCC gets your application</label><select id="age" name="age">${ages}</select></div></div>
    <div class="field check"><input type="checkbox" id="offer" name="offer"><label for="offer">Valid job offer of at least 1 year from a Canadian employer that meets one of IRCC's four situations (+${r.arrangedEmployment})</label></div>
  </fieldset>
  <fieldset><legend>Adaptability (maximum ${r.adaptabilityMax})</legend>
    ${r.adaptability.filter(([id]) => id !== 'arranged').map(([id, l, p]) => `<div class="field check"><input type="checkbox" id="${id}" name="${id}"><label for="${id}">${esc(l)} (+${p})</label></div>`).join('')}
    <p class="hint">A job offer that earns arranged employment points also adds 5 adaptability points.</p>
  </fieldset>
</form>
<aside class="results" aria-label="Your FSW points">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${r.max}</span></span><span id="status" class="tag"></span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
  <p class="small">Reaching 67 makes you eligible to enter the pool under this program. Your rank in the pool is your CRS score: check it with the <a href="/">CRS calculator</a>.</p>
</aside>
</div>
<article class="prose">
<h2>Minimum requirements before the points</h2>
<ul>
<li>At least 1 year of continuous paid skilled work (TEER 0, 1, 2 or 3), or 1,560 hours, in the last 10 years, in the same occupation (your primary occupation).</li>
<li>CLB 7 or higher in all four abilities of English or French.</li>
<li>A Canadian secondary or post-secondary credential, or a foreign credential with an Educational Credential Assessment.</li>
<li>Proof of funds, unless you can legally work in Canada and have a valid job offer; see <a href="/proof-of-funds-express-entry/">proof of funds</a>.</li>
<li>Plan to live outside Quebec.</li>
</ul>
<h2>The selection grid</h2>
<h3>Language (maximum ${r.language.max})</h3><p>First official language, per ability: CLB 9 or higher 6, CLB 8 5, CLB 7 4; below CLB 7 you are not eligible. Second official language: ${r.language.secondAllClb5} points with at least CLB 5 in all four abilities.</p>
<h3>Education (maximum 25)</h3><div class="table-scroll"><table><tbody>${t2(r.education)}</tbody></table></div>
<p class="small">Education points by ECA result are from IRCC's <a href="${r.educationSource}" rel="noopener">education credential assessment page</a>.</p>
<h3>Skilled work experience (maximum 15)</h3><div class="table-scroll"><table><tbody>${t2(r.experience)}</tbody></table></div>
<h3>Age (maximum 12)</h3><div class="table-scroll"><table><tbody>${ageRows}</tbody></table></div>
<h3>Arranged employment (maximum ${r.arrangedEmployment}) and adaptability (maximum ${r.adaptabilityMax})</h3><div class="table-scroll"><table><tbody>${r.adaptability.map(([, l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('')}</tbody></table></div>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Federal Skilled Worker Program</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${r.educationSource}" rel="noopener">Education credential assessment</a>, IRCC</li></ul>
</article>`;
  const scripts = `${jsonScript('fsw-rules', r)}${jsonScript('lang-rules', lang)}<script type="module" src="/js/fsw.js"></script>`;
  return page({ path: '/fsw-67-points-calculator/', title: 'FSW 67 Points Calculator: Federal Skilled Worker Eligibility', description: 'Check if you reach 67 of 100 points for the Federal Skilled Worker Program: language, education, experience, age, job offer and adaptability, from IRCC rules.', body, scripts, crumbs: [['Home', '/'], ['FSW 67 points calculator', '/fsw-67-points-calculator/']] });
}

function cecPage() {
  const r = cec;
  const { recent, all } = catStats('cec');
  const last = all[0];
  const body = `
<section class="intro">
  <h1>CEC Eligibility Calculator: Canadian Experience Class Check</h1>
  <p class="lede">Check the minimum requirements of the Canadian Experience Class: ${r.hours.toLocaleString('en-CA')} hours of skilled Canadian work in the last ${r.years} years, the language level for your job's TEER category and the rest. Then compare your score with recent CEC cut-offs.</p>
  <p class="meta"><span>Rules checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC Canadian Experience Class</a>, modified ${longDate(r.sourceModified)}</span></p>
</section>
<div class="tool">
<form id="cec-form" novalidate>
  <fieldset><legend>Canadian work experience</legend>
    <div class="row"><div class="field"><label for="weeks">Weeks worked in the last 3 years</label><input type="number" id="weeks" name="weeks" min="0" max="160" inputmode="numeric"></div>
    <div class="field"><label for="hpw">Paid hours per week</label><input type="number" id="hpw" name="hpw" min="0" max="80" inputmode="numeric"><span class="hint">Hours above 30 a week do not count.</span></div></div>
    <div class="field"><label for="hours">Total hours of skilled work (TEER 0 to 3)</label><input type="number" id="hours" name="hours" min="0" inputmode="numeric"><span class="hint">Filled in from weeks and hours; edit it if you had several jobs.</span></div>
    <div class="field"><label for="teer">TEER category of your Canadian job</label><select id="teer" name="teer"><option value="01">TEER 0 or 1</option><option value="23">TEER 2 or 3</option></select></div>
    <div class="field check"><input type="checkbox" id="authorized" name="authorized"><label for="authorized">I was authorized to work in Canada under temporary resident status, and physically in Canada if I worked remotely</label></div>
    <div class="field check"><input type="checkbox" id="clean" name="clean"><label for="clean">None of these hours were as a full-time student, co-op term, self-employed (except eligible physicians), volunteer or unpaid intern</label></div>
  </fieldset>
  <fieldset><legend>Language</legend>
    <div class="field"><label for="test">Test</label><select id="test" name="test">${testSelect()}</select></div>
    ${scoreBox()}
  </fieldset>
  <fieldset><legend>Where you will live</legend><div class="field check"><input type="checkbox" id="quebec" name="quebec"><label for="quebec">I plan to live outside Quebec</label></div></fieldset>
</form>
<aside class="results" aria-label="CEC check">
  <div class="total"><span class="panel-h" style="margin:0">Canadian Experience Class</span><span id="status" class="tag"></span></div>
  <div class="cmp" id="checks"></div>
  <p class="small">${recent.length ? `CEC rounds in the last 12 months closed between ${Math.min(...recent.map((x) => x.crs))} and ${Math.max(...recent.map((x) => x.crs))} points; the latest, on ${longDate(last.date)}, at ${last.crs}.` : ''} See your score with the <a href="/">CRS calculator</a> and every round on the <a href="/express-entry-draws/cec/">CEC draws</a> page.</p>
</aside>
</div>
<article class="prose">
<h2>The requirements</h2>
<ul>
<li><strong>Work:</strong> at least 1 year of paid skilled work in Canada (TEER 0, 1, 2 or 3), or ${r.hours.toLocaleString('en-CA')} hours at up to 30 hours a week, in the ${r.years} years before you apply. Part-time and several jobs can add up. Experience gained in Quebec counts if you plan to live elsewhere.</li>
<li><strong>Language:</strong> CLB or NCLC ${r.languageMin.teer01} in all four abilities for TEER 0 or 1 jobs, ${r.languageMin.teer23} for TEER 2 or 3 jobs; see the <a href="/clb-converter/">CLB converter</a>.</li>
<li><strong>Education:</strong> none required, though an education credential adds CRS points.</li>
<li><strong>Proof of funds:</strong> not required for the Canadian Experience Class.</li>
<li>You must be admissible to Canada and plan to live outside Quebec.</li>
</ul>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Canadian Experience Class</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${lang.source}" rel="noopener">Language test results for Express Entry</a>, IRCC</li><li><a href="${funds.source}" rel="noopener">Proof of funds</a>, IRCC</li></ul>
</article>`;
  const scripts = `${jsonScript('cec-rules', r)}${jsonScript('lang-rules', lang)}<script type="module" src="/js/cec.js"></script>`;
  return page({ path: '/cec-eligibility-calculator/', title: 'CEC Eligibility Calculator: Canadian Experience Class (2026)', description: 'Check if you qualify for the Canadian Experience Class: 1,560 hours of Canadian skilled work in 3 years, CLB 7 or 5 by TEER, and recent CEC cut-offs.', body, scripts, crumbs: [['Home', '/'], ['CEC eligibility calculator', '/cec-eligibility-calculator/']] });
}

// ---------- Super visa and parents sponsorship income ----------
const tableFor = (amounts, extra) => (n) => (n <= 7 ? amounts[n] : amounts[7] + (n - 7) * extra);
function superVisaPage() {
  const r = sv;
  const rows = Object.entries(r.amounts).map(([n, v]) => `<tr><td>${n}</td><td class="n">$${fmt(v)}</td></tr>`).join('') + `<tr><td>Each additional person</td><td class="n">+$${fmt(r.eachAdditional)}</td></tr>`;
  const num = (id, label, hint, v = 0) => `<div class="field"><label for="${id}">${label}</label><input type="number" id="${id}" name="${id}" min="0" max="20" step="1" value="${v}" inputmode="numeric">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const body = `
<section class="intro">
  <h1>Super Visa Income Requirement Calculator (Minimum Necessary Income)</h1>
  <p class="lede">The minimum income your child or grandchild in Canada needs to invite you on a super visa, by family size, and whether their income meets it under either of IRCC's two options.</p>
  <p class="meta"><span>Amounts updated by IRCC on ${longDate(r.tableUpdated)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC super visa: proof of financial support</a></span></p>
</section>
<div class="tool">
<form id="sv-form" novalidate>
  <fieldset><legend>Family size</legend>
    <p class="hint">The host child or grandchild always counts as 1.</p>
    ${num('invited', 'Parents or grandparents you are inviting now', '', 1)}
    <div class="field check"><input type="checkbox" id="spouse" name="spouse"><label for="spouse">The host has a spouse or common-law partner (a separated spouse may also count)</label></div>
    ${num('kids', 'Dependent children of the host or their partner', 'Count them whatever the custody arrangement.')}
    ${num('hosted', 'Super visa holders already invited by the host or partner', 'In another letter of invitation that still applies, even if they are not in Canada now.')}
    ${num('sponsored', 'People sponsored by the host or co-signer with an undertaking still in effect')}
  </fieldset>
  <fieldset><legend>Income (optional)</legend>
    <div class="field"><label for="income">Host's total income, with a co-signing spouse or partner if any (CAD)</label><input type="number" id="income" name="income" min="0" step="100" inputmode="numeric"></div>
    <div class="field"><label for="own">Your own income while in Canada (CAD, only used for option 2)</label><input type="number" id="own" name="own" min="0" step="100" inputmode="numeric"></div>
  </fieldset>
</form>
<aside class="results" aria-label="Minimum necessary income">
  <div class="total"><span><span class="score" id="sv-out"></span> <span class="of">CAD</span></span><span class="small" id="sv-size"></span></div>
  <div class="cmp" id="sv-checks"></div>
</aside>
</div>
<article class="prose">
<h2>Minimum necessary income by family size</h2>
<div class="table-scroll"><table><thead><tr><th>Family members</th><th class="n">Minimum income (CAD)</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Two ways to prove it</h2>
<ul>
<li><strong>Option 1:</strong> the host's total income, with a co-signer's if any, meets or exceeds the minimum in either of the 2 tax years before the application, shown with the Canada Revenue Agency notice of assessment.</li>
<li><strong>Option 2:</strong> the host's income in the year before the application is at least ${Math.round(r.option2Share * 100)}% of the minimum, and the invited parent's or grandparent's own income covers the rest. You must prove you will keep earning that income while in Canada.</li>
</ul>
<p>Only the host's spouse or common-law partner can co-sign, and only if they are a Canadian citizen, permanent resident or registered Indian; siblings cannot.</p>
<h2>Health insurance</h2>
<p>The super visa also needs a health insurance policy from a Canadian insurer, or a foreign insurer authorized by the Office of the Superintendent of Financial Institutions, valid for at least 1 year from entry, paid in full or in instalments with a deposit, covering health care, hospitalization and repatriation, with at least $100,000 of emergency coverage.</p>
<p>Planning to sponsor them for permanent residence instead? See the <a href="/parents-grandparents-sponsorship-income/">income requirement for sponsoring parents and grandparents</a>, which uses higher amounts and three tax years.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Super visa: proof of financial support</a>, IRCC, modified ${longDate(r.sourceModified)}, amounts updated ${longDate(r.tableUpdated)}</li><li><a href="${r.insuranceSource}" rel="noopener">Super visa: forms and documents</a>, IRCC</li></ul>
</article>
<script>{const A=${JSON.stringify(r.amounts)},X=${r.eachAdditional},S=${r.option2Share},f=document.getElementById('sv-form'),$=(i)=>document.getElementById(i);const m=(n)=>n<=7?A[n]:A[7]+(n-7)*X;const c=(s)=>'$'+Math.round(s).toLocaleString('en-CA');function u(){const v=(k)=>Math.max(0,Math.floor(Number(f.elements[k].value)||0));const n=1+v('invited')+(f.elements.spouse.checked?1:0)+v('kids')+v('hosted')+v('sponsored');const need=m(n);$('sv-out').textContent=c(need);$('sv-size').textContent='Family size '+n;const inc=Number(f.elements.income.value)||0,own=Number(f.elements.own.value)||0;let h='';if(inc){const o1=inc>=need,o2=inc>=need*S&&inc+own>=need;h='<div class="cmp-row"><span>Option 1: host income meets the minimum</span><span class="tag '+(o1?'yes':'no')+'">'+(o1?'met':'not met')+'</span></div><div class="cmp-row"><span>Option 2: host has at least '+c(need*S)+' and the total with your income reaches '+c(need)+'</span><span class="tag '+(o2?'yes':'no')+'">'+(o2?'met':'not met')+'</span></div>';}$('sv-checks').innerHTML=h;}f.addEventListener('input',u);u();}</script>`;
  return page({ path: '/super-visa-income-requirement/', title: 'Super Visa Income Requirement 2026: Minimum Necessary Income', description: `Super visa minimum necessary income: $${fmt(r.amounts[2])} for a family of 2, $${fmt(r.amounts[4])} for 4. Calculator for family size, both proof options and insurance rules.`, body, crumbs: [['Home', '/'], ['Super visa income requirement', '/super-visa-income-requirement/']] });
}

function pgpIncomePage() {
  const r = pgp;
  const rows = Object.entries(r.amounts).map(([n, v]) => `<tr><td>${n} people</td>${v.map((x) => `<td class="n">$${fmt(x)}</td>`).join('')}</tr>`).join('') + `<tr><td>Each additional person</td>${r.eachAdditional.map((x) => `<td class="n">+$${fmt(x)}</td>`).join('')}</tr>`;
  const body = `
<section class="intro">
  <h1>Parents and Grandparents Sponsorship: Income Requirement Calculator</h1>
  <p class="lede">The income you need in each of the 3 tax years before you apply to sponsor your parents or grandparents for permanent residence, by family size, as published by IRCC for the ${esc(r.intake)} intake.</p>
  <p class="meta"><span>IRCC page modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC income requirements for the sponsor</a></span></p>
</section>
<div class="tool">
<form id="pgp-form" novalidate>
  <fieldset><legend>Family size and income, year by year</legend>
    <p class="hint">Family size is counted for each year: include people from the year they became part of your family. Minimum 2 (you and one parent).</p>
    ${r.years.map((y) => `<div class="row"><div class="field"><label for="n${y}">Family size in ${y}</label><input type="number" id="n${y}" name="n${y}" min="2" max="30" value="3" inputmode="numeric"></div><div class="field"><label for="i${y}">Your income in ${y} (with co-signer, CAD)</label><input type="number" id="i${y}" name="i${y}" min="0" step="100" inputmode="numeric"></div></div>`).join('')}
  </fieldset>
</form>
<aside class="results" aria-label="Income needed">
  <div class="cmp" id="pgp-out"></div>
  <p class="small">You must meet the requirement in all 3 years. If you live in Quebec, Quebec's own income requirements apply instead.</p>
</aside>
</div>
<article class="prose">
<h2>Income required (${esc(r.intake)} intake)</h2>
<div class="table-scroll"><table><thead><tr><th>Family size</th>${r.years.map((y) => `<th class="n">${y}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
<p>This is the latest table IRCC has published, for applications in the ${esc(r.intake)} intake. If IRCC publishes amounts for a new intake, we update this page; our daily check of IRCC's page flags any change.</p>
<h2>Who counts in your family size</h2>
<ul>
<li>You, your spouse or common-law partner (a co-signing partner counts for all 3 years), your dependent children and theirs.</li>
<li>Anyone you or your co-signer sponsored before whose undertaking is still in effect, with their family members.</li>
<li>The parents or grandparents you are sponsoring, their spouse or partner and their dependent children, even if they are not coming to Canada or are already citizens or permanent residents.</li>
</ul>
<p>Your spouse or common-law partner can co-sign to combine incomes. Inviting them on a visit instead? The <a href="/super-visa-income-requirement/">super visa income requirement</a> is lower and uses one year.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Income requirements for the sponsor</a>, IRCC, modified ${longDate(r.sourceModified)}</li></ul>
</article>
<script>{const A=${JSON.stringify(r.amounts)},X=${JSON.stringify(r.eachAdditional)},Y=${JSON.stringify(r.years)},f=document.getElementById('pgp-form');const need=(n,k)=>n<=7?A[Math.max(2,n)][k]:A[7][k]+(n-7)*X[k];const c=(s)=>'$'+s.toLocaleString('en-CA');function u(){document.getElementById('pgp-out').innerHTML=Y.map((y,k)=>{const n=Math.max(2,Math.floor(Number(f.elements['n'+y].value)||2));const q=need(n,k);const inc=f.elements['i'+y].value;const ok=inc!==''&&Number(inc)>=q;return '<div class="cmp-row"><span>'+y+': '+c(q)+' for '+n+' people</span>'+(inc===''?'':'<span class="tag '+(ok?'yes':'no')+'">'+(ok?'met':'not met')+'</span>')+'</div>';}).join('');}f.addEventListener('input',u);u();}</script>`;
  return page({ path: '/parents-grandparents-sponsorship-income/', title: 'Parents and Grandparents Sponsorship Income Requirement 2026', description: `Income needed to sponsor parents or grandparents: the IRCC table for ${r.years.join(', ')} by family size, with a year-by-year calculator and who counts in your family.`, body, crumbs: [['Home', '/'], ['Parents and grandparents sponsorship income', '/parents-grandparents-sponsorship-income/']] });
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
for (const [slug, fn] of [['celpip-to-ielts', convertPage], ['next-express-entry-draw', nextDrawPage], ['how-to-increase-crs-score', increasePage], ['crs-age-points', agePage], ['physical-presence-calculator', presencePage], ['proof-of-funds-express-entry', fundsPage], ['pr-residency-obligation-calculator', residencyPage], ['oinp-points-calculator', oinpCalcPage], ['oinp-draws', oinpDrawsPage], ['mpnp-points-calculator', mpnpCalcPage], ['mpnp-draws', mpnpDrawsPage], ['sinp-points-calculator', sinpCalcPage], ['sinp-draws', sinpDrawsPage], ['aaip-points-calculator', aaipCalcPage], ['aaip-draws', aaipDrawsPage], ['fsw-67-points-calculator', fswPage], ['cec-eligibility-calculator', cecPage], ['super-visa-income-requirement', superVisaPage], ['parents-grandparents-sponsorship-income', pgpIncomePage]]) if (isLive(`/${slug}/`)) out(slug, fn(), slug === 'next-express-entry-draw' ? latestDate : (schedule.pages[`/${slug}/`] || SITE.checked));
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
