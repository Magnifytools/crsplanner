// IRCC processing times, from the JSON files behind IRCC's "Check processing times" tool.
// node scripts/ptimes.mjs --fetch  ->  data/ptimes.json (run by .github/workflows/draws.yml)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://www.canada.ca/content/dam/ircc/documents/json/';
export const PT_FILES = {
  nonCountry: BASE + 'data-ptime-non-country-en.json',
  country: BASE + 'data-ptime-en.json',
  names: BASE + 'data-country-name-en.json',
  flpt: BASE + 'flpt-en.json',
  flptWeek: BASE + 'flpt-by-week-en.json',
};
export const PT_TOOL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const isoDate = (s) => {
  const m = String(s || '').match(/([A-Za-z]+) (\d{1,2}), (\d{4})/);
  if (!m || MONTHS.indexOf(m[1].toLowerCase()) < 0) throw new Error(`unreadable date: ${s}`);
  return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
};
const decode = (s) => String(s).replace(/&rsquo;|&#8217;/g, '’').replace(/&lsquo;/g, '‘').replace(/&amp;/g, '&').replace(/&eacute;/g, 'é').replace(/&ocirc;/g, 'ô');
const people = (s) => { const m = String(s || '').match(/(\d[\d,]*)/); return m ? Number(m[1].replace(/,/g, '')) : null; };
// Keys of the non-country file that IRCC's tool shows today (checked against its result fragments on 2026-10-21).
const SINGLE = [['pr_card', 'new_pr'], ['pr_card', 'existing_pr'], ['visitor_inside_canada', 'visitor_inside_canada'], ['visitor_extension', 'visitor_extension'],
  ['iec', 'iec'], ['iec', 'iec_past'], ['eta', 'eta'], ['sawp', 'sawp_current'], ['fed_skilled_trades', 'skilled_trades_ee'],
  ['citizenship', 'cit_search'], ['citizenship', 'cit_renunciation'], ['citizenship', 'cit_resumption'],
  ['rep_documents', 'vos'], ['rep_documents', 'replacement'], ['rep_documents', 'amend_imm'], ['rep_documents', 'amend_tr']];
const COUNTRY = { 'visitor-outside-canada': 'visitor', supervisa: 'superVisa', study: 'study', work: 'work' };
const KEEP_MONTHS = 48;

export function build({ nonCountry, country, names, flpt, flptWeek }) {
  const single = {};
  for (const [g, k] of SINGLE) {
    if (typeof nonCountry[g]?.[k] !== 'string') throw new Error(`missing ${g}/${k}`);
    single[k] = nonCountry[g][k];
  }
  const byCountry = {};
  for (const [src, id] of Object.entries(COUNTRY)) {
    if (!country[src]) throw new Error(`missing country list ${src}`);
    byCountry[id] = Object.fromEntries(Object.entries(country[src]).filter(([c, v]) => /^[A-Z]{2}$/.test(c) && typeof v === 'string'));
    if (Object.keys(byCountry[id]).length < 150) throw new Error(`only ${Object.keys(byCountry[id]).length} countries in ${src}`);
  }
  const countryUpdated = isoDate(country.work.lastupdated);
  const progs = {};
  for (const [p, today] of Object.entries(flpt['current-flpt'])) {
    const keys = Object.keys(flpt['wait-times']).filter((k) => k.startsWith(`${p}-`) && /^\d{4}\/\d{2}$/.test(k.slice(p.length + 1)))
      .map((k) => k.slice(p.length + 1)).sort().reverse().slice(0, KEEP_MONTHS);
    progs[p] = { today, waiting: people(flpt['total-people'][p]), months: keys.map((m) => [m.replace('/', '-'), flpt['wait-times'][`${p}-${m}`], flpt['people-ahead'][`${p}-${m}`] || null]) };
  }
  for (const p of ['cec', 'fsw', 'pnp-ee', 'citizen-grants', 'spousal-canada-roc']) if (!progs[p]?.months.length) throw new Error(`no monthly data for ${p}`);
  const weeks = {};
  for (const [p, today] of Object.entries(flptWeek['current-flpt'])) {
    const keys = Object.keys(flptWeek['wait-times']).filter((k) => k.startsWith(`${p}-`)).map((k) => k.slice(p.length + 1)).sort().reverse().slice(0, 4 * 5 * 24);
    weeks[p] = { today, waiting: people(flptWeek['total-people'][p]), weeks: keys.map((w) => [w, flptWeek['wait-times'][`${p}-${w}`], flptWeek['people-ahead'][`${p}-${w}`] || null]) };
  }
  if (!weeks['WP-EXT']?.weeks.length) throw new Error('no weekly data for WP-EXT');
  return {
    tool: PT_TOOL,
    files: PT_FILES,
    updated: { weekly: isoDate(nonCountry['default-update'].lastupdated), country: countryUpdated, flpt: isoDate(flpt['default-update'].flpt_lastupdated), flptWeek: isoDate(flptWeek['tr-last-updated']) },
    single,
    country: byCountry,
    names: Object.fromEntries(Object.entries(names['country-name']).filter(([c]) => /^[A-Z]{2}$/.test(c)).map(([c, n]) => [c, decode(n)])),
    flpt: progs,
    flptWeek: weeks,
  };
}

if (process.argv[1] && process.argv[1].endsWith('ptimes.mjs')) {
  const src = {};
  for (const [k, url] of Object.entries(PT_FILES)) {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    src[k] = JSON.parse(await r.text());
  }
  const data = build(src);
  const out = 'data/ptimes.json';
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const next = JSON.stringify(data, null, 1) + '\n';
  if (prev !== next) writeFileSync(out, next);
  console.log(`Processing times: weekly ${data.updated.weekly}, by country ${data.updated.country}, PR and citizenship ${data.updated.flpt}, extensions ${data.updated.flptWeek}${prev === next ? ' (unchanged)' : ''}`);
}
