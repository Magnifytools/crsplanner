// Reads Ontario's "Invitations to apply to the OINP" page into data/provinces/oinp-draws.json.
// Usage: node scripts/oinp.mjs --fetch   |   node scripts/oinp.mjs --raw page.html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OINP_ITA_URL = 'https://www.ontario.ca/page/invitations-apply-oinp';
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ent = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&[a-z]+;/g, ' ');
const text = (h) => ent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\( (\S+?) \)/g, '($1)').replace(/ ([.,])/g, '$1').trim();
export function isoDate(t) {
  const m = String(t).match(/([A-Za-z]+)\s+(\d{1,2})[.,]\s*(\d{4})/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  return mi < 0 ? null : `${m[3]}-${String(mi + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}
const STREAMS = [[/Foreign Worker/i, 'foreign-worker', 'Employer Job Offer: Foreign Worker'], [/International Student/i, 'international-student', 'Employer Job Offer: International Student'], [/In-Demand/i, 'in-demand', 'Employer Job Offer: In-Demand Skills'], [/Masters/i, 'masters', 'Masters Graduate'], [/PhD/i, 'phd', 'PhD Graduate'], [/Entrepreneur/i, 'entrepreneur', 'Entrepreneur'], [/Workforce Priority/i, 'owp', 'Ontario Workforce Priority']];

export function parse(html) {
  const updated = isoDate((html.match(/Updated:\s*([A-Za-z]+ \d{1,2}, \d{4})/) || [])[1] || '');
  const tokens = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>|<h3[^>]*>([\s\S]*?)<\/h3>|<table[\s\S]*?<\/table>/g)];
  let section = '', stream = '';
  const rows = [];
  for (const t of tokens) {
    if (t[1] !== undefined) { section = text(t[1]); continue; }
    if (t[2] !== undefined) { stream = text(t[2]); continue; }
    const trs = [...t[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => text(c[1])));
    if (!trs.length) continue;
    const head = trs[0].map((h) => h.toLowerCase());
    const col = (re) => head.findIndex((h) => re.test(h));
    const ci = { date: col(/date issued/), n: col(/number/), prof: col(/profiles/), score: col(/score/), notes: col(/notes/) };
    const st = STREAMS.find(([re]) => re.test(stream));
    const sectionYear = (section.match(/\d{4}/) || [])[0] || null;
    for (const r of trs.slice(1)) {
      const date = isoDate(r[ci.date] || '');
      if (!date) continue;
      const scoreText = ci.score >= 0 ? r[ci.score] : '';
      const min = (scoreText.match(/^(\d+)\s+and above/i) || [])[1];
      const range = scoreText.match(/^(\d+)\s+to\s+(\d+)/);
      rows.push({
        date, stream: st ? st[1] : 'other', streamName: st ? st[2] : stream, sectionYear,
        invitations: Number(String(r[ci.n] || '').replace(/[^\d]/g, '')) || null,
        profilesCreated: ci.prof >= 0 ? r[ci.prof] : null,
        minScore: min ? Number(min) : range ? Number(range[1]) : null,
        scoreText: scoreText || null,
        notes: ci.notes >= 0 ? r[ci.notes].replace(/\s*Please refer to[\s\S]*$/i, '').replace(/\.$/, '').trim() || null : null,
      });
    }
  }
  // A row filed under another year's table that repeats a row elsewhere is a copy on the source page: drop it and say so.
  const key = (r) => `${r.date}|${r.invitations}|${r.scoreText}`;
  const dropped = [];
  const kept = rows.filter((r) => {
    const misfiled = r.sectionYear && !r.date.startsWith(r.sectionYear);
    const dup = rows.some((o) => o !== r && key(o) === key(r) && o.stream !== r.stream);
    if (misfiled && dup) { dropped.push({ date: r.date, stream: r.stream, invitations: r.invitations, reason: `listed under ${r.sectionYear} and repeats a row of another stream` }); return false; }
    return true;
  }).map(({ sectionYear, ...r }) => r).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (kept.length < 50) throw new Error(`Only ${kept.length} rows parsed: page structure may have changed`);
  return { source: OINP_ITA_URL, sourceUpdated: updated, rounds: kept, dropped };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  let html;
  if (args[0] === '--fetch') {
    const res = await fetch(OINP_ITA_URL, { headers: { 'user-agent': 'crsplanner-data-bot (+https://crsplanner.com/about/)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } else if (args[0] === '--raw') html = readFileSync(args[1], 'utf8');
  else { console.error('Usage: --fetch | --raw <file>'); process.exit(2); }
  const out = parse(html);
  const target = join(root, 'data/provinces/oinp-draws.json');
  const before = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const json = JSON.stringify({ ...out, fetchedAt: new Date().toISOString().slice(0, 10) }, null, 1);
  const changed = !before || JSON.parse(before).sourceUpdated !== out.sourceUpdated || JSON.parse(before).rounds.length !== out.rounds.length;
  if (changed) writeFileSync(target, json);
  console.log(`${out.rounds.length} OINP rounds, page updated ${out.sourceUpdated}, dropped ${out.dropped.length}; changed=${changed}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
