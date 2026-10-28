// LMIA processing times by stream, from ESDC's monthly table on Canada.ca.
// node scripts/lmia.mjs --fetch  ->  data/lmia-times.json (run by .github/workflows/draws.yml)
// ESDC replaces the table every month, so each month we read is kept in "months" to build a history.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const LMIA_PAGE = 'https://www.canada.ca/en/employment-social-development/services/foreign-workers/labour-market-impact-assessment-processing-times.html';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// ESDC's row labels (checked on 2026-10-28) and our keys.
export const STREAMS = [['gts', 'Global Talent Stream'], ['agri', 'Agricultural stream'], ['sawp', 'Seasonal Agricultural Worker Program'], ['high', 'High-wage stream'], ['low', 'Low-wage stream'], ['pr', 'Permanent resident stream']];
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function parse(html) {
  const t = html.match(/<table[^>]*id="tbl-001"[\s\S]*?<\/table>/) || html.match(/<table[\s\S]*?<\/table>/);
  if (!t) throw new Error('no table found');
  const cap = strip((t[0].match(/<caption[\s\S]*?<\/caption>/) || [''])[0]).match(/business days for ([A-Za-z]+) (\d{4})/);
  if (!cap || MONTHS.indexOf(cap[1].toLowerCase()) < 0) throw new Error('unreadable table caption');
  const month = `${cap[2]}-${String(MONTHS.indexOf(cap[1].toLowerCase()) + 1).padStart(2, '0')}`;
  const rows = Object.fromEntries([...t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]))).filter((c) => c.length === 2));
  const times = {};
  for (const [k, label] of STREAMS) {
    if (!(label in rows)) throw new Error(`missing row: ${label}`);
    if (!/^\d+$/.test(rows[label])) throw new Error(`not a number for ${label}: ${rows[label]}`);
    times[k] = Number(rows[label]);
  }
  const modified = (html.match(/name="dcterms\.modified"[^>]+content="([\d-]+)"/) || [])[1] || null;
  return { month, modified, times };
}

if (process.argv[1] && process.argv[1].endsWith('lmia.mjs')) {
  const r = await fetch(LMIA_PAGE, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } });
  if (!r.ok) throw new Error(`${LMIA_PAGE}: HTTP ${r.status}`);
  const now = parse(await r.text());
  const out = 'data/lmia-times.json';
  const prevText = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const prev = prevText ? JSON.parse(prevText) : { months: {} };
  const months = { ...prev.months, [now.month]: now.times };
  const data = { source: LMIA_PAGE, streams: Object.fromEntries(STREAMS), latest: now.month, pageModified: now.modified, months: Object.fromEntries(Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]))) };
  const next = JSON.stringify(data, null, 1) + '\n';
  if (next !== prevText) writeFileSync(out, next);
  console.log(`LMIA processing times: ${now.month} (page modified ${now.modified})${next === prevText ? ' (unchanged)' : ''}`);
}
