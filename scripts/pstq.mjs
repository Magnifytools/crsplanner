// Québec PSTQ (Programme de sélection des travailleurs qualifiés) invitation rounds, from the yearly pages on Québec.ca.
// node scripts/pstq.mjs --fetch  ->  data/provinces/pstq-invitations.json (run by .github/workflows/draws.yml)
// node scripts/pstq.mjs FILE2025.html FILE2026.html  ->  parse saved pages instead (for testing)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation';
const FIRST_YEAR = 2025; // the PSTQ replaced the PRTQ on November 29, 2024; its first invitations are on the 2025 page
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const STREAMS = { 1: 'Highly qualified and specialized skills', 2: 'Intermediate and manual skills', 3: 'Regulated professions', 4: 'Exceptional talent' };

const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;| | /g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
const iso = (label) => {
  // "January 29, 2026" or "March 19 and 20, 2026": the first day is the date of the round.
  const m = label.match(/([A-Za-z]+) (\d{1,2})(?: and \d{1,2})?, (\d{4})/);
  if (!m || MONTHS.indexOf(m[1].toLowerCase()) < 0) throw new Error(`unreadable round date: ${label}`);
  return `${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
};
const num = (s) => Number(String(s).replace(/[ ,]/g, ''));

export function parseYear(html, year) {
  const upd = text(html).match(/Last update: ([A-Za-z]+ \d{1,2}, \d{4})/);
  // Each stream is a section under <h2 class="">Stream N: …</h2>; the last section ("Other invitations…") is skipped.
  const sections = html.split(/<h2 class="">/).slice(1);
  const rounds = [];
  for (const sec of sections) {
    const h = sec.match(/^\s*Stream[\s  ]*(\d)\s*:/);
    if (!h) continue;
    const stream = Number(h[1]);
    if (!STREAMS[stream]) throw new Error(`unknown stream ${h[1]}`);
    const blocks = sec.split(/<h2 class="panel-title">/).slice(1);
    for (const b of blocks) {
      const t = text(b);
      const head = t.match(/^Invitations? (?:for|of) ([A-Za-z]+ \d{1,2}(?: and \d{1,2})?, \d{4})/);
      if (!head) continue;
      const body = t.slice(head[0].length).replace(/Exercise \d+/g, '|'); // so "Exercise 1 37 of these" reads as 37
      const tot = body.match(/invited ([\d][\d ,]*) (?:people|persons)/);
      const ex = [...body.matchAll(/((?:From \d+ to \d+)|(?:Less than \d+)|\d[\d ,]*) of these invitations/g)].map((m) => (/^\d[\d ,]*$/.test(m[1]) ? num(m[1]) : m[1].toLowerCase()));
      const scores = [...body.matchAll(/(\d{3,4}) points/g)].map((m) => Number(m[1]));
      let total = tot ? num(tot[1]) : null;
      if (total === null && ex.length && ex.every((x) => typeof x === 'number')) total = ex.reduce((a, b2) => a + b2, 0);
      rounds.push({ date: iso(head[1]), label: head[1], stream, total, exercises: ex, minScores: scores });
    }
  }
  return { year, updated: upd ? iso(upd[1]) : null, rounds };
}

export function build(pages) {
  const rounds = [];
  const updated = {};
  for (const [year, html] of pages) {
    const y = parseYear(html, year);
    if (!y.rounds.length) throw new Error(`no rounds found on the ${year} page`);
    updated[year] = y.updated;
    rounds.push(...y.rounds);
  }
  rounds.sort((a, b) => b.date.localeCompare(a.date) || a.stream - b.stream);
  for (const s of [1, 2, 3]) if (!rounds.some((r) => r.stream === s)) throw new Error(`no rounds for stream ${s}`);
  return { source: BASE, pages: Object.fromEntries(pages.map(([y]) => [y, `${BASE}/${y}`])), updated, streams: STREAMS, rounds };
}

if (process.argv[1] && process.argv[1].endsWith('pstq.mjs')) {
  const pages = [];
  if (process.argv[2] === '--fetch') {
    const now = new Date().getUTCFullYear();
    for (let y = FIRST_YEAR; y <= now + 1; y++) {
      const r = await fetch(`${BASE}/${y}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; crsplanner-data/1.0; +https://crsplanner.com/about/)' } });
      if (r.status === 404 && y >= now) continue; // next year's page does not exist until its first round
      if (!r.ok) throw new Error(`${BASE}/${y}: HTTP ${r.status}`);
      pages.push([y, await r.text()]);
    }
  } else {
    for (const f of process.argv.slice(2)) pages.push([Number(f.match(/(\d{4})/)[1]), readFileSync(f, 'utf8')]);
  }
  const data = build(pages);
  const out = 'data/provinces/pstq-invitations.json';
  const prev = existsSync(out) ? readFileSync(out, 'utf8') : '';
  const next = JSON.stringify(data, null, 1) + '\n';
  if (prev !== next) writeFileSync(out, next);
  console.log(`PSTQ: ${data.rounds.length} rounds, latest ${data.rounds[0].date}${prev === next ? ' (unchanged)' : ''}`);
}
