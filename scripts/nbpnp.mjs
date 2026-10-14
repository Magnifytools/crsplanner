// New Brunswick PNP and AIP invitation and selection rounds from gnb.ca.
// Usage: node scripts/nbpnp.mjs --fetch | <file.html>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
export const NB_URL = 'https://www.gnb.ca/en/topic/family-home-community/immigration/invitation-selection-rounds.html';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const text = (s) => s.replace(/<br\s*\/?>/gi, '; ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/\s+/g, ' ').replace(/ ;/g, ';').replace(/(;\s*)+/g, '; ').replace(/^;\s*|;\s*$/g, '').trim();
const STREAMS = [[/atlantic/i, 'Atlantic Immigration Program'], [/skilled worker/i, 'Skilled Worker'], [/express entry/i, 'Express Entry'], [/strategic/i, 'Strategic Initiative']];
const stream = (s) => (STREAMS.find(([re]) => re.test(s)) || [null, s])[1];
function firstDate(s) {
  const m = s.match(/([A-Za-z]+)\s+(\d{1,2})[\s\S]*?(\d{4})/);
  if (!m || !MONTHS.includes(m[1].toLowerCase())) return null;
  return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}
function splitCats(s) {
  const i = s.search(/Note:/i);
  const cats = (i >= 0 ? s.slice(0, i) : s).split(';').map((x) => x.trim()).filter(Boolean).join('; ');
  return { categories: cats, note: i >= 0 ? s.slice(i).replace(/^Note:\s*/i, '').trim() : null };
}
export function parse(html) {
  const h = html.replace(/data-cmp-data-layer="[^"]*"/g, '');
  const rounds = [];
  const toks = [...h.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>|<table[\s\S]*?<\/table>/g)];
  let head = '';
  for (const m of toks) {
    if (m[2]) { head = text(m[2]); continue; }
    const rows = [...m[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((r) => [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => text(c[1])));
    if (!rows.length) continue;
    if (rows[0][0] === 'Date of draw' && rows[0].length === 2) {
      const kv = Object.fromEntries(rows.map((r) => [r[0], r[1]]));
      const n = (kv['Invitations issued'] || kv['Applications selected'] || '').replace(/[^\d]/g, '');
      rounds.push({ dateText: kv['Date of draw'], date: firstDate(kv['Date of draw']), stream: stream(head), pathways: kv.Pathways || '', ...splitCats(kv['Occupational categories selected'] || ''), count: n ? Number(n) : null, partial: false });
    } else if (rows[0][0] === 'Date of draw') {
      for (const r of rows.slice(1)) {
        if (r.length < 6) continue;
        const n = r[5].replace(/[^\d]/g, '');
        rounds.push({ dateText: r[0], date: firstDate(r[0]), stream: stream(r[1]), pathways: r[3].replace(/^—$/, ''), ...splitCats(r[4]), count: n ? Number(n) : null, partial: /◊/.test(r[5]) });
      }
    }
  }
  const mods = [...html.matchAll(/repo:modifyDate&quot;:&quot;(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]).sort();
  return { source: NB_URL, pageUpdated: mods.at(-1) || null, rounds: rounds.filter((r) => r.date).sort((a, b) => b.date.localeCompare(a.date)) };
}
if (process.argv[1] && process.argv[1].endsWith('nbpnp.mjs')) {
  const arg = process.argv[2];
  const html = arg === '--fetch' ? await (await fetch(NB_URL, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } })).text() : readFileSync(arg, 'utf8');
  const data = parse(html);
  if (data.rounds.length < 20) throw new Error(`only ${data.rounds.length} rounds parsed`);
  const out = 'data/provinces/nbpnp-draws.json';
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const next = JSON.stringify(data, null, 1);
  if (prev !== next) writeFileSync(out, next);
  console.log(`${data.rounds.length} NB rounds, latest ${data.rounds[0].date}, page updated ${data.pageUpdated}${prev === next ? ' (unchanged)' : ''}`);
}
