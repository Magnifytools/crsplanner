// Reads Manitoba's EOI draw posts (WordPress API of immigratemanitoba.com) into data/provinces/mpnp-draws.json.
// Usage: node scripts/mpnp.mjs --fetch   |   node scripts/mpnp.mjs --raw posts.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MPNP_API = 'https://immigratemanitoba.com/wp-json/wp/v2/posts';
export const MPNP_PAGE = 'https://immigratemanitoba.com/notices/eoi-draw/';
const ent = (s) => s.replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8220;|&#8221;/g, '"').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;|&[a-z]+;/g, ' ');
const text = (h) => ent(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));
const HEADS = ['Skilled Worker in Manitoba', 'Skilled Worker Overseas', 'International Education Stream', 'Skilled Worker Stream', 'Francophone selection', 'Occupation-specific selections', 'Completed post-secondary study in Manitoba', 'Strategic Recruitment Initiative', 'Business Investor Stream'];

function segments(t) {
  const out = [];
  const re = /Number of Letters of Advice to Apply issued:?\s*([\d,]+)/gi;
  let m, prev = 0;
  while ((m = re.exec(t))) {
    const before = t.slice(prev, m.index);
    const after = t.slice(re.lastIndex, re.lastIndex + 160);
    const s = after.match(/^\s*(?:\.|\s)*Ranking score of (?:the )?lowest[- ]ranked candidate invited:?\s*([\d,]+)/i);
    const low = before.toLowerCase();
    const found = HEADS.map((h) => [h, low.lastIndexOf(h.toLowerCase())]).filter(([, i]) => i >= 0).sort((a, b) => b[1] - a[1]);
    // A heading that only appears inside the criteria sentence is not a section heading.
    const lead = before.search(/(Profiles|Top scoring profiles|All profiles|Candidates)/i);
    const headHit = found.find(([, i]) => lead < 0 || i < lead);
    const head = headHit ? headHit[0] : (out.length ? out[out.length - 1].group : null);
    let desc = before.replace(/^[\s\S]*?(Profiles|Top scoring profiles|All profiles|Candidates)/i, '$1').replace(/\s*were considered[\s\S]*$/i, '').trim();
    if (desc.length > 220) desc = `${desc.slice(0, 217)}…`;
    out.push({ group: head, criteria: desc || null, laas: num(m[1]), minScore: s ? num(s[1]) : null });
    prev = re.lastIndex + (s ? s[0].length : 0);
  }
  return out;
}

export function parse(posts) {
  const draws = posts.filter((p) => /(EOI|Expression of Interest) Draw/i.test(text(p.title.rendered))).map((p) => {
    const title = text(p.title.rendered);
    const t = text(p.content.rendered);
    const segs = segments(t);
    const total = (t.match(/Of the\s*([\d,]+)\s*Letters of Advice to Apply issued/i) || [])[1];
    const ee = (t.match(/Letters of Advice to Apply issued in this draw,\s*([\d,]+)\s*were issued to candidates who declared a valid Express Entry/i) || [])[1];
    return {
      n: Number((title.match(/#\s*(\d+)/) || [])[1]) || null, date: p.date.slice(0, 10), url: p.link,
      laas: total ? num(total) : segs.reduce((s, x) => s + x.laas, 0) || null,
      expressEntry: ee ? num(ee) : null,
      minScores: segs.filter((x) => x.minScore !== null).map((x) => x.minScore),
      segments: segs,
    };
  }).filter((d) => d.n).sort((a, b) => b.n - a.n);
  if (draws.length < 100) throw new Error(`Only ${draws.length} draws parsed`);
  return { source: MPNP_PAGE, api: MPNP_API, draws };
}

async function fetchAll() {
  const all = [];
  for (let page = 1; page < 20; page++) {
    const res = await fetch(`${MPNP_API}?search=draw&per_page=100&page=${page}&_fields=id,date,link,title,content`, { headers: { 'user-agent': 'crsplanner-data-bot (+https://crsplanner.com/about/)' } });
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    all.push(...data);
  }
  return all;
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const a = process.argv.slice(2);
  const posts = a[0] === '--fetch' ? await fetchAll() : a[0] === '--raw' ? JSON.parse(readFileSync(a[1], 'utf8')) : null;
  if (!posts) { console.error('Usage: --fetch | --raw <file>'); process.exit(2); }
  const out = parse(posts);
  const target = join(root, 'data/provinces/mpnp-draws.json');
  const before = existsSync(target) ? readFileSync(target, 'utf8') : '';
  const json = JSON.stringify(out, null, 1);
  const changed = before !== json;
  if (changed) writeFileSync(target, json);
  console.log(`${out.draws.length} MPNP draws, latest #${out.draws[0].n} on ${out.draws[0].date}; changed=${changed}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
