// Reads the 2026 draw table of Alberta's AAIP processing information page into data/provinces/aaip-draws.json.
// Usage: node scripts/aaip.mjs --fetch   |   node scripts/aaip.mjs --raw page.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AAIP_URL = 'https://www.alberta.ca/aaip-processing-information';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ent = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&[a-z]+;/g, ' ');
const text = (h) => ent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const iso = (t) => { const m = String(t).match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/); if (!m) return null; const i = MONTHS.indexOf(m[1].toLowerCase()); return i < 0 ? null : `${m[3]}-${String(i + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`; };
function stream(s) {
  if (/Opportunity/i.test(s)) return 'aos';
  if (/Rural Renewal/i.test(s)) return 'rrs';
  if (/Tourism/i.test(s)) return 'ths';
  if (/Health Care Pathway/i.test(s)) return 'dhcp';
  if (/Express Entry/i.test(s)) return 'aee';
  return 'other';
}

export function parse(html) {
  const updated = iso(text((html.match(/Last updated:?([\s\S]{0,200})/i) || [])[1] || ''));
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const t = tables.find((x) => /Draw date/i.test(x) && /Minimum score/i.test(x));
  if (!t) throw new Error('Draw table not found');
  const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1])));
  const draws = rows.filter((r) => iso(r[0])).map((r) => {
    const inv = r[3] || '';
    return { date: iso(r[0]), focus: r[1], stream: stream(r[1]), minScore: Number(r[2]) || null, invitations: /less than/i.test(inv) ? null : Number(inv.replace(/[^\d]/g, '')) || null, invitationsText: inv };
  }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (draws.length < 10) throw new Error(`Only ${draws.length} draws parsed`);
  const pool = {};
  const pt = tables.find((x) => /Number of expressions of interest currently in the selection pool/i.test(x));
  if (pt) for (const r of [...pt.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1])))) if (r.length === 2 && /\d/.test(r[1])) pool[r[0].replace(/:$/, '')] = Number(r[1].replace(/[^\d]/g, ''));
  return { source: AAIP_URL, pageUpdated: updated, draws, pool };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const a = process.argv.slice(2);
  let html;
  if (a[0] === '--fetch') { const r = await fetch(AAIP_URL, { headers: { 'user-agent': 'crsplanner-data-bot (+https://crsplanner.com/about/)' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); html = await r.text(); }
  else if (a[0] === '--raw') html = readFileSync(a[1], 'utf8');
  else { console.error('Usage: --fetch | --raw <file>'); process.exit(2); }
  const out = parse(html);
  const target = join(root, 'data/provinces/aaip-draws.json');
  const json = JSON.stringify(out, null, 1);
  const changed = !existsSync(target) || readFileSync(target, 'utf8') !== json;
  if (changed) writeFileSync(target, json);
  console.log(`${out.draws.length} AAIP draws, latest ${out.draws[0].date}, page updated ${out.pageUpdated}; changed=${changed}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
