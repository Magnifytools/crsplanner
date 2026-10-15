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
const bcsirs = read('data/rules/bc-sirs.json');
const bcDraws = read('data/provinces/bcpnp-draws.json');
const noc = read('data/noc/noc-2021.json');
const nocRules = read('data/rules/noc.json');
const sowp = read('data/rules/sowp.json');
const bowp = read('data/rules/bowp.json');
const pgwp = read('data/rules/pgwp.json');
const prFees = read('data/rules/pr-fees.json');
const aip = read('data/rules/aip.json');
const rcip = read('data/rules/rcip.json');
const nsnp = read('data/rules/nsnp.json');
const nsSel = read('data/provinces/nsnp-selections.json');
const nbpnp = read('data/rules/nbpnp.json');
const nbDraws = read('data/provinces/nbpnp-draws.json');
const citTest = read('data/rules/citizenship-test.json');
const citQ = read('data/citizenship/questions.json');
const peiDraws = read('data/provinces/pei-draws.json');
// Scheduled pages go live when scripts/release.mjs adds them to data/released.json (daily GitHub Action).
// PREVIEW=1 builds every scheduled page.
const schedule = read('data/schedule.json');
const released = new Set(read('data/released.json'));
const isLive = (path) => !(path in schedule.pages) || released.has(path) || process.env.PREVIEW === '1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('en-CA'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const jsonScript = (id, obj) => `<script type="application/json" id="${id}">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#12352E"/><rect x="6" y="18" width="20" height="3" rx="1.5" fill="#fff"/><rect x="6" y="12" width="4" height="9" rx="1.5" fill="#fff" opacity=".55"/><rect x="12" y="9" width="4" height="12" rx="1.5" fill="#fff" opacity=".55"/><rect x="19" y="5" width="3.6" height="22" rx="1.8" fill="#E5484D"/></svg>';
const FOOT = [
  ['Express Entry', [['/', 'CRS calculator'], ['/express-entry-draws/', 'Latest draws'], ['/next-express-entry-draw/', 'Next draw'], ['/express-entry-categories/', 'Categories'], ['/crs-score-distribution/', 'Score distribution'], ['/how-to-increase-crs-score/', 'Raise your score'], ['/fsw-67-points-calculator/', 'FSW 67 points'], ['/cec-eligibility-calculator/', 'CEC eligibility'], ['/proof-of-funds-express-entry/', 'Proof of funds'], ['/canada-pr-fees/', 'PR fees'], ['/noc-code-finder/', 'NOC code finder']]],
  ['Language tests', [['/clb-converter/', 'CLB converter'], ['/ielts-score-chart/', 'IELTS chart'], ['/celpip-score-chart/', 'CELPIP chart'], ['/pte-core-score-chart/', 'PTE Core chart'], ['/tef-canada-score-chart/', 'TEF Canada chart'], ['/tcf-canada-score-chart/', 'TCF Canada chart'], ['/celpip-to-ielts/', 'CELPIP to IELTS']]],
  ['Provinces', [['/oinp-points-calculator/', 'Ontario points'], ['/oinp-draws/', 'Ontario draws'], ['/bc-pnp-points-calculator/', 'BC points'], ['/bc-pnp-draws/', 'BC draws'], ['/aaip-points-calculator/', 'Alberta points'], ['/aaip-draws/', 'Alberta draws'], ['/sinp-points-calculator/', 'Saskatchewan points'], ['/mpnp-points-calculator/', 'Manitoba points'], ['/nova-scotia-nominee-program/', 'Nova Scotia'], ['/new-brunswick-pnp/', 'New Brunswick'], ['/pei-pnp/', 'Prince Edward Island'], ['/atlantic-immigration-program/', 'Atlantic program'], ['/rural-community-immigration-pilot/', 'Rural pilot']]],
  ['Work and study', [['/pgwp-calculator/', 'PGWP length'], ['/spousal-open-work-permit/', 'Spousal work permit'], ['/bridging-open-work-permit/', 'Bridging work permit']]],
  ['Citizenship and family', [['/physical-presence-calculator/', 'Physical presence'], ['/canadian-citizenship-test-practice/', 'Citizenship test'], ['/pr-residency-obligation-calculator/', 'PR residency obligation'], ['/super-visa-income-requirement/', 'Super visa income'], ['/parents-grandparents-sponsorship-income/', 'Parents sponsorship income']]],
];
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
<meta name="theme-color" content="#12352e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,600..800&family=Figtree:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body>
<header class="site-head"><div class="wrap"><a class="mark" href="/" aria-label="CRS Planner, home">${LOGO_SVG.replace('<svg ', '<svg aria-hidden="true" ')}<span><b>CRS</b> Planner</span></a><nav class="nav" aria-label="Main">${nav}</nav></div></header>
<main class="wrap">${crumbHtml}
${body}
</main>
<footer class="site-foot"><div class="wrap">
<p>CRS Planner is an independent site. It is not affiliated with Immigration, Refugees and Citizenship Canada (IRCC) or the Government of Canada, and it is not immigration or legal advice. Rules last checked ${longDate(SITE.checked)}.</p>
<div class="foot-grid">${FOOT.map(([h, links]) => { const live = links.filter(([u]) => isLive(u)); return live.length ? `<div><p class="foot-h">${h}</p><ul>${live.map(([u, l]) => `<li><a href="${u}">${l}</a></li>`).join('')}</ul></div>` : ''; }).join('')}
<div><p class="foot-h">Draws by category</p><ul>${catPagesList().map((c) => `<li><a href="/express-entry-draws/${CAT_PAGES[c.id].slug}/">${esc(CAT_PAGES[c.id].short)}</a></li>`).join('')}</ul></div>
<div><p class="foot-h">CRS Planner</p><ul><li><a href="/about/">About and method</a></li><li><a href="/changelog/">Changelog</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li></ul></div>
</div>
<p class="levels small">English levels: ${LEVELS.map((l) => `<a href="/clb-${l}/">CLB ${l}${l === 10 ? '+' : ''}</a>`).join(' ')} · French levels: ${LEVELS.map((l) => `<a href="/nclc-${l}/">NCLC ${l}${l === 10 ? '+' : ''}</a>`).join(' ')}</p>
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
  <h1>CRS calculator for Express Entry</h1>
  <p class="lede">Answer a few questions about your age, studies, languages and work, and you get the CRS score IRCC would give you. The results panel shows where each point comes from and how your score sits against this year's cut-offs.</p>
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
  <div class="stand" id="stand" hidden></div>
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
<p>Every day: a script compares IRCC's pages with the versions we built from and flags any change for review. Each change is listed in the <a href="/changelog/">changelog</a> with its date.</p>
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
  return page({ path: '/', title: 'CRS Calculator 2026: Check Your CRS Score for Express Entry', description: 'Free CRS calculator for Express Entry. See every point of your score, what would raise it, and how it compares with each draw category in the last 12 months.', body, scripts, jsonld });
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
  <h1>CLB converter for IELTS, CELPIP, PTE, TEF and TCF</h1>
  <p class="lede">IRCC doesn't look at your raw test scores. It converts each of the four abilities to a CLB level (NCLC in French). Type your results and see your levels, and whether they clear the minimum for each program.</p>
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
  const rows = draws.rounds.map((r) => `<tr data-cat="${r.category}"><td data-sort="${r.date}">${shortDate(r.date)}</td><td class="n">${esc(r.n)}</td><td>${esc(r.name)}</td><td class="n">${fmt(r.size)}</td><td class="n">${fmt(r.crs)}</td></tr>`).join('');
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
  <h1>Express Entry draws</h1>
  <p class="lede">${fmt(draws.rounds.length)} rounds of invitations since January 2015, newest first. Filter by program or category to see how cut-offs have moved, and check the latest round before anything else.</p>
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
    url: SITE.url + '/express-entry-draws/', isBasedOn: draws.page, license: 'https://www.canada.ca/en/transparency/terms.html', dateModified: latestDate,
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
  <p class="lede">${fr ? `NCLC ${L} is the French equivalent of CLB ${L}.` : ''} These are the ${listNames} results you need for ${name} ${L}${plus} in speaking, listening, reading and writing, and what that level is worth in CRS points.</p>
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
  <h1>CRS score distribution of the Express Entry pool</h1>
  <p class="lede">How many people are in the pool at each score, from IRCC's latest count. Useful for one question: how many candidates are ahead of you.</p>
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
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'CRS score distribution of the Express Entry pool', description: 'Number of Express Entry profiles by CRS score range, as published by IRCC with each round of invitations.', url: SITE.url + '/crs-score-distribution/', isBasedOn: draws.page, license: 'https://www.canada.ca/en/transparency/terms.html', dateModified: d.asOfIso || latestDate, spatialCoverage: 'Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
  return page({ path: '/crs-score-distribution/', title: `CRS Score Distribution ${latestDate.slice(0, 4)}: Express Entry Pool by Score`, description: `${fmt(d.total)} profiles in the Express Entry pool on ${d.asOf}, by CRS score range, with the share above 450 and 500 points and the pool size over time.`, body, jsonld, crumbs: [['Home', '/'], ['CRS score distribution', '/crs-score-distribution/']] });
}

// ---------- Draws by program or category ----------
const CAT_PAGES = {
  cec: { slug: 'cec', short: 'CEC', kw: 'CEC Draw', h1: 'CEC draws and cut-off scores', about: 'Canadian Experience Class rounds invite only candidates eligible for the CEC, which requires at least one year of skilled work experience in Canada in the last three years.' },
  pnp: { slug: 'pnp', short: 'PNP', kw: 'PNP Draw', h1: 'PNP draws and cut-off scores', about: 'Provincial Nominee Program rounds invite only candidates with a provincial or territorial nomination. The nomination adds 600 points, which is why these cut-offs sit above 600.' },
  french: { slug: 'french', short: 'French', kw: 'French Draw', h1: 'French-language draws and cut-off scores', about: 'French-language proficiency rounds invite candidates with strong French results. IRCC sets the exact requirement for each year’s version of the category.' },
  health: { slug: 'healthcare', short: 'Healthcare', kw: 'Healthcare Draw', h1: 'Healthcare draws and cut-off scores', about: 'Healthcare and social services rounds invite candidates with recent work experience in the eligible occupations listed by IRCC for each version of the category.' },
  trades: { slug: 'trades', short: 'Trades', kw: 'Trades Draw', h1: 'Trades draws and cut-off scores', about: 'Trade occupation rounds invite candidates with recent work experience in the trades listed by IRCC for each version of the category.' },
  stem: { slug: 'stem', short: 'STEM', kw: 'STEM Draw', h1: 'STEM draws and cut-off scores', about: 'STEM rounds invited candidates with recent work experience in eligible science, technology, engineering and math occupations.' },
  transport: { slug: 'transport', short: 'Transport', kw: 'Transport Draw', h1: 'Transport draws and cut-off scores', about: 'Transport occupation rounds invite candidates with recent work experience in the transport occupations listed by IRCC.' },
  education: { slug: 'education', short: 'Education', kw: 'Education Draw', h1: 'Education draws and cut-off scores', about: 'Education occupation rounds invite candidates with recent work experience in the education occupations listed by IRCC.' },
  agriculture: { slug: 'agriculture', short: 'Agriculture', kw: 'Agriculture Draw', h1: 'Agriculture and agri-food draws', about: 'Agriculture and agri-food rounds invited candidates with recent work experience in the eligible occupations.' },
  managers: { slug: 'senior-managers', short: 'Senior managers', kw: 'Senior Managers Draw', h1: 'Senior managers draws and cut-off scores', about: 'This category invites senior managers with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  physicians: { slug: 'physicians', short: 'Physicians', kw: 'Physicians Draw', h1: 'Physicians draws and cut-off scores', about: 'This category invites physicians with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  researchers: { slug: 'researchers', short: 'Researchers', kw: 'Researchers Draw', h1: 'Researchers draws and cut-off scores', about: 'This category invites researchers with Canadian work experience, as defined by IRCC for the 2026 version of the category.' },
  general: { slug: 'general', short: 'General', kw: 'General Draw', h1: 'General (all-program) draws', about: 'General rounds invite the top-ranked candidates from all three federal programs. They were the main type of round until category and program rounds took over.' },
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
  const rows = all.map((r) => `<tr><td data-sort="${r.date}">${shortDate(r.date)}</td><td class="n">${esc(r.n)}</td><td>${esc(r.name)}</td><td class="n">${fmt(r.size)}</td><td class="n">${fmt(r.crs)}</td></tr>`).join('');
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
  <p class="lede">The last ${esc(meta.short)} round was #${esc(last.n)} on ${longDate(last.date)}: ${fmt(last.size)} invitations, and the lowest score invited was ${fmt(last.crs)}. There have been ${fmt(all.length)} of them since ${all.at(-1).date.slice(0, 4)}; the chart shows how the cut-off has moved and the table has every round.</p>
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
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: `Express Entry ${meta.short} rounds of invitations`, description: `All ${all.length} Express Entry ${meta.short} rounds with date, invitations and lowest CRS score invited.`, url: SITE.url + path, isBasedOn: draws.page, license: 'https://www.canada.ca/en/transparency/terms.html', dateModified: last.date, spatialCoverage: 'Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
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
  <h1>Express Entry categories in 2026</h1>
  <p class="lede">IRCC hasn't held a general round since 2024: invitations now go out through program rounds such as the CEC, or through categories. For each of the ${C.length} categories you'll find who qualifies, the occupations that count (with NOC codes) and the scores of its recent rounds.</p>
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
${isLive('/noc-code-finder/') ? '<p>Not sure which NOC code is yours? Search your job title in the <a href="/noc-code-finder/">NOC code finder</a>.</p>' : ''}
${retired.length ? `<h2>Categories no longer on the list</h2><p>${retired.map((c) => `<a href="/express-entry-draws/${CAT_PAGES[c.id].slug}/">${esc(CAT_PAGES[c.id].short)}</a>`).join(' and ')} had their own rounds in earlier years but are not among IRCC's current categories. Their history stays on our draws pages.</p>` : ''}
<h2>Sources</h2>
<ul><li><a href="${cats.source}" rel="noopener">Express Entry: Category-based selection</a>, IRCC, modified ${longDate(cats.sourceModified)}</li><li><a href="${draws.page}" rel="noopener">Express Entry rounds of invitations</a>, IRCC</li></ul>
</article>`;
  return page({ path: '/express-entry-categories/', title: 'Express Entry Categories 2026: Eligibility, NOC List, Cut-offs', description: `The ${C.length} Express Entry categories for 2026: requirements, eligible occupations with NOC codes and the cut-off scores of each category's recent rounds.`, body, crumbs: [['Home', '/'], ['Express Entry categories', '/express-entry-categories/']] });
}

// ---------- Score chart pages, one per test ----------
const CHART_PAGES = {
  celpip: { slug: 'celpip-score-chart', short: 'CELPIP', title: 'CELPIP Score Chart and CLB Calculator for Express Entry (2026)', h1: 'CELPIP score chart and CLB converter', extra: 'For CLB 4 to 10, each CELPIP-General level is the same number as the CLB level: a 9 in an ability is CLB 9. Levels 11 and 12 count as CLB 10. CELPIP-General LS, the speaking and listening version, is not accepted for Express Entry.' },
  ielts: { slug: 'ielts-score-chart', short: 'IELTS', title: 'IELTS to CLB Chart 2026 (and CLB to IELTS) for Canada PR', h1: 'IELTS to CLB chart for Canada PR', extra: 'Only IELTS General Training is accepted for Express Entry; IELTS Academic is not, and neither are IELTS One Skill Retake results. Listening asks for more than the other abilities from CLB 8 up: CLB 9 is 8.0 in listening but 7.0 in speaking, reading and writing.' },
  tef: { slug: 'tef-canada-score-chart', short: 'TEF Canada', title: 'TEF Canada Score Chart: TEF to CLB and NCLC Calculator (2026)', h1: 'TEF Canada score chart and NCLC converter', extra: 'Each ability has its own scale: speaking and writing are scored out of 450, listening out of 360 and reading out of 300. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  tcf: { slug: 'tcf-canada-score-chart', short: 'TCF Canada', title: 'TCF Canada Score Chart: TCF to CLB and NCLC Calculator (2026)', h1: 'TCF Canada score chart and NCLC converter', extra: 'Speaking and writing are scored out of 20; listening and reading out of 699. NCLC is the French name for the CLB levels; NCLC 7 is CLB 7.' },
  pte: { slug: 'pte-core-score-chart', short: 'PTE Core', title: 'PTE Core Score Chart and PTE to CLB Calculator (2026)', h1: 'PTE Core score chart and CLB converter', extra: 'Only PTE Core is accepted for Express Entry; PTE Academic results are not. Each ability has its own thresholds, so the same score can give different CLB levels in speaking and in listening.' },
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
  <p class="lede">IRCC turns each ${esc(t.name)} ability into a ${name} level, and the level is what gets scored. The chart shows the result you need for each level; type yours to see your levels, whether they meet each program's minimum and the CRS points they're worth.</p>
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
  <h1>CELPIP to IELTS converter</h1>
  <p class="lede">Have a CELPIP result and want the IELTS General Training equivalent, or the other way round? Both tests map to the same CLB levels, so the comparison is exact level by level. PTE Core is in the table too.</p>
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
  <h1>When is the next Express Entry draw?</h1>
  <p class="lede">IRCC never announces rounds in advance. What it does publish is every past round, so this page tells you how often each program and category has been drawn in the last 12 months and how long it has been since the last one.</p>
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
  <h1>How to increase your CRS score</h1>
  <p class="lede">Some changes add a handful of points, others add hundreds. Each option below comes with the exact points it gives under IRCC's current rules. To try them on your own profile, use the "How your score could change" panel in the <a href="/">CRS calculator</a>.</p>
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
  <h1>CRS points by age</h1>
  <p class="lede">Age points peak between 20 and 29 and then drop every birthday until they reach zero at 45. The table shows the points for each age, single or with a partner coming with you.</p>
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
  <h1>Physical presence calculator for Canadian citizenship</h1>
  <p class="lede">You need ${fmt(c.requiredDays)} days in Canada in the ${c.periodYears} years before you apply, and time spent here before you became a permanent resident counts at half. Add your trips and the calculator tells you whether you're there yet, or the first date you will be.</p>
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
  <h1>Proof of funds for Express Entry</h1>
  <p class="lede">IRCC wants to see that you can support yourself and your family when you land. The amount depends on family size; enter yours to see it, and check whether you even need to show it.</p>
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
  <h1>PR residency obligation calculator</h1>
  <p class="lede">To keep permanent resident status you need 730 days in Canada in every five-year period. Add your trips before renewing your PR card and see where you stand, including time abroad that still counts.</p>
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
  <h1>OINP points calculator for the Ontario Workforce Priority stream</h1>
  <p class="lede">Since July 2026 this is the only OINP stream taking expressions of interest. Score your profile with the same factors and point values Ontario publishes.</p>
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
  const rows = d.rounds.map((x) => `<tr data-s="${x.stream}"><td data-sort="${x.date}">${shortDate(x.date)}</td><td>${esc(x.streamName)}</td><td class="n">${fmt(x.invitations)}</td><td class="n">${esc(x.scoreText || '')}</td><td>${esc(x.notes || '')}</td></tr>`).join('');
  const chips = `<button type="button" data-s="all" aria-pressed="true">All (${d.rounds.length})</button>` + streams.map((s) => `<button type="button" data-s="${s}" aria-pressed="false">${esc(name(s).replace('Employer Job Offer: ', ''))}</button>`).join('');
  const last = d.rounds[0];
  const owpN = d.rounds.filter((x) => x.stream === 'owp').length;
  const y = last.date.slice(0, 4);
  const yr = d.rounds.filter((x) => x.date.startsWith(y));
  const body = `
<section class="intro">
  <h1>OINP draws</h1>
  <p class="lede">Every invitation round Ontario has published since 2021, ${fmt(d.rounds.length)} in total, by stream, with the number invited and the lowest score that made it.</p>
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
  <h1>MPNP points calculator</h1>
  <p class="lede">Manitoba ranks expressions of interest out of ${fmt(r.max)}. Score yours with the official grid. It applies to the ${esc(r.applies)}.</p>
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
  const rows = d.map((x) => `<tr><td data-sort="${x.date}">${shortDate(x.date)}</td><td class="n"><a href="${x.url}" rel="noopener">#${x.n}</a></td><td class="n">${fmt(x.laas)}</td><td class="n">${x.expressEntry === null ? '' : fmt(x.expressEntry)}</td><td>${esc(scores(x))}</td></tr>`).join('');
  const lastSegs = last.segments.map((s) => `<tr><td>${esc(s.group || '')}<div class="small">${esc(s.criteria || '')}</div></td><td class="n">${fmt(s.laas)}</td><td class="n">${s.minScore ?? '–'}</td></tr>`).join('');
  const swm = d.flatMap((x) => x.segments.filter((s) => s.group === 'Skilled Worker in Manitoba' && s.minScore).map((s) => ({ date: x.date, crs: s.minScore }))).filter((x) => x.date >= `${Number(y) - 3}${last.date.slice(4)}`);
  const missing = []; const have = new Set(d.map((x) => x.n)); for (let i = 1; i <= last.n; i++) if (!have.has(i)) missing.push(i);
  const body = `
<section class="intro">
  <h1>MPNP draws</h1>
  <p class="lede">All ${fmt(d.length)} Manitoba expression of interest draws published since 2015, with how many Letters of Advice to Apply went out and the lowest score invited.</p>
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
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Manitoba PNP Expression of Interest draws', description: `${d.length} MPNP EOI draws with letters of advice to apply and lowest ranking scores.`, url: SITE.url + '/mpnp-draws/', isBasedOn: mpnpDraws.source, license: 'https://www.gov.mb.ca/legal/copyright.html', dateModified: last.date, spatialCoverage: 'Manitoba, Canada', creator: { '@type': 'Organization', name: SITE.name, url: SITE.url } }];
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
  <h1>SINP points calculator</h1>
  <p class="lede">Saskatchewan scores International Skilled Worker candidates out of ${r.max}, and you need at least ${r.minimumToApply} to submit an expression of interest under Saskatchewan Express Entry, Occupations In-Demand or Employment Offer.</p>
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
  const rows = s.map((x) => `<tr><td data-sort="${x.date}">${shortDate(x.date)}</td><td>${esc(x.subcategory)}</td><td class="n">${x.minScore}</td><td class="n">${fmt(x.invited)}</td><td>${esc(x.target)}</td></tr>`).join('');
  const byYear = [...new Set(s.map((x) => x.date.slice(0, 4)))].map((y) => { const r = s.filter((x) => x.date.startsWith(y)); return `<tr><td>${y}</td><td class="n">${r.length}</td><td class="n">${fmt(r.reduce((a, x) => a + x.invited, 0))}</td><td class="n">${Math.min(...r.map((x) => x.minScore))}–${Math.max(...r.map((x) => x.minScore))}</td></tr>`; }).join('');
  const ee = s.filter((x) => x.subcategory === 'Express Entry').map((x) => ({ date: x.date, crs: x.minScore }));
  const lastYear = last.date.slice(0, 4);
  const body = `
<section class="intro">
  <h1>SINP draws</h1>
  <p class="lede">Saskatchewan's published International Skilled Worker selections: ${s.length} since ${s.at(-1).date.slice(0, 4)}, with the lowest score invited out of 110.</p>
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
  const recent = AAIP_STREAMS && Object.keys(AAIP_STREAMS).filter((s) => d.some((x) => x.stream === s)).map((s) => { const x = d.find((y) => y.stream === s); return `${esc(AAIP_STREAMS[s])}: ${x.minScore} on ${shortDate(x.date)}`; });
  const body = `
<section class="intro">
  <h1>AAIP points calculator</h1>
  <p class="lede">Alberta scores Worker expressions of interest out of ${r.max}. This calculator uses the points grid Alberta published on ${longDate(r.gridDate)}.</p>
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
  const rows = d.map((x) => `<tr data-s="${x.stream}"><td data-sort="${x.date}">${shortDate(x.date)}</td><td>${esc(x.focus)}</td><td class="n">${x.minScore ?? ''}</td><td class="n">${esc(x.invitationsText)}</td></tr>`).join('');
  const chips = `<button type="button" data-s="all" aria-pressed="true">All (${d.length})</button>` + streams.map((s) => `<button type="button" data-s="${s}" aria-pressed="false">${esc(AAIP_STREAMS[s])}</button>`).join('');
  const aos = d.filter((x) => x.stream === 'aos' && x.minScore).map((x) => ({ date: x.date, crs: x.minScore }));
  const poolRows = Object.entries(a.pool).map(([k, v]) => `<tr${k === 'Total' ? ' class="section"' : ''}><td>${esc(k)}</td><td class="n">${fmt(v)}</td></tr>`).join('');
  const y = last.date.slice(0, 4);
  const body = `
<section class="intro">
  <h1>AAIP draws in ${y}</h1>
  <p class="lede">${d.length} Alberta draws so far this year, by stream, with the minimum score and the number of invitations, plus how many expressions of interest are waiting in the pool.</p>
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
  <h1>FSW 67 points calculator</h1>
  <p class="lede">Before you can enter the Express Entry pool as a Federal Skilled Worker, you need 67 points out of 100 on a separate grid. This is that grid, not the CRS.</p>
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
  return page({ path: '/fsw-67-points-calculator/', title: 'FSW 67 Points Calculator: Canada PR Points Check (2026)', description: 'Check if you reach 67 of 100 points for the Federal Skilled Worker Program: language, education, experience, age, job offer and adaptability, from IRCC rules.', body, scripts, crumbs: [['Home', '/'], ['FSW 67 points calculator', '/fsw-67-points-calculator/']] });
}

function cecPage() {
  const r = cec;
  const { recent, all } = catStats('cec');
  const last = all[0];
  const body = `
<section class="intro">
  <h1>Canadian Experience Class requirements</h1>
  <p class="lede">You qualify for the CEC with one year of skilled work in Canada in the last three years and the right language level for your job. Check each requirement here, then see how your score compares with recent CEC rounds.</p>
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
  return page({ path: '/cec-eligibility-calculator/', title: 'CEC Requirements 2026: Canadian Experience Class Eligibility Check', description: 'Check if you qualify for the Canadian Experience Class: 1,560 hours of Canadian skilled work in 3 years, CLB 7 or 5 by TEER, and recent CEC cut-offs.', body, scripts, crumbs: [['Home', '/'], ['CEC eligibility calculator', '/cec-eligibility-calculator/']] });
}

// ---------- Super visa and parents sponsorship income ----------
const tableFor = (amounts, extra) => (n) => (n <= 7 ? amounts[n] : amounts[7] + (n - 7) * extra);
function superVisaPage() {
  const r = sv;
  const rows = Object.entries(r.amounts).map(([n, v]) => `<tr><td>${n}</td><td class="n">$${fmt(v)}</td></tr>`).join('') + `<tr><td>Each additional person</td><td class="n">+$${fmt(r.eachAdditional)}</td></tr>`;
  const num = (id, label, hint, v = 0) => `<div class="field"><label for="${id}">${label}</label><input type="number" id="${id}" name="${id}" min="0" max="20" step="1" value="${v}" inputmode="numeric">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const body = `
<section class="intro">
  <h1>Super visa income requirement</h1>
  <p class="lede">Before parents or grandparents can come on a super visa, the child or grandchild inviting them has to earn a minimum income set by family size. Check the amount and whether the income clears it.</p>
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
  <h1>Income needed to sponsor parents and grandparents</h1>
  <p class="lede">You have to meet the income threshold in each of the 3 tax years before you apply, for your family size. These are IRCC's figures for the ${esc(r.intake)} intake.</p>
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

// ---------- British Columbia (BC PNP) ----------
function bcCalcPage() {
  const r = bcsirs;
  const opt = (arr) => arr.map(([l, p], i) => `<option value="${i}">${esc(l)} (${p})</option>`).join('');
  const t2 = (arr) => arr.map(([l, p]) => `<tr><td>${esc(l)}</td><td class="n">${p}</td></tr>`).join('');
  const d = bcDraws.draws;
  const lastDate = d[0].date;
  const latest = d.filter((x) => x.date === lastDate && x.minScore !== null);
  const wageRows = [[70, 55], [60, 45], [50, 35], [40, 25], [30, 15], [20, 5], [16, 1]].map(([w, p]) => `<tr><td>$${w}.00${w === 70 ? ' or more' : ` to $${w}.99`}</td><td class="n">${p}</td></tr>`).join('') + '<tr><td>Less than $16.00</td><td class="n">0</td></tr>';
  const body = `
<section class="intro">
  <h1>BC PNP points calculator</h1>
  <p class="lede">B.C. ranks Skills Immigration registrations out of ${r.max}. Score yours with the factors in the official program guide and compare it with the latest invitations.</p>
  <p class="meta"><span>Program guide effective ${longDate(r.guideEffective)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">BC PNP Skills Immigration Program Guide (PDF)</a></span></p>
</section>
<div class="tool">
<form id="bc-form" novalidate>
  <fieldset><legend>Directly related work experience</legend>
    <div class="field"><label for="experience">Experience in the occupation of your B.C. job offer, last 10 years</label><select id="experience" name="experience">${opt(r.experience.options)}</select><span class="hint">Part-time counts at 50% of the time worked.</span></div>
    <div class="field check"><input type="checkbox" id="expCanada" name="expCanada"><label for="expCanada">At least 1 year of that experience in Canada, while authorized to work (+${r.experience.canada})</label></div>
    <div class="field check"><input type="checkbox" id="expBC" name="expBC"><label for="expBC">Currently working full time in B.C. for the employer and in the occupation of your registration (+${r.experience.currentBC})</label></div>
  </fieldset>
  <fieldset><legend>Education</legend>
    <div class="field"><label for="education">Highest completed education</label><select id="education" name="education">${opt(r.education.options)}</select></div>
    <div class="field"><label for="eduPlace">Where you completed that highest level</label><select id="eduPlace" name="eduPlace"><option value="none">Outside Canada</option><option value="bc">At a post-secondary institution in B.C. (+${r.education.bc})</option><option value="canada">At a post-secondary institution in Canada, outside B.C. (+${r.education.canada})</option></select></div>
    <div class="field check"><input type="checkbox" id="designation" name="designation"><label for="designation">Eligible B.C. professional designation for the job offered, such as a trade certificate or a listed health or early childhood designation (+${r.education.designation})</label></div>
  </fieldset>
  <fieldset><legend>Language</legend>
    <div class="field"><label for="language">Lowest CLB level of your four abilities</label><select id="language" name="language">${opt(r.language.options)}</select><span class="hint">Convert your results with the <a href="/clb-converter/">CLB converter</a>.</span></div>
    <div class="field check"><input type="checkbox" id="both" name="both"><label for="both">Valid English and French tests, both at CLB 4 or higher in all four abilities (+${r.language.both})</label></div>
  </fieldset>
  <fieldset><legend>B.C. job offer</legend>
    <div class="field"><label for="hourly">Hourly wage (CAD)</label><input type="number" id="hourly" name="hourly" min="0" step="0.01" inputmode="decimal"><span class="hint">Base pay only: no bonuses, tips, overtime or allowances.</span></div>
    <div class="row"><div class="field"><label for="annual">Or annual salary (CAD)</label><input type="number" id="annual" name="annual" min="0" step="100" inputmode="numeric"></div>
    <div class="field"><label for="hours">Hours per week</label><input type="number" id="hours" name="hours" min="30" max="40" value="40" inputmode="numeric"><span class="hint">Between 30 and 40 for the calculation.</span></div></div>
    <p class="small" id="wage-note"></p>
    <div class="field"><label for="area">Main work location</label><select id="area" name="area">${opt(r.area.options)}</select></div>
    <div class="field check"><input type="checkbox" id="regional" name="regional"><label for="regional">Regional experience or regional alumni outside Metro Vancouver (+${r.area.regional}, only with a job in Area 2 or 3)</label></div>
  </fieldset>
</form>
<aside class="results" aria-label="Your BC PNP score">
  <div class="total"><span><span class="score" id="total" aria-live="polite">0</span> <span class="of">/ ${r.max}</span></span><span class="small">Registration score</span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
  <p class="small">Latest invitations (${longDate(lastDate)}): ${latest.map((x) => `${esc(x.type)} ${x.minScore}`).join('; ')}. Most rounds target occupations, so the score alone does not decide; see the <a href="/bc-pnp-draws/">BC PNP draws</a>.</p>
</aside>
</div>
<article class="prose">
<h2>How the score works</h2>
<p>B.C. scores Skills Immigration registrations on human capital (up to 120 points) and economic factors (up to 80). If invited, everything you declared is checked against your application.</p>
<h3>Directly related work experience (maximum ${r.experience.max})</h3><div class="table-scroll"><table><tbody>${t2(r.experience.options)}<tr><td>At least 1 year of directly related experience in Canada</td><td class="n">+${r.experience.canada}</td></tr><tr><td>Currently working full time in B.C. for the employer, in the occupation registered</td><td class="n">+${r.experience.currentBC}</td></tr></tbody></table></div>
<h3>Education (maximum ${r.education.max})</h3><div class="table-scroll"><table><tbody>${t2(r.education.options)}<tr><td>Highest level completed in B.C.</td><td class="n">+${r.education.bc}</td></tr><tr><td>Highest level completed in Canada, outside B.C.</td><td class="n">+${r.education.canada}</td></tr><tr><td>Eligible professional designation in B.C.</td><td class="n">+${r.education.designation}</td></tr></tbody></table></div>
<h3>Language (maximum ${r.language.max})</h3><p>Based on the lowest CLB of the four abilities.</p><div class="table-scroll"><table><tbody>${t2(r.language.options)}<tr><td>Both English and French at CLB 4 or higher</td><td class="n">+${r.language.both}</td></tr></tbody></table></div>
<h3>Hourly wage (maximum ${r.wage.max})</h3><p>One point for each dollar of hourly wage above $15: $16.00 gives 1 point and $70.00 or more gives the maximum of 55. If your offer is annual, B.C. divides it by 52 weeks and by your weekly hours, counting no fewer than 30 and no more than 40 hours.</p><div class="table-scroll"><table><tbody>${wageRows}</tbody></table></div>
<h3>Area of employment (maximum ${r.area.max})</h3><div class="table-scroll"><table><tbody>${t2(r.area.options)}<tr><td>Regional experience or regional alumni (Area 2 or 3 only)</td><td class="n">+${r.area.regional}</td></tr></tbody></table></div>
<p>A nomination through the BC PNP's Express Entry option adds 600 CRS points; see the <a href="/">CRS calculator</a>.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">BC PNP Skills Immigration Program Guide</a>, Part 8, effective ${longDate(r.guideEffective)}</li></ul>
</article>`;
  const scripts = `${jsonScript('bc-rules', r)}<script type="module" src="/js/bcpnp.js"></script>`;
  return page({ path: '/bc-pnp-points-calculator/', title: 'BC PNP Points Calculator 2026: Skills Immigration Score (SIRS)', description: `Calculate your BC PNP Skills Immigration registration score out of ${r.max}: experience, education, language, wage and area, from the official guide.`, body, scripts, crumbs: [['Home', '/'], ['BC PNP points calculator', '/bc-pnp-points-calculator/']] });
}

function bcDrawsPage() {
  const b = bcDraws;
  const d = b.draws;
  const dates = [...new Set(d.map((x) => x.date))];
  const last = dates[0];
  const y = last.slice(0, 4);
  const types = [...new Set(d.map((x) => x.type))];
  const stat = types.map((t) => { const r = d.filter((x) => x.type === t); const sc = r.map((x) => x.minScore).filter((x) => x !== null); return `<tr><td>${esc(t)}</td><td class="n">${new Set(r.map((x) => x.date)).size}</td><td class="n">${sc.length ? `${Math.min(...sc)}–${Math.max(...sc)}` : '–'}</td><td>${r[0].date}${r[0].minScore !== null ? `, ${r[0].minScore}` : ''}</td></tr>`; }).join('');
  const rows = d.map((x) => `<tr><td data-sort="${x.date}">${shortDate(x.date)}</td><td>${esc(x.type)}</td><td>${esc(x.factors)}${x.note ? `<div class="small">${esc(x.note)}</div>` : ''}</td><td class="n">${x.minScore ?? 'N/A'}</td><td class="n">${esc(x.invitationsText)}</td></tr>`).join('');
  const lastRows = d.filter((x) => x.date === last);
  const max = Math.max(...b.pool.ranges.map((r) => r.count));
  const W = 760, rowH = 28, H = b.pool.ranges.length * rowH + 10;
  const bars = b.pool.ranges.map((r, i) => `<text x="0" y="${i * rowH + 18}">${r.range}</text><rect class="bar-r" x="80" y="${i * rowH + 6}" height="16" width="${((r.count / max) * 560).toFixed(1)}" rx="3"/><text x="${(86 + (r.count / max) * 560).toFixed(1)}" y="${i * rowH + 18}">${fmt(r.count)}</text>`).join('');
  const health = d.filter((x) => x.type === 'Care: Health' && x.minScore).map((x) => ({ date: x.date, crs: x.minScore }));
  const body = `
<section class="intro">
  <h1>BC PNP draws in ${y}</h1>
  <p class="lede">Every Skills Immigration invitation round B.C. has published this year, by type, with minimum scores, plus how the ${fmt(b.pool.total)} registrations in the pool are spread by score.</p>
  <p class="meta"><span>WelcomeBC page updated ${longDate(b.pageUpdated)}</span><span>Updated automatically</span><span>Source: <a href="${b.source}" rel="noopener">BC PNP invitations to apply</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest invitations</div><div class="v" style="font-size:1.2rem">${longDate(last)}</div><div class="small">${lastRows.length} selection${lastRows.length > 1 ? 's' : ''}</div></div>
  <div class="card"><div class="k">Invitation dates in ${y}</div><div class="v">${dates.filter((x) => x.startsWith(y)).length}</div></div>
  <div class="card"><div class="k">Registrations in the pool</div><div class="v">${fmt(b.pool.total)}</div><div class="small">on ${longDate(b.pool.asOf)}</div></div>
</div>
<h2>Latest invitations</h2>
<div class="table-scroll"><table><thead><tr><th>Type</th><th>Selection</th><th class="n">Minimum score</th><th class="n">Invitations</th></tr></thead><tbody>${lastRows.map((x) => `<tr><td>${esc(x.type)}</td><td>${esc(x.factors)}${x.note ? `<div class="small">${esc(x.note)}</div>` : ''}</td><td class="n">${x.minScore ?? 'N/A'}</td><td class="n">${esc(x.invitationsText)}</td></tr>`).join('')}</tbody></table></div>
<h2>By type, ${y}</h2>
<div class="table-scroll"><table><thead><tr><th>Type</th><th class="n">Dates</th><th class="n">Minimum scores</th><th>Latest</th></tr></thead><tbody>${stat}</tbody></table></div>
${health.length >= 2 ? `<h2>Care: Health, minimum score</h2>${catChart(health)}` : ''}
<h2>Registration pool by score</h2>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="BC PNP registrations by score range">${bars}</svg>
<h2>All ${y} invitations</h2>
<div class="table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Selection</th><th class="n">Minimum score</th><th class="n">Invitations</th></tr></thead><tbody>${rows}</tbody></table></div>
<article class="prose">
<h2>How to read it</h2>
<p>Scores are BC PNP registration points out of 200, not CRS points; estimate yours with the <a href="/bc-pnp-points-calculator/">BC PNP points calculator</a>. Most rounds only consider registrations in priority occupations (child care, health, veterinary care, construction), so a minimum score applies only within that group. High economic impact rounds invite either by wage or by score. "&lt;5" is how B.C. reports fewer than 5 invitations. Earlier years are on WelcomeBC's <a href="${b.archive}" rel="noopener">archives page</a>.</p>
<p>BC nominees through Express Entry get 600 CRS points; federal rounds for nominees are on the <a href="/express-entry-draws/pnp/">PNP draws</a> page.</p>
<h2>Sources</h2>
<ul><li><a href="${b.source}" rel="noopener">BC PNP invitations to apply</a>, WelcomeBC, updated ${longDate(b.pageUpdated)}</li></ul>
</article>`;
  return page({ path: '/bc-pnp-draws/', title: `BC PNP Draws ${y}: Latest Skills Immigration Invitations`, description: `Latest BC PNP draw: ${longDate(last)}. All ${y} Skills Immigration invitations by type with minimum scores, and the ${fmt(b.pool.total)} registrations in the pool by score.`, body, crumbs: [['Home', '/'], ['BC PNP draws', '/bc-pnp-draws/']] });
}

// ---------- NOC code finder ----------
function nocPage() {
  const n = noc, r = nocRules;
  const catByCode = {};
  for (const c of cats.categories) for (const o of c.occupations || []) (catByCode[o.noc] ||= []).push([c.id, c.name]);
  const meta = { teer: Object.fromEntries(r.teer.map(([t, d, e]) => [t, [t, d, e]])), cec: cec.languageMin, cats: catByCode, sowp: isLive('/spousal-open-work-permit/') ? sowp.selectNoc : null };
  const counts = [0, 1, 2, 3, 4, 5].map((t) => n.units.filter((u) => u.teer === t).length);
  const catCount = Object.keys(catByCode).length;
  const groups = Object.entries(n.broad).map(([b, title]) => { const us = n.units.filter((u) => String(u.b) === b); return `<details><summary>${b}. ${esc(title)} (${us.length})</summary><ul>${us.map((u) => `<li><a href="?q=${u.c}">${u.c}</a> ${esc(u.t)} <span class="small">TEER ${u.teer}</span></li>`).join('')}</ul></details>`; }).join('');
  const fsw = isLive('/fsw-67-points-calculator/') ? '<a href="/fsw-67-points-calculator/">FSW 67 points calculator</a>' : 'FSW 67-point grid';
  const cecL = isLive('/cec-eligibility-calculator/') ? '<a href="/cec-eligibility-calculator/">CEC eligibility calculator</a>' : 'CEC requirements';
  const body = `
<section class="intro">
  <h1>NOC code finder</h1>
  <p class="lede">Type your job title and get your NOC 2021 code and TEER. You'll also see what that TEER means for Express Entry and whether your job is on one of IRCC's ${cats.checked.slice(0, 4)} category lists.</p>
  <p class="meta"><span>${n.units.length} occupations</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.dataset}" rel="noopener">Statistics Canada, NOC 2021 Version 1.0</a></span></p>
</section>
<form id="noc-form" class="noc-search" role="search"><label class="visually-hidden" for="noc-q">Job title or NOC code</label><input id="noc-q" type="search" autocomplete="off" placeholder="e.g. software developer, nurse, 72310"><button type="submit">Search</button></form>
<p class="small" id="noc-status" aria-live="polite">Type a job title or a code.</p>
<ul id="noc-results"></ul>
<p class="small">Pick the code whose main duties match what you actually did, not just the title: IRCC asks you to check the duties on the <a href="${r.nocSite}" rel="noopener">ESDC NOC website</a> (version NOC 2021 Version 1.0).</p>
<article class="prose">
<h2>TEER categories</h2>
<p>The second digit of a NOC 2021 code is its TEER category (training, education, experience and responsibilities). IRCC switched to NOC 2021 on ${longDate(r.switchDate)}.</p>
<div class="table-scroll"><table><thead><tr><th>TEER</th><th>Occupation types</th><th>IRCC examples</th><th class="n">Occupations</th></tr></thead><tbody>${r.teer.map(([t, d, e]) => `<tr><td>${t}</td><td>${esc(d)}</td><td>${esc(e)}</td><td class="n">${counts[t]}</td></tr>`).join('')}</tbody></table></div>
<h2>What your TEER means for Express Entry</h2>
<ul><li>Work in TEER 0, 1, 2 or 3 counts as skilled work for the Federal Skilled Worker Program and the Canadian Experience Class (see the ${fsw} and the ${cecL}).</li>
<li>For the CEC, the language minimum depends on the TEER of your job: CLB ${cec.languageMin.teer01} for TEER 0 and 1, CLB ${cec.languageMin.teer23} for TEER 2 and 3.</li>
<li>Category-based rounds only consider listed occupations. ${catCount} NOC codes are on IRCC's current lists; the finder flags them, and the full lists are on the <a href="/express-entry-categories/">Express Entry categories</a> page.</li>
<li>The occupation also decides several provincial streams, such as the <a href="/oinp-points-calculator/">OINP</a> and <a href="/bc-pnp-points-calculator/">BC PNP</a> scores.</li></ul>
<h2>All NOC 2021 occupations</h2>
<div class="noc-list">${groups}</div>
<h2>Sources</h2>
<ul><li><a href="${r.dataset}" rel="noopener">National Occupational Classification (NOC) 2021 Version 1.0</a>, Statistics Canada, Open Government Licence - Canada (dataset updated ${longDate(r.datasetModified)})</li>
<li><a href="${r.source}" rel="noopener">Find your National Occupational Classification</a>, IRCC, modified ${longDate(r.sourceModified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('noc-meta', meta)}<script type="module" src="/js/noc.js"></script>`;
  return page({ path: '/noc-code-finder/', title: 'NOC Code Finder 2021: Search Your Job Title, NOC Code and TEER', description: `Find your NOC 2021 code and TEER from ${fmt(n.units.reduce((t, u) => t + u.ex.length, 0))} official job titles, with what it means for Express Entry, the CEC and the 2026 category lists.`, body, scripts, crumbs: [['Home', '/'], ['NOC code finder', '/noc-code-finder/']] });
}

// ---------- Work permits: SOWP, BOWP, PGWP ----------
const nocTitle = Object.fromEntries(noc.units.map((u) => [u.c, u.t]));
const nocLink = (c) => (isLive('/noc-code-finder/') ? `<a href="/noc-code-finder/?q=${c}">${c}</a>` : c);
function sowpPage() {
  const r = sowp;
  const list = (t) => r.selectNoc.filter((c) => c[1] === String(t)).map((c) => `<li>${nocLink(c)} ${esc(nocTitle[c] || '')}</li>`).join('');
  const n2 = r.selectNoc.filter((c) => c[1] === '2').length, n3 = r.selectNoc.filter((c) => c[1] === '3').length;
  const body = `
<section class="intro">
  <h1>Spousal open work permit checker</h1>
  <p class="lede">Since ${longDate(r.rulesSince)} only some workers can bring a spouse on an open work permit. Enter your job's NOC code and situation to check, and see the ${r.selectNoc.length} TEER 2 and 3 jobs that still qualify.</p>
  <p class="meta"><span>IRCC page modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: open work permits for family members of foreign workers</a></span></p>
</section>
<div class="tool">
<form id="sowp-form" novalidate>
  <fieldset><legend>You, the worker in Canada</legend>
    <div class="field"><label for="pr">Have you applied for permanent residence?</label><select id="pr" name="pr"><option value="no">No</option><option value="econ">Yes, through an economic program or pilot (Express Entry, PNP, AIP and others)</option><option value="rural">Yes, through the Rural or Francophone Community Immigration Pilot</option></select></div>
    <div class="field check"><input type="checkbox" id="permitPr" name="permitPr"><label for="permitPr">My work permit was issued because I applied for that permanent residence program</label></div>
    <div class="field check"><input type="checkbox" id="pathway" name="pathway"><label for="pathway">My work permit came through a pathway to permanent residence (provincial nomination, AIP, Agri-Food Pilot, start-up visa, Quebec CSQ, Yukon Community Pilot) and I have not applied for PR yet</label></div>
    <div class="field"><label for="noc">NOC 2021 code of your job</label><input type="text" id="noc" name="noc" inputmode="numeric" maxlength="5" placeholder="e.g. 21231"><span class="hint" id="noc-hint">${isLive('/noc-code-finder/') ? 'Find it with the <a href="/noc-code-finder/">NOC code finder</a>.' : 'Five digits; the second digit is the TEER.'}</span></div>
    <div class="field"><label for="months">Months left on your work permit when your family member applies</label><input type="number" id="months" name="months" min="0" max="120" inputmode="numeric"></div>
    <div class="field"><label for="special">Special case</label><select id="special" name="special"><option value="none">None</option><option value="sip">I work on a significant investment project (SIP) in British Columbia</option><option value="qchealth">Quebec recruited me as a nurse, respiratory therapist or medical lab technologist</option><option value="student">I am a student, a co-op student or working off campus without a work permit</option><option value="pgwp">I applied for a PGWP and have no decision yet</option><option value="sowp">I hold a spousal open work permit myself</option></select></div>
  </fieldset>
  <fieldset><legend>Your family member</legend>
    <div class="field"><label for="who">Who is applying</label><select id="who" name="who"><option value="spouse">Spouse or common-law partner</option><option value="child">Dependent child (or their dependent child)</option></select></div>
  </fieldset>
</form>
<aside class="results" aria-label="Result">
  <div class="total"><span id="status" class="tag"></span></div>
  <p id="verdict"></p>
  <div class="cmp" id="checks"></div>
  <p class="small">Fees: CA$${r.fees.workPermit} work permit + CA$${r.fees.openHolder} open work permit holder fee.</p>
</aside>
</div>
<article class="prose">
<h2>The four situations that qualify</h2>
<ul>
<li><strong>You applied for permanent residence</strong> through an economic program and your work permit was issued because of it: your spouse and dependent children can apply, if your permit is valid for at least ${r.validityPathway} more months. For the Rural and Francophone Community Immigration Pilots only children qualify here; spouses have a separate open work permit under those pilots.</li>
<li><strong>You are on a pathway to permanent residence</strong> (for example with a provincial nomination) in a TEER 4 or 5 job: spouse and dependent children can apply, with at least ${r.validityPathway} months left on your permit.</li>
<li><strong>You work in a high-skilled job</strong>: any TEER 0 or 1 occupation, or one of the ${n2} TEER 2 and ${n3} TEER 3 occupations listed below, with at least ${r.validityHighSkilled} months left on your permit. Since ${longDate(r.rulesSince)} only spouses qualify, not children.</li>
<li><strong>You work on a significant investment project in B.C.</strong> (since ${longDate(r.sipBC.since)}): your spouse can apply whatever the TEER of your job, without the ${r.validityHighSkilled}-month rule.</li>
</ul>
<p>Workers in TEER 4 or 5 jobs who are not on a pathway to permanent residence can no longer bring family on this measure, although family members already in Canada can extend a permit that is shorter than yours. Since ${longDate(r.healthQuebec.since)} the ${r.validityHighSkilled}-month rule does not apply to spouses of nurses (NOC 31301), respiratory therapists (32103) and medical laboratory technologists (32120) recruited by Quebec.</p>
<h3>Not eligible</h3>
<p>Family members do not qualify if you made a refugee claim referred to the IRB, are subject to an unenforceable removal order, are a student (including co-op or off-campus work without a work permit), are waiting for a decision on your PGWP, or hold a spousal open work permit yourself.</p>
<h2>Eligible TEER 2 occupations (${n2})</h2>
<div class="noc-list"><ul>${list(2)}</ul></div>
<h2>Eligible TEER 3 occupations (${n3})</h2>
<div class="noc-list"><ul>${list(3)}</ul></div>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Open work permits for family members of foreign workers: who can apply</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${r.watchPages[0].url}" rel="noopener">Fees and overview</a>, IRCC, modified ${longDate(r.watchPages[0].modified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('sowp-rules', { select: r.selectNoc, high: r.validityHighSkilled, path: r.validityPathway })}<script type="module" src="/js/sowp.js"></script>`;
  return page({ path: '/spousal-open-work-permit/', title: 'Spousal Open Work Permit 2026: Eligibility Checker and TEER List', description: `Can your spouse get an open work permit? Check it by your NOC and TEER, with the ${r.selectNoc.length} eligible TEER 2 and 3 occupations and the 16-month rule, from IRCC.`, body, scripts, crumbs: [['Home', '/'], ['Spousal open work permit', '/spousal-open-work-permit/']] });
}

function bowpPage() {
  const r = bowp;
  const P = [
    ['ee', 'Express Entry (FSW, CEC or FST)', ['Live in Canada and plan to live outside Quebec', 'Valid work permit, or expired permit with maintained status, or eligible to restore', 'Principal applicant on the PR application', 'Complete PR application that passed the completeness check (a profile in the pool is not enough)', 'Acknowledgement of receipt letter']],
    ['pnpee', 'Provincial Nominee Program through Express Entry', ['Live in Canada and plan to live outside Quebec', 'Valid work permit, or expired permit with maintained status and authority to work, or eligible to restore', 'Principal applicant on the PR application', 'No employment restrictions as a condition of your nomination', 'Complete PR application that passed the completeness check', 'Acknowledgement of receipt letter (and nomination letter)']],
    ['pnp', 'Provincial Nominee Program, not through Express Entry', ['Live in Canada and plan to live outside Quebec', 'Valid work permit, or expired permit with maintained status, or eligible to restore', 'Principal applicant on the PR application', 'No employment restrictions as a condition of your nomination', 'Complete PR application that passed the eligibility assessment', 'Acknowledgement of receipt letter (and nomination letter)']],
    ['qsw', 'Quebec skilled worker', ['Live in Canada and plan to live in Quebec', 'Certificat de sélection du Québec (CSQ) valid when you applied for PR', 'Principal applicant on the PR application', 'PR application passed the completeness check', 'Valid work permit, or expired permit with maintained status, or eligible to restore']],
    ['home', 'Home Child Care Provider or Home Support Worker Pilot (opened 2019 to 2024)', ['Live in Canada and plan to live outside Quebec', 'Approved in principle for permanent residence', 'Proof of 6 months of qualifying work experience', 'Valid work permit, or applied to extend before it expired, or eligible to restore']],
    ['agri', 'Agri-Food Pilot', ['Live in Canada and plan to live outside Quebec', 'Valid work permit, or expired permit with maintained status, or eligible to restore', 'Principal applicant on the PR application', 'Approved in principle for permanent residence']],
  ];
  const body = `
<section class="intro">
  <h1>Bridging open work permit checker</h1>
  <p class="lede">A BOWP lets you keep working while IRCC processes your permanent residence application. Pick your program and tick the requirements you meet.</p>
  <p class="meta"><span>IRCC page modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: bridging open work permit</a></span></p>
</section>
<div class="tool">
<form id="bowp-form" novalidate>
  <fieldset><legend>Your permanent residence application</legend>
    <div class="field"><label for="program">Program you applied for</label><select id="program" name="program">${P.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select></div>
    <div id="reqs"></div>
  </fieldset>
</form>
<aside class="results" aria-label="Result">
  <div class="total"><span id="status" class="tag"></span></div>
  <p id="verdict" class="small"></p>
  <p class="small">Fees: CA$${r.fees.workPermit} work permit + CA$${r.fees.openHolder} open work permit holder fee = CA$${r.fees.workPermit + r.fees.openHolder}. Apply as an extension or change of conditions and choose "Open work permit".</p>
</aside>
</div>
<article class="prose">
<h2>Requirements by program</h2>
${P.map(([, n, reqs]) => `<h3>${esc(n)}</h3><ul>${reqs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
<p>Applicants under the Home Care Worker Immigration pilots opened in 2025 are not eligible for a BOWP. IRCC also lists rules for the caring for children and high medical needs classes (applications made before June 18, 2019) and for Quebec investors.</p>
<h2>Timing and travel</h2>
<p>Submitting an Express Entry profile is not applying for permanent residence: you can only ask for a BOWP after your PR application is in and you have the acknowledgement of receipt. Until then, extend your current work permit so it does not expire. You can leave Canada while the application is processed, but if your permit expires while you are away you lose your status and cannot work after returning until the new permit is approved. For PNP applicants, you must be in Canada with valid status when IRCC decides on the BOWP.</p>
<p>Your spouse may also qualify for an open work permit; see the ${isLive('/spousal-open-work-permit/') ? '<a href="/spousal-open-work-permit/">spousal open work permit checker</a>' : 'spousal open work permit rules'}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Bridging open work permit for permanent residence applicants</a>, IRCC, modified ${longDate(r.sourceModified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('bowp-rules', Object.fromEntries(P.map(([id, n, reqs]) => [id, reqs])))}<script type="module" src="/js/bowp.js"></script>`;
  return page({ path: '/bridging-open-work-permit/', title: 'Bridging Open Work Permit (BOWP) 2026: Eligibility Checker', description: 'Check if you can get a bridging open work permit while your PR application is processed: requirements for Express Entry, PNP, Quebec and pilots, fees and timing, from IRCC.', body, scripts, crumbs: [['Home', '/'], ['Bridging open work permit', '/bridging-open-work-permit/']] });
}

function pgwpPage() {
  const r = pgwp;
  const body = `
<section class="intro">
  <h1>PGWP calculator</h1>
  <p class="lede">How long your post-graduation work permit can be, the language level you need and the last day you can apply, worked out from your program and dates.</p>
  <p class="meta"><span>IRCC page modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: PGWP, who can apply</a></span></p>
</section>
<div class="tool">
<form id="pgwp-form" novalidate>
  <fieldset><legend>Your program</legend>
    <div class="field"><label for="level">Program type</label><select id="level" name="level"><option value="master">Master's degree</option><option value="degree">Bachelor's or doctoral degree</option><option value="uni">Other university program</option><option value="college">College, polytechnic or other non-university program</option></select></div>
    <div class="field"><label for="months">Program length (months)</label><input type="number" id="months" name="months" min="0" max="120" inputmode="numeric" value="24"><span class="hint">At least 8 months (900 hours in Quebec).</span></div>
    <div class="field"><label for="online">Share of the program done by distance learning (%)</label><input type="number" id="online" name="online" min="0" max="100" value="0" inputmode="numeric"></div>
    <div class="field check"><input type="checkbox" id="fulltime" name="fulltime" checked><label for="fulltime">Full-time student every semester (part-time allowed in the last one)</label></div>
    <div class="field check"><input type="checkbox" id="dli" name="dli" checked><label for="dli">The program is PGWP-eligible on the DLI list</label></div>
    <div class="field check"><input type="checkbox" id="before" name="before"><label for="before">I applied for my study permit before November 1, 2024</label></div>
    <div class="field check"><input type="checkbox" id="field" name="field"><label for="field">My program is in an eligible field of study</label></div>
  </fieldset>
  <fieldset><legend>Dates and language</legend>
    <div class="field"><label for="done">Date the school confirmed you completed the program</label><input type="date" id="done" name="done"></div>
    <div class="field"><label for="passport">Passport expiry date</label><input type="date" id="passport" name="passport"></div>
    <div class="field"><label for="clb">Lowest CLB/NCLC of your four test results</label><select id="clb" name="clb"><option value="0">No test yet</option>${[4, 5, 6, 7, 8, 9, 10].map((c) => `<option value="${c}">${c}</option>`).join('')}</select><span class="hint">Convert with the <a href="/clb-converter/">CLB converter</a>.</span></div>
    <div class="field check"><input type="checkbox" id="had" name="had"><label for="had">I already had a PGWP</label></div>
  </fieldset>
</form>
<aside class="results" aria-label="Result">
  <div class="total"><span><span class="score" id="len">0</span> <span class="of" id="len-unit">months</span></span><span id="status" class="tag"></span></div>
  <p class="small" id="len-note"></p>
  <div class="cmp" id="checks"></div>
</aside>
</div>
<article class="prose">
<h2>How long the PGWP is</h2>
<div class="table-scroll"><table><thead><tr><th>Program</th><th>PGWP length</th></tr></thead><tbody>
<tr><td>Less than 8 months</td><td>Not eligible</td></tr>
<tr><td>Master's degree of at least 8 months (since ${longDate(r.mastersRuleSince)})</td><td>Up to 3 years</td></tr>
<tr><td>Other programs of 8 months to less than 2 years</td><td>Up to the length of the program</td></tr>
<tr><td>Programs of 2 years or more</td><td>Up to 3 years</td></tr>
</tbody></table></div>
<p>The permit never goes past your passport's expiry date; if the passport is shorter, renew it and apply on paper to extend the PGWP. If you finished more than one eligible program of at least 8 months, IRCC may combine their lengths. If your program's lock-in date is on or after September 1, 2024, you must do at least half of it in class in Canada and any time studied outside Canada is deducted from the PGWP.</p>
<h2>Language and field of study</h2>
<p>Since ${longDate(r.languageSince)} most applicants must show language results: CLB ${r.clbDegree} (NCLC ${r.clbDegree}) in all four abilities for university programs, and CLB ${r.clbCollege} for college and other non-university programs. Graduates of programs other than bachelor's, master's and doctoral degrees whose study permit application was made on or after November 1, 2024 must also have studied in an eligible field. Flight school graduates are exempt from both.</p>
<h2>Deadline</h2>
<p>Apply within ${r.applyWithinDays} days of the school's confirmation that you completed the program, and your study permit must have been valid at some point in those ${r.applyWithinDays} days. You cannot get a second PGWP.</p>
<p>Canadian work on a PGWP counts toward the <a href="/">CRS</a>${isLive('/cec-eligibility-calculator/') ? ' and the <a href="/cec-eligibility-calculator/">Canadian Experience Class</a>' : ''}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">PGWP: who can apply</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${r.watchPages[0].url}" rel="noopener">About the PGWP (length)</a>, IRCC, modified ${longDate(r.watchPages[0].modified)}</li></ul>
</article>`;
  const scripts = `${jsonScript('pgwp-rules', { min: r.minMonths, days: r.applyWithinDays, clbDegree: r.clbDegree, clbCollege: r.clbCollege })}<script type="module" src="/js/pgwp.js"></script>`;
  return page({ path: '/pgwp-calculator/', title: 'PGWP Calculator 2026: Post-Graduation Work Permit Length and Eligibility', description: 'Calculate your PGWP length (up to 3 years), the CLB 7 or CLB 5 language requirement, field of study rules and your 180-day deadline, from IRCC.', body, scripts, crumbs: [['Home', '/'], ['PGWP calculator', '/pgwp-calculator/']] });
}

function feesPage() {
  const r = prFees;
  const rows = Object.values(r.programs).map((p) => `<tr><td>${esc(p.name)}</td><td class="n">$${fmt(p.pa)}</td><td class="n">$${fmt(p.spouse)}</td><td class="n">$${fmt(p.child)}</td></tr>`).join('');
  const body = `
<section class="intro">
  <h1>Canada PR fees calculator</h1>
  <p class="lede">What you'll pay IRCC for a permanent residence application, by program and family size, with the right of permanent residence fee and biometrics. Amounts as raised on ${longDate(r.lastIncrease)}.</p>
  <p class="meta"><span>IRCC fee list modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC fee list</a></span></p>
</section>
<div class="tool">
<form id="fees-form" novalidate>
  <fieldset><legend>Your application</legend>
    <div class="field"><label for="program">Program</label><select id="program" name="program">${Object.entries(r.programs).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join('')}</select></div>
    <div class="field check"><input type="checkbox" id="spouse" name="spouse"><label for="spouse">Include a spouse or common-law partner</label></div>
    <div class="field"><label for="kids">Dependent children</label><input type="number" id="kids" name="kids" min="0" max="15" value="0" inputmode="numeric"></div>
    <div class="field check"><input type="checkbox" id="rprf" name="rprf" checked><label for="rprf">Pay the right of permanent residence fee now</label></div>
    <div class="field"><label for="bio">People giving biometrics</label><input type="number" id="bio" name="bio" min="0" max="20" value="1" inputmode="numeric"></div>
  </fieldset>
</form>
<aside class="results" aria-label="Total fees">
  <div class="total"><span><span class="score" id="total">0</span> <span class="of">CAD</span></span><span class="small">Total IRCC fees</span></div>
  <div class="table-scroll"><table><tbody id="breakdown"></tbody></table></div>
</aside>
</div>
<article class="prose">
<h2>Fees by program (without the RPRF)</h2>
<div class="table-scroll"><table><thead><tr><th>Program</th><th class="n">Principal applicant</th><th class="n">Spouse or partner</th><th class="n">Each dependent child</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>For family sponsorship the principal amount is the $90 sponsorship fee plus the $570 processing fee.</p>
<h2>Right of permanent residence fee</h2>
<p>The RPRF is $${fmt(r.rprf)} for the principal applicant and for an accompanying spouse or partner. Dependent children don't pay it. You can pay it with the application or when IRCC approves it, and it is the only fee IRCC refunds after processing starts (if you withdraw or are refused).</p>
<h2>Other fees</h2>
<ul><li>Biometrics: $${r.biometrics.person} per person, or $${r.biometrics.family} at most for a family applying together.</li><li>Permanent resident card: $${r.prCard}.</li><li>Citizenship later on: $${r.citizenshipAdult} per adult, $${r.citizenshipMinor} per minor.</li></ul>
<p>On ${longDate(r.lastIncrease)} IRCC raised PR fees: the RPRF went from $${r.previous.rprf} to $${r.rprf} and the economic principal applicant fee from $${r.previous.economicPa} to $${r.programs.economic.pa}. Express Entry candidates also need the <a href="${isLive('/proof-of-funds-express-entry/') ? '/proof-of-funds-express-entry/' : '/'}">${isLive('/proof-of-funds-express-entry/') ? 'proof of funds' : 'CRS'}</a>${isLive('/proof-of-funds-express-entry/') ? ' required by IRCC' : ''}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Citizenship and immigration application fees</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${r.changes}" rel="noopener">Fee changes</a>, IRCC</li></ul>
</article>`;
  const scripts = `${jsonScript('fees-rules', r)}<script type="module" src="/js/fees.js"></script>`;
  return page({ path: '/canada-pr-fees/', title: 'Canada PR Fees 2026: Express Entry and PR Fee Calculator', description: `IRCC permanent residence fees after the ${longDate(r.lastIncrease)} increase: $${r.programs.economic.pa} processing plus $${r.rprf} RPRF per adult for Express Entry and PNP, $${r.programs.economic.child} per child. Calculate your total.`, body, scripts, crumbs: [['Home', '/'], ['Canada PR fees', '/canada-pr-fees/']] });
}

// ---------- Atlantic and rural programs ----------
const fundsRows = (arr, each) => arr.map((v, i) => `<tr><td>${i + 1}</td><td class="n">$${fmt(v)}</td></tr>`).join('') + `<tr><td>Each additional person</td><td class="n">+$${fmt(each)}</td></tr>`;
const teerOpts = (max) => Array.from({ length: max + 1 }, (_, t) => `<option value="${t}">TEER ${t}</option>`).join('');
function aipPage() {
  const r = aip;
  const body = `
<section class="intro">
  <h1>Atlantic Immigration Program eligibility</h1>
  <p class="lede">The AIP needs a job offer from a designated employer in New Brunswick, Nova Scotia, Prince Edward Island or Newfoundland and Labrador. Check the rest of the requirements here: experience, language, education and funds.</p>
  <p class="meta"><span>IRCC pages modified up to ${longDate([r.sourceModified, ...r.watchPages.map((w) => w.modified)].sort().at(-1))}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: Atlantic Immigration Program</a></span></p>
</section>
<div class="tool">
<form id="aip-form" novalidate>
  <fieldset><legend>Job offer</legend>
    <div class="field check"><input type="checkbox" id="designated" name="designated"><label for="designated">Full-time (30+ hours), non-seasonal job offer from a designated employer in an Atlantic province</label></div>
    <div class="field"><label for="offer">TEER of the job offer</label><select id="offer" name="offer">${teerOpts(4)}</select><span class="hint">${isLive('/noc-code-finder/') ? 'Find it with the <a href="/noc-code-finder/">NOC code finder</a>.' : 'The second digit of the NOC code.'}</span></div>
  </fieldset>
  <fieldset><legend>Work experience</legend>
    <div class="field check"><input type="checkbox" id="grad" name="grad"><label for="grad">I graduated from a 2-year program at a recognized Atlantic post-secondary institution less than 2 years ago (exempt from work experience)</label></div>
    <div class="field"><label for="exp">TEER of your work experience</label><select id="exp" name="exp">${teerOpts(4)}</select></div>
    <div class="field"><label for="hours">Paid hours in that occupation in the last ${r.years} years</label><input type="number" id="hours" name="hours" min="0" step="10" inputmode="numeric"><span class="hint">At least ${fmt(r.hours)} hours over at least 1 year; no self-employment.</span></div>
  </fieldset>
  <fieldset><legend>Language and education</legend>
    <div class="field"><label for="clb">Lowest CLB/NCLC of your four test results</label><select id="clb" name="clb"><option value="0">No test yet</option>${[4, 5, 6, 7, 8, 9, 10].map((c) => `<option value="${c}">${c}</option>`).join('')}</select></div>
    <div class="field"><label for="edu">Highest education (Canadian, or foreign with an ECA)</label><select id="edu" name="edu"><option value="0">Less than high school</option><option value="1">High school diploma</option><option value="2">One-year post-secondary credential or higher</option></select></div>
  </fieldset>
  <fieldset><legend>Settlement funds</legend>
    <div class="field check"><input type="checkbox" id="working" name="working"><label for="working">I already live and work in Canada with a valid work permit (no proof of funds needed)</label></div>
    <div class="row"><div class="field"><label for="family">Family size</label><input type="number" id="family" name="family" min="1" max="15" value="1" inputmode="numeric"></div>
    <div class="field"><label for="funds">Funds available (CAD)</label><input type="number" id="funds" name="funds" min="0" step="100" inputmode="numeric"></div></div>
  </fieldset>
</form>
<aside class="results" aria-label="Result">
  <div class="total"><span id="status" class="tag"></span></div>
  <div class="cmp" id="checks"></div>
  <p class="small">You also need a settlement plan from a service provider organization and the province's endorsement before applying for PR.</p>
</aside>
</div>
<article class="prose">
<h2>Job offer and work experience by TEER</h2>
<p>Your experience must be in the same TEER as the job offer or higher: ${fmt(r.hours)} paid hours in the last ${r.years} years, over at least 1 year, doing most of the main duties of your NOC. Job offers in TEER 0 to 3 must last at least 1 year from when you become a permanent resident; TEER 4 offers must be permanent.</p>
<div class="table-scroll"><table><thead><tr><th>Job offer</th><th>Experience accepted</th><th>Language</th><th>Education</th></tr></thead><tbody>${Object.entries(r.experienceTeer).map(([t, e]) => `<tr><td>TEER ${t}</td><td>TEER ${e.join(', ')}</td><td>CLB ${r.clb[t]}</td><td>${Number(t) <= 1 ? 'One-year post-secondary' : 'High school'}</td></tr>`).join('')}</tbody></table></div>
<p>Licensed practical nurses (NOC 31201) and registered nurses (31301) can use their experience for offers as nurse aides (33102) or home support workers (44101).</p>
<h2>Language tests</h2>
<p>CELPIP-General, IELTS General Training, PTE Core, TEF Canada or TCF Canada, less than 2 years old. Convert your results with the <a href="/clb-converter/">CLB converter</a>.</p>
<h2>Settlement funds (updated ${longDate(r.fundsUpdated)})</h2>
<div class="table-scroll"><table><thead><tr><th>Family members</th><th class="n">Funds needed (CAD)</th></tr></thead><tbody>${fundsRows(r.funds, r.fundsEach)}</tbody></table></div>
<p>Count yourself, your spouse and all dependent children, even if they are not coming. You don't need to show funds if you already live and work in Canada with a valid work permit.</p>
<h2>Designated employers by province</h2>
<ul>${r.provinces.map(([n, u]) => `<li><a href="${u}" rel="noopener">${esc(n)}</a></li>`).join('')}</ul>
<p>Provincial programs in the region: ${isLive('/nova-scotia-nominee-program/') ? '<a href="/nova-scotia-nominee-program/">Nova Scotia</a>' : 'Nova Scotia'}, ${isLive('/new-brunswick-pnp/') ? '<a href="/new-brunswick-pnp/">New Brunswick</a>' : 'New Brunswick'}, ${isLive('/pei-pnp/') ? '<a href="/pei-pnp/">Prince Edward Island</a>' : 'Prince Edward Island'}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Atlantic Immigration Program</a>, IRCC, modified ${longDate(r.sourceModified)}</li>${r.watchPages.map((w) => `<li><a href="${w.url}" rel="noopener">${esc(w.url.split('/').pop().replace('.html', '').replace(/-/g, ' '))}</a>, IRCC, modified ${longDate(w.modified)}</li>`).join('')}</ul>
</article>`;
  const scripts = `${jsonScript('aip-rules', { hours: r.hours, exp: r.experienceTeer, clb: r.clb, funds: r.funds, each: r.fundsEach })}<script type="module" src="/js/aip.js"></script>`;
  return page({ path: '/atlantic-immigration-program/', title: 'Atlantic Immigration Program 2026: AIP Eligibility Checker', description: `Check your eligibility for the Atlantic Immigration Program: ${fmt(r.hours)} hours of experience by TEER, CLB 5 or 4, education, settlement funds from $${fmt(r.funds[0])}, from IRCC.`, body, scripts, crumbs: [['Home', '/'], ['Atlantic Immigration Program', '/atlantic-immigration-program/']] });
}

function rcipPage() {
  const r = rcip;
  const body = `
<section class="intro">
  <h1>Rural Community Immigration Pilot</h1>
  <p class="lede">${r.communities.length} communities can recommend workers for permanent residence through this pilot. See which ones take part and check IRCC's requirements against your profile.</p>
  <p class="meta"><span>IRCC pages modified up to ${longDate([r.sourceModified, ...r.watchPages.map((w) => w.modified)].sort().at(-1))}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: Rural Community Immigration Pilot</a></span></p>
</section>
<div class="tool">
<form id="rcip-form" novalidate>
  <fieldset><legend>Job offer</legend>
    <div class="field"><label for="community">Community</label><select id="community" name="community">${r.communities.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field check"><input type="checkbox" id="designated" name="designated"><label for="designated">Job offer from an employer designated by that community, in one of its priority sectors or occupations</label></div>
    <div class="field"><label for="offer">TEER of the job offer</label><select id="offer" name="offer">${teerOpts(5)}</select></div>
  </fieldset>
  <fieldset><legend>Work experience</legend>
    <div class="field check"><input type="checkbox" id="grad" name="grad"><label for="grad">I graduated from a public post-secondary school in the community less than 18 months ago (exempt from work experience)</label></div>
    <div class="field"><label for="exp">TEER of your work experience</label><select id="exp" name="exp">${teerOpts(5)}</select></div>
    <div class="field check"><input type="checkbox" id="same" name="same"><label for="same">For TEER 5 offers: my experience is in the same 5-digit NOC</label></div>
    <div class="field"><label for="hours">Paid hours in the last ${r.years} years</label><input type="number" id="hours" name="hours" min="0" step="10" inputmode="numeric"></div>
  </fieldset>
  <fieldset><legend>Language, education, funds</legend>
    <div class="field"><label for="clb">Lowest CLB/NCLC of your four test results</label><select id="clb" name="clb"><option value="0">No test yet</option>${[4, 5, 6, 7, 8, 9, 10].map((c) => `<option value="${c}">${c}</option>`).join('')}</select></div>
    <div class="field check"><input type="checkbox" id="edu" name="edu"><label for="edu">Canadian high school diploma or higher, or a foreign equivalent with an ECA</label></div>
    <div class="field check"><input type="checkbox" id="working" name="working"><label for="working">I already work in Canada with a valid work permit (no proof of funds needed)</label></div>
    <div class="row"><div class="field"><label for="family">Family size</label><input type="number" id="family" name="family" min="1" max="15" value="1" inputmode="numeric"></div>
    <div class="field"><label for="funds">Funds available (CAD)</label><input type="number" id="funds" name="funds" min="0" step="100" inputmode="numeric"></div></div>
  </fieldset>
</form>
<aside class="results" aria-label="Result">
  <div class="total"><span id="status" class="tag"></span></div>
  <div class="cmp" id="checks"></div>
  <p class="small">With all requirements met, the employer sends your application to the community for a recommendation; then you apply for PR.</p>
</aside>
</div>
<article class="prose">
<h2>Participating communities</h2>
<ul>${r.communities.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<p>Each community designates employers and sets priority sectors; job postings are on the community sites linked from <a href="${r.pages.jobOffer}" rel="noopener">IRCC's job offer page</a>. A separate Francophone Community Immigration Pilot covers ${r.francophone.join(', ')}.</p>
<h2>Work experience</h2>
<p>At least 1 year (${fmt(r.hours)} hours) of paid, related work experience in the last ${r.years} years, not self-employed, in a TEER that matches the job offer:</p>
<div class="table-scroll"><table><thead><tr><th>Job offer</th><th>Experience accepted</th></tr></thead><tbody>${r.experience.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table></div>
<p>Registered nurses (NOC 31301) can use their experience for offers as nurse aides (33102) or home support workers (44101).</p>
<h2>Language</h2>
<div class="table-scroll"><table><thead><tr><th>Job offer</th><th class="n">Minimum CLB/NCLC</th></tr></thead><tbody>${r.clb.map(([a, b]) => `<tr><td>${a}</td><td class="n">${b}</td></tr>`).join('')}</tbody></table></div>
<h2>Settlement funds (updated ${longDate(r.fundsUpdated)})</h2>
<div class="table-scroll"><table><thead><tr><th>Family members</th><th class="n">Funds needed (CAD)</th></tr></thead><tbody>${fundsRows(r.funds, r.fundsEach)}</tbody></table></div>
<p>These are the amounts on IRCC's RCIP funds page, which differ from the AIP table. You don't need to show funds if you already work in Canada with a valid work permit.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Rural Community Immigration Pilot</a>, IRCC, modified ${longDate(r.sourceModified)}</li>${r.watchPages.map((w) => `<li><a href="${w.url}" rel="noopener">${esc(w.url.split('/').pop().replace('.html', '').replace(/-/g, ' '))}</a>, IRCC, modified ${longDate(w.modified)}</li>`).join('')}</ul>
</article>`;
  const scripts = `${jsonScript('rcip-rules', { hours: r.hours, funds: r.funds, each: r.fundsEach })}<script type="module" src="/js/rcip.js"></script>`;
  return page({ path: '/rural-community-immigration-pilot/', title: 'Rural Community Immigration Pilot 2026: 14 Communities and Eligibility', description: `The ${r.communities.length} RCIP communities and IRCC's requirements: designated employer job offer, ${fmt(r.hours)} hours of experience by TEER, CLB 4 to 6 and settlement funds. Check yours.`, body, scripts, crumbs: [['Home', '/'], ['Rural Community Immigration Pilot', '/rural-community-immigration-pilot/']] });
}

function nsnpPage() {
  const r = nsnp, s = nsSel;
  const done = s.months.filter((m) => m.selected !== null);
  const total = done.reduce((t, m) => t + m.selected, 0);
  const max = Math.max(...done.map((m) => m.selected));
  const W = 760, H = 220, bw = (W - 40) / done.length;
  const bars = done.map((m, i) => { const h = (m.selected / max) * (H - 50); return `<rect class="bar-r" x="${(30 + i * bw + 6).toFixed(1)}" y="${(H - 26 - h).toFixed(1)}" width="${(bw - 12).toFixed(1)}" height="${h.toFixed(1)}" rx="3"/><text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${(H - 30 - h).toFixed(1)}" text-anchor="middle">${m.selected}</text><text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${MONTHS[Number(m.month.slice(5)) - 1].slice(0, 3)}</text>`; }).join('');
  const body = `
<section class="intro">
  <h1>Nova Scotia Nominee Program in ${done[0].month.slice(0, 4)}</h1>
  <p class="lede">Nova Scotia has selected ${fmt(total)} candidates from its expression of interest pool so far this year. Here's who qualifies for each worker stream, what the province is prioritizing and what it costs since ${longDate(r.fee.since)}.</p>
  <p class="meta"><span>Selections page updated ${longDate(s.pageUpdated)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">Live in Nova Scotia: NSNP</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Selected in ${done[0].month.slice(0, 4)}</div><div class="v">${fmt(total)}</div><div class="small">${done.length} months reported</div></div>
  <div class="card"><div class="k">Application fee</div><div class="v">$${fmt(r.fee.worker)}</div><div class="small">worker streams, since ${longDate(r.fee.since)}</div></div>
  <div class="card"><div class="k">EOI validity</div><div class="v">${r.eoiValidityMonths} months</div><div class="small">since ${longDate(r.eoiValiditySince)}</div></div>
</div>
<h2>Candidates selected by month</h2>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="NSNP selections by month">${bars}</svg>
<p class="small">Nova Scotia publishes monthly totals only, without scores. Selections focused on healthcare and skilled trades, plus other priority occupations.</p>
<article class="prose">
<h2>How selection works</h2>
<p>You submit a free expression of interest (EOI) to one stream. Nova Scotia selects from the pool by labour market needs, occupation and sector priorities, likelihood of staying in the province, region, immigration status and allocations; it is not first come, first served. If selected you have 7 calendar days to update documents and pay the fee ($${fmt(r.fee.worker)} for worker streams, $${fmt(r.fee.entrepreneur)} for the entrepreneur stream). EOIs expire after ${r.eoiValidityMonths} months.</p>
<h2>Current priorities</h2>
<ul><li>Healthcare and skilled trades at TEER 0 to 4, for applicants abroad and temporary residents in Nova Scotia.</li><li>For temporary residents already working in Nova Scotia: NOC broad categories 2, 4, 8 and 9 at TEER 0 to 4.</li><li>Other occupations: TEER 0, 1 and 2 only, for temporary residents working in Nova Scotia.</li><li>TEER 5 is not prioritized.</li></ul>
<h2>Worker streams</h2>
<h3>Skilled Worker</h3>
<ul><li>Full-time permanent job offer from a Nova Scotia employer</li><li>1 year of related work experience (TEER 4 and 5: six months with the employer)</li><li>Age 21 to 55, high school diploma</li><li>CLB 5 for TEER 0 to 3 (native speakers exempt); CLB 4 with a test for TEER 4 and 5</li><li>PGWP holders in TEER 5 jobs are not eligible</li></ul>
<p>A construction sub-stream covers 22 listed trades and occupations with CLB 5 or 4 always tested, and a physicians sub-stream covers NSHA and IWK offers.</p>
<h3>Nova Scotia Graduate</h3>
<ul><li>Open to NOC 32102 (paramedical), 32124 (pharmacy technicians), 33102 (nurse aides) and 42202 (early childhood educators)</li><li>Job offer matching your field, age 19 to 55, CLB 5</li><li>Program of at least 30 weeks (24 for 33102) at a Nova Scotia DLI completed within 3 years, at least half in Nova Scotia</li></ul>
<h3>Nova Scotia: Express Entry</h3>
<ul><li>At least 1 year of work in Nova Scotia in TEER 0 to 3</li><li>Age 21 to 55, Canadian high school or equivalent</li><li>CLB 7 for TEER 0 and 1, CLB 5 for TEER 2 and 3</li><li>A profile in the Express Entry pool; work on a PGWP counts only if you graduated in Nova Scotia</li></ul>
<p>A nomination through the Express Entry stream adds 600 points to your <a href="/">CRS score</a>. Nova Scotia also takes part in the ${isLive('/atlantic-immigration-program/') ? '<a href="/atlantic-immigration-program/">Atlantic Immigration Program</a>' : 'Atlantic Immigration Program'}, which has no provincial fee.</p>
<h2>Sources</h2>
<ul><li><a href="${r.pages.selection}" rel="noopener">EOI selection</a>, updated ${longDate(s.pageUpdated)}</li><li><a href="${r.pages.sw}" rel="noopener">Skilled Worker</a>, <a href="${r.pages.grad}" rel="noopener">Nova Scotia Graduate</a> and <a href="${r.pages.ee}" rel="noopener">Nova Scotia: Express Entry</a> streams</li><li><a href="${r.pages.priorities}" rel="noopener">Nominee program priorities</a>, April 27, 2026</li><li><a href="${r.pages.fees}" rel="noopener">Application fees effective September 1, 2026</a></li></ul>
</article>`;
  return page({ path: '/nova-scotia-nominee-program/', title: `Nova Scotia PNP ${done[0].month.slice(0, 4)}: NSNP Streams, Draws and Fees`, description: `Nova Scotia Nominee Program: ${fmt(total)} candidates selected in ${done[0].month.slice(0, 4)} so far, Skilled Worker, Graduate and Express Entry requirements, priorities and the $${fmt(r.fee.worker)} fee.`, body, crumbs: [['Home', '/'], ['Nova Scotia Nominee Program', '/nova-scotia-nominee-program/']] });
}

function nbpnpPage() {
  const r = nbpnp, d = nbDraws.rounds;
  const y = d[0].date.slice(0, 4);
  const yr = d.filter((x) => x.date.startsWith(y));
  const streams = ['Skilled Worker', 'Express Entry', 'Strategic Initiative', 'Atlantic Immigration Program'];
  const stat = streams.map((s) => { const rs = yr.filter((x) => x.stream === s); return `<tr><td>${s}</td><td class="n">${rs.length}</td><td class="n">${fmt(rs.reduce((t, x) => t + (x.count || 0), 0))}</td><td>${rs[0] ? rs[0].dateText : '–'}</td></tr>`; }).join('');
  const pnpTotal = yr.filter((x) => x.stream !== 'Atlantic Immigration Program').reduce((t, x) => t + (x.count || 0), 0);
  const rows = d.map((x) => `<tr><td>${esc(x.dateText)}</td><td>${esc(x.stream)}</td><td>${esc(x.pathways || '–')}</td><td>${esc(x.categories)}${x.note ? `<div class="small">${esc(x.note)}</div>` : ''}</td><td class="n">${x.count ?? '–'}${x.partial ? ' ◊' : ''}</td></tr>`).join('');
  const body = `
<section class="intro">
  <h1>New Brunswick PNP draws in ${y}</h1>
  <p class="lede">Every NBPNP and AIP round New Brunswick has published, ${fmt(pnpTotal)} NBPNP invitations so far this year, and what each stream asks for.</p>
  <p class="meta"><span>Latest round ${esc(d[0].dateText)}</span><span>Updated automatically</span><span>Source: <a href="${nbDraws.source}" rel="noopener">GNB: invitation and selection rounds</a></span></p>
</section>
<h2>${y} by stream</h2>
<div class="table-scroll"><table><thead><tr><th>Stream</th><th class="n">Rounds</th><th class="n">Invited or selected</th><th>Latest</th></tr></thead><tbody>${stat}</tbody></table></div>
<p class="small">New Brunswick does not publish scores. For the AIP the figure is applications selected for processing; for the PNP streams, invitations to apply.</p>
<h2>All rounds</h2>
<div class="table-scroll"><table><thead><tr><th>Date</th><th>Stream</th><th>Pathways</th><th>Occupational categories</th><th class="n">Number</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="small">◊ New Brunswick notes that not all applications from these rounds would be processed in 2025.</p>
<article class="prose">
<h2>Streams and requirements</h2>
<h3>New Brunswick Skilled Worker</h3>
<p>Age 19 or older, CLB 4 in all four abilities, the support of an employer operating in New Brunswick for at least 24 months, and meeting the NOC requirements of the job. Pathways: <strong>New Brunswick Experience</strong> (6 months full time with the same employer, 6 months living in NB, high school), <strong>New Brunswick Graduates</strong> (PGWP-eligible program at an NB institution, job with the employer, 6 months living in NB) and <strong>Priority Occupations</strong> (offer from a recruitment mission led by New Brunswick, 1 year of related experience).</p>
<h3>New Brunswick Express Entry</h3>
<p>Age 19 to 55, a valid Express Entry profile, high school, CLB 7, 1 year of continuous experience in one TEER 0 to 3 NOC in the last 10 years and at least 67 of 100 points on the selection grid (the same scale as the ${isLive('/fsw-67-points-calculator/') ? '<a href="/fsw-67-points-calculator/">FSW 67 points</a>' : 'FSW 67 points'}). Pathways: <strong>Employment in New Brunswick</strong> (12 months living and working full time in NB in TEER 0 to 3) and <strong>New Brunswick Interest</strong> (a letter of interest in your Express Entry profile). A nomination adds 600 <a href="/">CRS</a> points.</p>
<h3>New Brunswick Strategic Initiative</h3>
<p>For French speakers: age 19 or older, high school, NCLC 5 in French, 1 year of work in the last 5 years (not needed for NB graduates), proof of funds unless living in NB or with a job offer, and at least 65 of 100 points. Pathways: Francophone Workers in New Brunswick, New Brunswick Francophone Priorities and Francophones Working Remotely in New Brunswick.</p>
<p>The expression of interest is free; the nomination application costs a non-refundable $${r.fee}. You can only move forward with one application at a time between the NBPNP and the ${isLive('/atlantic-immigration-program/') ? '<a href="/atlantic-immigration-program/">AIP</a>' : 'AIP'}.</p>
<h2>Sources</h2>
<ul><li><a href="${nbDraws.source}" rel="noopener">Invitation and selection rounds</a>, Government of New Brunswick</li><li><a href="${r.pages.sw}" rel="noopener">Skilled Worker stream</a>, <a href="${r.pages.ee}" rel="noopener">Express Entry stream</a>, <a href="${r.pages.si}" rel="noopener">Strategic Initiative</a></li></ul>
</article>`;
  return page({ path: '/new-brunswick-pnp/', title: `New Brunswick PNP ${y}: NBPNP Draws, Streams and Requirements`, description: `All ${y} New Brunswick PNP and AIP rounds (${fmt(pnpTotal)} NBPNP invitations so far) with the Skilled Worker, Express Entry and Strategic Initiative requirements.`, body, crumbs: [['Home', '/'], ['New Brunswick PNP', '/new-brunswick-pnp/']] });
}

function citizenshipTestPage() {
  const r = citTest, Q = citQ;
  const qs = Q.map((q, i) => `<li class="quiz-q" data-a="${q.a}" id="q${i + 1}"><p class="quiz-p"><strong>${i + 1}.</strong> ${esc(q.q)}</p><ol type="A" class="quiz-o">${q.o.map((o, j) => `<li><button type="button" data-o="${j}">${esc(o)}</button></li>`).join('')}</ol><details><summary>Answer</summary><p><strong>${'ABCD'[q.a]}.</strong> ${esc(q.e)} <span class="small">(Discover Canada: ${esc(q.ch)})</span></p></details></li>`).join('');
  const body = `
<section class="intro">
  <h1>Canadian citizenship practice test</h1>
  <p class="lede">${Q.length} questions written from Discover Canada, the official study guide. The real test has ${r.questions} questions and you need ${r.passMark} right to pass, so try a ${r.questions}-question round and see where you are.</p>
  <p class="meta"><span>Test rules: IRCC page modified ${longDate(r.sourceModified)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">IRCC: study for the test</a></span></p>
</section>
<div class="quiz-bar"><span id="quiz-score" aria-live="polite">Answer the questions below.</span> <button type="button" id="quiz-new">New ${r.questions}-question test</button> <button type="button" id="quiz-all">Show all ${Q.length}</button></div>
<ol class="quiz" id="quiz">${qs}</ol>
<article class="prose">
<h2>How the real test works</h2>
<ul><li>${r.questions} multiple-choice or true or false questions, in English or French, ${r.minutes} minutes.</li><li>You need ${r.passMark} of ${r.questions} correct to pass, and you get ${r.attempts} chances.</li><li>Most applicants aged ${r.ages[0]} to ${r.ages[1]} on the day they sign the application must take it.</li><li>Most people take it online, monitored by webcam, within ${r.onlineDays} days of the invitation; accommodations can be in person or on Microsoft Teams.</li><li>Questions cover rights and responsibilities, history, geography, economy, government, laws and symbols. There are no questions testing your English or French.</li></ul>
<p>IRCC bases every question on <a href="${r.guide}" rel="noopener">Discover Canada</a>, the only official study guide, and offers its own practice questions there. These questions are ours, written from facts in the guide; facts that have changed since it was published (such as the number of electoral districts) are left out. Before applying, check your days in Canada with the ${isLive('/physical-presence-calculator/') ? '<a href="/physical-presence-calculator/">physical presence calculator</a>' : 'physical presence calculator'}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Study for the test</a> and <a href="${r.watchPages[0].url}" rel="noopener">how the test works</a>, IRCC, modified ${longDate(r.sourceModified)}</li><li><a href="${r.guide}" rel="noopener">Discover Canada: The Rights and Responsibilities of Citizenship</a>, IRCC</li></ul>
</article>`;
  const jsonld = [{ '@context': 'https://schema.org', '@type': 'Quiz', name: 'Canadian citizenship test practice', about: 'Discover Canada study guide', hasPart: Q.map((q) => ({ '@type': 'Question', name: q.q, eduQuestionType: 'Multiple choice', acceptedAnswer: { '@type': 'Answer', text: q.o[q.a] } })) }];
  const scripts = `<script type="module" src="/js/quiz.js"></script>`;
  return page({ path: '/canadian-citizenship-test-practice/', title: `Canadian Citizenship Test Practice 2026: ${Q.length} Free Questions`, description: `Free Canadian citizenship practice test: ${Q.length} questions from Discover Canada with answers and explanations. The real test has ${r.questions} questions and you need ${r.passMark} to pass.`, body, scripts, jsonld, crumbs: [['Home', '/'], ['Citizenship test practice', '/canadian-citizenship-test-practice/']] });
}

function eeYearPage() {
  const Y = '2026', PY = String(Number(Y) - 1);
  const rs = draws.rounds.filter((r) => r.date.startsWith(Y));
  const ps = draws.rounds.filter((r) => r.date.startsWith(PY));
  const sum = (a) => a.reduce((t, r) => t + (r.size || 0), 0);
  const name = Object.fromEntries(draws.categories.map((c) => [c.id, c.label]));
  const cats = [...new Set(rs.map((r) => r.category))];
  const rowsC = cats.map((c) => { const a = rs.filter((r) => r.category === c); const sc = a.map((r) => r.crs).filter((x) => x !== null); return [c, a.length, sum(a), Math.min(...sc), Math.max(...sc)]; }).sort((a, b) => b[2] - a[2]);
  const link = (c, l) => (CAT_PAGES[c] && catPagesList().some((x) => x.id === c) ? `<a href="/express-entry-draws/${CAT_PAGES[c].slug}/">${esc(l)}</a>` : esc(l));
  const months = Array.from({ length: 12 }, (_, i) => `${Y}-${String(i + 1).padStart(2, '0')}`);
  const mv = months.map((m) => sum(rs.filter((r) => r.date.startsWith(m))));
  const mx = Math.max(1, ...mv);
  const W = 760, H = 220, bw = (W - 40) / 12;
  const bars = mv.map((v, i) => { const h = (v / mx) * (H - 50); return `<rect class="bar-r" x="${(30 + i * bw + 5).toFixed(1)}" y="${(H - 26 - h).toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>${v ? `<text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${(H - 30 - h).toFixed(1)}" text-anchor="middle">${fmt(v)}</text>` : ''}<text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${MONTHS[i].slice(0, 3)}</text>`; }).join('');
  const sorted = [...rs].filter((r) => r.crs !== null && r.category !== 'pnp' && r.size >= 1000).sort((a, b) => a.crs - b.crs);
  const lo = sorted[0], hi = sorted.at(-1), big = [...rs].sort((a, b) => b.size - a.size)[0];
  const last = rs[0];
  const body = `
<section class="intro">
  <h1>Express Entry in ${Y}</h1>
  <p class="lede">${fmt(sum(rs))} invitations in ${rs.length} rounds: how they split by category, the lowest and highest cut-offs, and how the year compares with ${PY}.</p>
  <p class="meta"><span>Last round ${longDate(last.date)}</span><span>Updated automatically from IRCC</span><span>Source: <a href="${draws.page}" rel="noopener">IRCC rounds of invitations</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Invitations in ${Y}</div><div class="v">${fmt(sum(rs))}</div><div class="small">${PY}: ${fmt(sum(ps))}</div></div>
  <div class="card"><div class="k">Rounds</div><div class="v">${rs.length}</div><div class="small">${PY}: ${ps.length}</div></div>
  <div class="card"><div class="k">Largest round</div><div class="v">${fmt(big.size)}</div><div class="small">${esc(big.name)}, ${longDate(big.date)}</div></div>
</div>
<h2>Invitations by month</h2>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Express Entry invitations by month in ${Y}">${bars}</svg>
<h2>By category and program</h2>
<div class="table-scroll"><table><thead><tr><th>Round type</th><th class="n">Rounds</th><th class="n">Invitations</th><th class="n">Share</th><th class="n">Cut-off range</th></tr></thead><tbody>${rowsC.map(([c, n, s, a, b]) => `<tr><td>${link(c, name[c] || c)}</td><td class="n">${n}</td><td class="n">${fmt(s)}</td><td class="n">${((s / sum(rs)) * 100).toFixed(1)}%</td><td class="n">${a === b ? a : `${a}–${b}`}</td></tr>`).join('')}</tbody></table></div>
<article class="prose">
<h2>Highlights</h2>
<ul>
<li>Lowest cut-off in a round of 1,000 invitations or more (PNP rounds aside): <strong>${lo.crs}</strong> (${esc(lo.name)}, ${longDate(lo.date)}).</li>
<li>Highest cut-off in a round of 1,000 invitations or more (PNP rounds aside): <strong>${hi.crs}</strong> (${esc(hi.name)}, ${longDate(hi.date)}).</li>
${sum(ps) ? `<li>Invitations were ${sum(rs) >= sum(ps) ? 'up' : 'down'} ${Math.abs(((sum(rs) - sum(ps)) / sum(ps)) * 100).toFixed(1)}% on ${PY} (${fmt(sum(ps))} invitations in ${ps.length} rounds)${latestDate.startsWith(Y) && latestDate < `${Y}-12-31` ? `, counting ${Y} up to ${longDate(last.date)}` : ''}.</li>` : ''}
</ul>
<p>Check where your score stands with the <a href="/">CRS calculator</a>, see every round in the <a href="/express-entry-draws/">draws history</a> and the pool on the <a href="/crs-score-distribution/">CRS score distribution</a> page.</p>
<h2>Sources</h2>
<ul><li><a href="${draws.page}" rel="noopener">Express Entry rounds of invitations</a>, IRCC (data read from IRCC's rounds file)</li></ul>
</article>`;
  return page({ path: `/express-entry-${Y}/`, title: `Express Entry ${Y} in Review: All Draws, Invitations and Cut-offs`, description: `Express Entry in ${Y}: ${fmt(sum(rs))} invitations in ${rs.length} rounds, by category with cut-off ranges, monthly totals and the comparison with ${PY}, from IRCC data.`, body, crumbs: [['Home', '/'], [`Express Entry ${Y}`, `/express-entry-${Y}/`]] });
}

function peiPage() {
  const r = peiDraws, d = [...r.draws].reverse();
  const y = d[0][0].slice(0, 4);
  const total = d.reduce((t, [, n]) => t + n, 0);
  const max = Math.max(...d.map(([, n]) => n));
  const W = 760, H = 220, bw = (W - 40) / r.draws.length;
  const bars = r.draws.map(([dt, n], i) => { const h = (n / max) * (H - 50); return `<rect class="bar-r" x="${(30 + i * bw + 6).toFixed(1)}" y="${(H - 26 - h).toFixed(1)}" width="${(bw - 12).toFixed(1)}" height="${h.toFixed(1)}" rx="3"/><text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${(H - 30 - h).toFixed(1)}" text-anchor="middle">${n}</text><text x="${(30 + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${MONTHS[Number(dt.slice(5, 7)) - 1].slice(0, 3)}</text>`; }).join('');
  const body = `
<section class="intro">
  <h1>PEI PNP draws in ${y}</h1>
  <p class="lede">Prince Edward Island has sent ${fmt(total)} labour and Express Entry invitations so far this year. See every draw and what each stream asks for.</p>
  <p class="meta"><span>PEI draws page published ${longDate(r.pagePublished)}</span><span>Checked ${longDate(r.checked)}</span><span>Source: <a href="${r.source}" rel="noopener">PEI Office of Immigration: EOI draws</a></span></p>
</section>
<div class="cards">
  <div class="card"><div class="k">Latest draw</div><div class="v" style="font-size:1.2rem">${longDate(d[0][0])}</div><div class="small">${d[0][1]} invitations</div></div>
  <div class="card"><div class="k">Invitations in ${y}</div><div class="v">${fmt(total)}</div><div class="small">${d.length} draws</div></div>
  <div class="card"><div class="k">Business invitations</div><div class="v">${r.businessInvitations2026}</div><div class="small">in ${y}</div></div>
</div>
<h2>Labour and Express Entry invitations by draw</h2>
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="PEI PNP invitations by draw">${bars}</svg>
<div class="table-scroll"><table><thead><tr><th>Draw date</th><th class="n">Labour and Express Entry invitations</th></tr></thead><tbody>${d.map(([dt, n]) => `<tr><td>${longDate(dt)}</td><td class="n">${n}</td></tr>`).join('')}</tbody></table></div>
<p class="small">PEI no longer publishes a minimum score for labour and Express Entry invitations. It is prioritizing healthcare, trades, manufacturing and other sectors with shortages; people working in sales and service may not be invited. In January, international graduates of UPEI, Holland College and Collège de l'Île were prioritized.</p>
<article class="prose">
<h2>Streams and requirements</h2>
<h3>Skilled Worker (in PEI or outside Canada)</h3>
<ul><li>Full-time, non-seasonal job offer (permanent or at least 2 years) from a PEI employer in TEER 0, 1, 2 or 3</li><li>At least 2 years of full-time work experience in the last 5 years</li><li>A post-secondary degree or diploma of at least 2 years</li><li>Age 18 to 59</li><li>Language to do the job: CLB/NCLC 4 on an approved test, or the employer's confirmation on the job offer form</li><li>In PEI: a valid work permit. From outside Canada: the employer needs the Office of Immigration's authorization before the EOI</li></ul>
<h3>Critical Worker</h3>
<ul><li>Full-time, non-seasonal job offer in TEER 4 or 5 and at least 6 months of continuous full-time work with that PEI employer</li><li>Valid work permit, secondary school diploma, age 18 to 59</li><li>2 years of full-time work experience or relevant education in the last 5 years</li><li>CLB/NCLC 4 on an approved test</li><li>Truck drivers (NOC 73300) need 12 months of long-haul experience</li></ul>
<h3>PEI Express Entry</h3>
<p>You must qualify for the Federal Skilled Worker, Federal Skilled Trades or Canadian Experience Class and have a profile in the Express Entry pool. PEI prioritizes people living and working in the province for an eligible employer. PGWP holders who graduated outside PEI need 9 months of continuous full-time work with the PEI employer and at least 4 months left on their permit. A nomination adds 600 <a href="/">CRS</a> points.</p>
<p>The expression of interest is free and stays active ${r.profileMonths} months; if invited, the nomination application costs a non-refundable $${r.fee}. PEI also takes part in the ${isLive('/atlantic-immigration-program/') ? '<a href="/atlantic-immigration-program/">Atlantic Immigration Program</a>' : 'Atlantic Immigration Program'}.</p>
<h2>Sources</h2>
<ul><li><a href="${r.source}" rel="noopener">Expression of Interest Draws</a>, Government of PEI, published ${longDate(r.pagePublished)}</li><li><a href="${r.pages.sw}" rel="noopener">Skilled Workers in PEI</a>, <a href="${r.pages.swOut}" rel="noopener">Skilled Workers Outside Canada</a> and <a href="${r.pages.ee}" rel="noopener">PEI Express Entry</a>, published ${longDate(r.pagesPublished.sw)}; <a href="${r.pages.critical}" rel="noopener">Critical Workers</a>, published ${longDate(r.pagesPublished.critical)}</li></ul>
</article>`;
  return page({ path: '/pei-pnp/', title: `PEI PNP ${y}: Prince Edward Island Draws and Requirements`, description: `All ${y} PEI PNP draws (${fmt(total)} invitations so far, latest ${longDate(d[0][0])}) and the Skilled Worker, Critical Worker and PEI Express Entry requirements.`, body, crumbs: [['Home', '/'], ['PEI PNP', '/pei-pnp/']] });
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
  const rows = changelog.map((c) => `<tr><td data-sort="${c.date}">${shortDate(c.date)}</td><td>${esc(c.what)}</td></tr>`).join('');
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
for (const [slug, fn] of [['celpip-to-ielts', convertPage], ['next-express-entry-draw', nextDrawPage], ['how-to-increase-crs-score', increasePage], ['crs-age-points', agePage], ['physical-presence-calculator', presencePage], ['proof-of-funds-express-entry', fundsPage], ['pr-residency-obligation-calculator', residencyPage], ['oinp-points-calculator', oinpCalcPage], ['oinp-draws', oinpDrawsPage], ['mpnp-points-calculator', mpnpCalcPage], ['mpnp-draws', mpnpDrawsPage], ['sinp-points-calculator', sinpCalcPage], ['sinp-draws', sinpDrawsPage], ['aaip-points-calculator', aaipCalcPage], ['aaip-draws', aaipDrawsPage], ['fsw-67-points-calculator', fswPage], ['cec-eligibility-calculator', cecPage], ['super-visa-income-requirement', superVisaPage], ['parents-grandparents-sponsorship-income', pgpIncomePage], ['bc-pnp-points-calculator', bcCalcPage], ['bc-pnp-draws', bcDrawsPage], ['noc-code-finder', nocPage], ['spousal-open-work-permit', sowpPage], ['bridging-open-work-permit', bowpPage], ['pgwp-calculator', pgwpPage], ['express-entry-2026', eeYearPage], ['canada-pr-fees', feesPage], ['atlantic-immigration-program', aipPage], ['nova-scotia-nominee-program', nsnpPage], ['new-brunswick-pnp', nbpnpPage], ['pei-pnp', peiPage], ['rural-community-immigration-pilot', rcipPage], ['canadian-citizenship-test-practice', citizenshipTestPage]]) if (isLive(`/${slug}/`)) out(slug, fn(), slug === 'next-express-entry-draw' ? latestDate : (schedule.pages[`/${slug}/`] || SITE.checked));
for (const id of Object.keys(CHART_PAGES)) if (isLive(`/${CHART_PAGES[id].slug}/`)) out(CHART_PAGES[id].slug, scoreChartPage(id), schedule.pages[`/${CHART_PAGES[id].slug}/`] || SITE.checked);
for (const c of catPagesList()) out(`express-entry-draws/${CAT_PAGES[c.id].slug}`, categoryPage(c), draws.rounds.find((r) => r.category === c.id).date);
for (const l of LEVELS) { out(`clb-${l}`, levelPage('en', l)); out(`nclc-${l}`, levelPage('fr', l)); }
out('about', simple('/about/', 'About CRS Planner and How We Check the Rules', 'Who runs CRS Planner, where the rules come from and how the calculators are tested against IRCC.', 'About CRS Planner', aboutHtml));
out('privacy', simple('/privacy/', 'Privacy | CRS Planner', 'What CRS Planner stores in your browser, what it does not collect, and who processes connection data. Contact for data requests.', 'Privacy', privacyHtml));
out('terms', simple('/terms/', 'Terms of Use | CRS Planner', 'Terms of use and disclaimer for CRS Planner: estimates based on IRCC rules, not immigration or legal advice.', 'Terms of use', termsHtml));
out('changelog', changelogPage());
writeFileSync(join(DIST, 'favicon.svg'), LOGO_SVG);
cpSync(join(ROOT, 'src/css'), join(DIST, 'css'), { recursive: true });
cpSync(join(ROOT, 'src/js'), join(DIST, 'js'), { recursive: true });
if (isLive('/noc-code-finder/')) {
  mkdirSync(join(DIST, 'data'), { recursive: true });
  writeFileSync(join(DIST, 'data/noc-index.json'), JSON.stringify(noc.units.map((u) => [u.c, u.t, u.ex.join('|')])));
  writeFileSync(join(DIST, 'data/noc-details.json'), JSON.stringify(Object.fromEntries(noc.units.map((u) => [u.c, [u.d, u.du, u.rq]]))));
}
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${written.map(([u, d]) => `<url><loc>${SITE.url}${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
writeFileSync(join(DIST, '404.html'), page({ path: '/404', title: 'Page not found | CRS Planner', description: 'Page not found.', body: '<section class="intro"><h1>Page not found</h1><p>Try the <a href="/">CRS calculator</a> or the <a href="/express-entry-draws/">draws history</a>.</p></section>' }));
cpSync(join(ROOT, 'extras/_worker.js'), join(DIST, '_worker.js'));
console.log(`Built ${written.length} pages into dist/`);
