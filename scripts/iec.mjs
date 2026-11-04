// International Experience Canada (IEC): quotas, invitations, pool sizes and chances by country and category.
// node scripts/iec.mjs --fetch  ->  data/iec.json (run by .github/workflows/draws.yml)
// IRCC's rounds of invitations page (selections.asp) reads everything from selections.xml; the season
// year and whether it is open come from the page text. Each season is kept, so last season's final
// numbers stay available after the new one starts.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const IEC_PAGE = 'https://ircc.canada.ca/english/work/iec/selections.asp';
export const IEC_XML = 'https://ircc.canada.ca/english/work/iec/selections.xml';
// Ratings used by IRCC's page script (rating1-eng.asp to rating5-eng.asp); 0 means no rating shown.
export const RATINGS = { 1: 'Excellent', 2: 'Very good', 3: 'Fair', 4: 'Low', 5: 'Very low' };
const CATS = ['wh', 'yp', 'coop'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const cdata = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`));
  return m ? (m[1] ?? m[2]).trim() : null;
};
const num = (s) => (s !== null && /^[\d,]+$/.test(s) ? Number(s.replace(/,/g, '')) : null);
const isoFrom = (s) => {
  const m = String(s || '').match(/([A-Za-z]+) (\d{1,2}), (\d{4})/);
  return m && MONTHS.includes(m[1].toLowerCase()) ? `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
};
// Display names as on IRCC's IEC eligibility page (the XML says "Korea, Republic", "Latvia, Republic" and so on).
const NAMES = { 'Korea, Republic': 'Republic of Korea', 'Latvia, Republic': 'Latvia', 'Hong Kong Special Administrative Region': 'Hong Kong' };
const row = (raw, code, category, sub, b) => ({
  country: NAMES[raw.trim()] || raw.trim(), code, category, sub,
  quota: num(cdata(b, 'quota')), invitations: num(cdata(b, 'invitations')), candidates: num(cdata(b, 'candidates')), spots: num(cdata(b, 'spots')),
  rating: Number(cdata(b, 'chances')) || 0, firstRound: cdata(b, 'first'), finalRound: cdata(b, 'second'),
});

export function parseXml(xml) {
  const asOf = isoFrom(cdata(xml, 'chancesdate'));
  if (!asOf) throw new Error('no chancesdate');
  const rows = [];
  // Split at each <country> tag: IRCC sometimes leaves one unclosed (France and Spain "yp", which carry a sub-programme, in October 2026). "NA" numbers are kept as null.
  for (const chunk of xml.split(/(?=<country )/).slice(1)) {
    const m = chunk.match(/^<country location="([^"]+)" category="([^"]+)" code="([^"]+)">([\s\S]*)$/);
    if (!m) throw new Error(`unreadable entry: ${chunk.slice(0, 80)}`);
    const [, country, category, code] = m;
    const inner = m[4].replace(/<\/country>[\s\S]*$/, '');
    if (!CATS.includes(category)) continue; // "Recognized Organizations" has no numbers
    const subs = [...inner.matchAll(/<sub txt="([^"]+)">([\s\S]*?)<\/sub>/g)];
    rows.push(row(country, code, category, null, inner.replace(/<sub[\s\S]*?<\/sub>/g, '')));
    for (const s of subs) rows.push(row(country, code, category, s[1], s[2]));
  }
  if (rows.length < 50) throw new Error(`only ${rows.length} rows`);
  for (const r of rows) if (r.quota === null || r.invitations === null) throw new Error(`unreadable numbers for ${r.country} ${r.category}`);
  return { asOf, rows };
}

export function parsePage(html) {
  const t = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const y = t.match(/Schedule for the (\d{4}) season/) || t.match(/(\d{4}) IEC season is (?:closed|open)/);
  return { season: y ? Number(y[1]) : null, closed: /season is closed/i.test(t), modified: (t.match(/Date modified:(?:\s|&#32;)*(\d{4}-\d{2}-\d{2})/) || [])[1] || null };
}

if (process.argv[1] && process.argv[1].endsWith('iec.mjs')) {
  const UA = { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } };
  const [p, x] = await Promise.all([fetch(IEC_PAGE, UA), fetch(IEC_XML, UA)]);
  if (!p.ok) throw new Error(`${IEC_PAGE}: HTTP ${p.status}`);
  if (!x.ok) throw new Error(`${IEC_XML}: HTTP ${x.status}`);
  const page = parsePage(await p.text());
  const { asOf, rows } = parseXml(await x.text());
  // Season: from the page text; if IRCC rewords it, fall back to the year of the latest first round.
  const season = page.season || Math.max(...rows.map((r) => Number((isoFrom(r.firstRound) || '0').slice(0, 4))));
  const out = 'data/iec.json';
  const prevText = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const prev = prevText ? JSON.parse(prevText) : { seasons: {} };
  const seasons = { ...prev.seasons, [season]: { asOf, closed: page.closed, rows } };
  const data = { source: IEC_PAGE, xml: IEC_XML, latest: String(season), pageModified: page.modified, seasons: Object.fromEntries(Object.entries(seasons).sort((a, b) => b[0].localeCompare(a[0]))) };
  const next = JSON.stringify(data, null, 1) + '\n';
  if (next !== prevText) writeFileSync(out, next);
  console.log(`IEC ${season}: ${rows.length} rows as of ${asOf}${page.closed ? ' (season closed)' : ''}${next === prevText ? ' (unchanged)' : ''}`);
}
