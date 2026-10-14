// Nova Scotia Nominee Program monthly EOI selections from liveinnovascotia.com.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
export const NS_URL = 'https://liveinnovascotia.com/eoi-selection';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function parse(html) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const months = [...t.matchAll(/\b([A-Z][a-z]+) (\d{4}) (\d[\d,]*|TBD)\b/g)].filter((m) => MONTHS.includes(m[1].toLowerCase()))
    .map((m) => ({ month: `${m[2]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}`, selected: m[3] === 'TBD' ? null : Number(m[3].replace(/,/g, '')) }));
  const u = t.match(/Last Updated:\s*([A-Za-z]+) (\d{1,2}), (\d{4})/);
  const updated = u ? `${u[3]}-${String(MONTHS.indexOf(u[1].toLowerCase()) + 1).padStart(2, '0')}-${u[2].padStart(2, '0')}` : null;
  return { source: NS_URL, pageUpdated: updated, months };
}
if (process.argv[1] && process.argv[1].endsWith('nsnp.mjs')) {
  const arg = process.argv[2];
  const html = arg === '--fetch' ? await (await fetch(NS_URL, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } })).text() : readFileSync(arg, 'utf8');
  const data = parse(html);
  if (data.months.length < 6) throw new Error(`only ${data.months.length} months parsed`);
  const out = 'data/provinces/nsnp-selections.json';
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const next = JSON.stringify(data, null, 1);
  if (prev !== next) writeFileSync(out, next);
  console.log(`${data.months.filter((m) => m.selected !== null).length} NS months with data, page updated ${data.pageUpdated}${prev === next ? ' (unchanged)' : ''}`);
}
