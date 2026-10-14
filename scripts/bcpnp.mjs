// Reads the Skills Immigration invitations and the registration pool from WelcomeBC into data/provinces/bcpnp-draws.json.
// Usage: node scripts/bcpnp.mjs --fetch   |   node scripts/bcpnp.mjs --raw page.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BC_URL = 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/invitations-to-apply';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ent = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#039;|&rsquo;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z#0-9]+;/g, ' ');
const text = (h) => ent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
const iso = (t) => { const m = String(t).match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/); if (!m) return null; const i = MONTHS.indexOf(m[1].toLowerCase()); return i < 0 ? null : `${m[3]}-${String(i + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`; };
const rowsOf = (t) => [...t.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1])));

export function parse(html) {
  const updated = iso(text((html.match(/Last updated:([\s\S]{0,300})/i) || [])[1] || ''));
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const t = tables.find((x) => /Minimum score/i.test(x) && /ITA type/i.test(x));
  if (!t) throw new Error('Skills Immigration table not found');
  const draws = [];
  let date = null;
  for (const r of rowsOf(t)) {
    if (!r.length || /^Date$/i.test(r[0])) continue;
    let cells = r;
    if (iso(cells[0])) { date = iso(cells[0]); cells = cells.slice(1); }
    if (cells.length >= 4 && date) {
      const [type, factors, min, n] = cells;
      draws.push({ date, type, factors: factors.replace(/\s*\*$/, ''), minScore: /^\d+$/.test(min) ? Number(min) : null, invitations: /^\d[\d,]*$/.test(n) ? Number(n.replace(/,/g, '')) : null, invitationsText: n });
    } else if (cells.length === 1 && draws.length && cells[0]) {
      draws[draws.length - 1].note = cells[0];
    }
  }
  // High economic impact rounds published as paragraphs.
  for (const m of html.matchAll(/On ([A-Za-z]+ \d{1,2}, \d{4}), the BC PNP issued invitations to apply to ([\d,]+) candidates who will create high economic impact[\s\S]*?minimum wage of \$([\d.]+)\/hour and \$([\d,]+)\/year[\s\S]*?\(([\d,]+) candidates\)[\s\S]*?minimum score of (\d+) points \(([\d,]+) candidates\)/g)) {
    const d = iso(m[1]);
    if (draws.some((x) => x.date === d)) continue;
    draws.push({ date: d, type: 'Innovate: High Economic Impact', factors: `Minimum wage of $${m[3]}/hour and $${m[4]}/year, and NOC TEER 0, 1, 2 or 3`, minScore: null, invitations: Number(m[5].replace(/,/g, '')), invitationsText: m[5] });
    draws.push({ date: d, type: 'Innovate: High Economic Impact', factors: 'Points', minScore: Number(m[6]), invitations: Number(m[7].replace(/,/g, '')), invitationsText: m[7] });
  }
  draws.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (draws.length < 10) throw new Error(`Only ${draws.length} rows parsed`);
  const pool = { asOf: iso((html.match(/registration pool as of ([A-Za-z]+ \d{1,2}, \d{4})/) || [])[1] || ''), ranges: [] };
  const pt = tables.find((x) => /Number of registrations/i.test(x));
  if (pt) for (const r of rowsOf(pt)) if (r.length >= 2 && /\d/.test(r[1]) && !/total/i.test(r[0])) pool.ranges.push({ range: r[0].replace(/\s*-\s*/, '–'), count: Number(r[1].replace(/,/g, '')) });
  pool.total = pool.ranges.reduce((s, x) => s + x.count, 0);
  return { source: BC_URL, archive: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program/archives#Invitations_to_apply', pageUpdated: updated, draws, pool };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const a = process.argv.slice(2);
  let html;
  if (a[0] === '--fetch') { const r = await fetch(BC_URL, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data-bot; +https://crsplanner.com/about/)' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); html = await r.text(); }
  else if (a[0] === '--raw') html = readFileSync(a[1], 'utf8');
  else { console.error('Usage: --fetch | --raw <file>'); process.exit(2); }
  const out = parse(html);
  const target = join(root, 'data/provinces/bcpnp-draws.json');
  const json = JSON.stringify(out, null, 1);
  const changed = !existsSync(target) || readFileSync(target, 'utf8') !== json;
  if (changed) writeFileSync(target, json);
  console.log(`${out.draws.length} BC PNP rows, latest ${out.draws[0].date}, page updated ${out.pageUpdated}, pool ${out.pool.total} as of ${out.pool.asOf}; changed=${changed}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
