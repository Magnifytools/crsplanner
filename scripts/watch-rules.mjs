// Checks whether any IRCC page behind our rule files has a newer "dcterms.modified" date
// than the one we built from. Exits with code 1 if so, which fails the GitHub Action and
// sends the repository owner a failure email: that is the alert to review the rules.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function pageDate(html) {
  let m = html.match(/<meta[^>]+name="dcterms\.modified"[^>]+content="([\d-]+)"/i) || html.match(/content="([\d-]+)"[^>]+name="dcterms\.modified"/i);
  if (m) return m[1];
  m = html.match(/property="dateModified"[^>]*>\s*(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Québec.ca: <p class="dateMiseAJour">Last update: … October 22, 2026</p>, with line breaks inside.
  const q = html.match(/class="dateMiseAJour">([\s\S]*?)<\/p>/);
  const u = html.match(/(?:Updated|Last Updated):\s*([A-Za-z]+) (\d{1,2}), (\d{4})/) || (q && q[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/Last update: ([A-Za-z]+) (\d{1,2}), (\d{4})/));
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  return u ? `${u[3]}-${String(MONTHS.indexOf(u[1].toLowerCase()) + 1).padStart(2, '0')}-${u[2].padStart(2, '0')}` : null;
}
export function textHash(html, start, end) {
  const t = html.replace(/data-cmp-data-layer="[^"]*"/g, '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&#39;|&#039;|&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/\s+/g, ' ').trim();
  const a = t.indexOf(start), b = t.indexOf(end, a + start.length);
  if (a < 0 || b < 0) return null;
  return createHash('sha256').update(t.slice(a, b)).digest('hex');
}
if (process.argv[2] === '--hash') {
  const r = await fetch(process.argv[3], { headers: { 'user-agent': 'crsplanner-rules-watch (+https://crsplanner.com/about/)' } });
  console.log(textHash(await r.text(), process.argv[4], process.argv[5]));
  process.exit(0);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data/rules');
let changed = 0, errors = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const rule = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (!rule.source) continue;
  const UA = { headers: { 'user-agent': 'crsplanner-rules-watch (+https://crsplanner.com/about/)' } };
  for (const w of rule.extraWatch || []) {
    try {
      const r = await fetch(w.url, UA);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const h = createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
      if (h !== w.sha256) { changed++; console.log(`CHANGED ${f}: ${w.what} has new content. ${w.url}`); } else console.log(`ok ${f}: ${w.what} unchanged`);
    } catch (e) { errors++; console.log(`ERROR ${f} (${w.what}): ${e.message}`); }
  }
  for (const w of rule.watchPages || []) {
    // Secondary pages behind the same rule file, compared by their modified date.
    try {
      const r = await fetch(w.url, UA);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = pageDate(await r.text());
      if (!d) throw new Error('no modified date found');
      if (d !== w.modified) { changed++; console.log(`CHANGED ${f}: ${w.url} modified ${d}, our data is from ${w.modified}`); } else console.log(`ok ${f}: ${w.url.split('/').slice(-2).join('/')} ${d}`);
    } catch (e) { errors++; console.log(`ERROR ${f} (${w.url}): ${e.message}`); }
  }
  for (const w of rule.hashPages || []) {
    // Pages without any date: compare a hash of the text between two markers.
    try {
      const r = await fetch(w.url, UA);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const h = textHash(await r.text(), w.start, w.end);
      if (!h) throw new Error('markers not found');
      if (h !== w.sha256) { changed++; console.log(`CHANGED ${f}: text changed on ${w.url}`); } else console.log(`ok ${f}: ${w.url.split('/').slice(-1)[0]} text unchanged`);
    } catch (e) { errors++; console.log(`ERROR ${f} (${w.url}): ${e.message}`); }
  }
  if (rule.contentHash) {
    // Pages without a modified date: compare a hash of the text between two markers.
    try {
      const r = await fetch(rule.source, UA);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&#39;|&#039;|&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/\s+/g, ' ').trim();
      const a = t.indexOf(rule.hashStart), b = t.indexOf(rule.hashEnd, a);
      if (a < 0 || b < 0) throw new Error('markers not found');
      const h = createHash('sha256').update(t.slice(a, b)).digest('hex');
      if (h !== rule.contentHash) { changed++; console.log(`CHANGED ${f}: the grid text changed. ${rule.source}`); } else console.log(`ok ${f}: grid text unchanged`);
    } catch (e) { errors++; console.log(`ERROR ${f}: ${e.message}`); }
    continue;
  }
  if (!rule.sourceModified) continue;
  try {
    if (rule.sourceApi) {
      // WordPress pages: the API gives the modification date directly.
      const r = await fetch(rule.sourceApi, { headers: { 'user-agent': 'crsplanner-rules-watch (+https://crsplanner.com/about/)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const mod = String((await r.json()).modified || '').slice(0, 10);
      if (mod !== rule.sourceModified) { changed++; console.log(`CHANGED ${f}: page modified ${mod}, our data is from ${rule.sourceModified}. ${rule.source}`); }
      else console.log(`ok ${f}: ${mod}`);
      continue;
    }
    const res = await fetch(rule.source, { headers: { 'user-agent': 'crsplanner-rules-watch (+https://crsplanner.com/about/)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const d0 = pageDate(html); const m = d0 ? [null, d0] : null;
    if (!m) throw new Error('no modified date found');
    if (m[1] !== rule.sourceModified) { changed++; console.log(`CHANGED ${f}: IRCC page modified ${m[1]}, our data is from ${rule.sourceModified}. ${rule.source}`); }
    else console.log(`ok ${f}: ${m[1]}`);
  } catch (e) { errors++; console.log(`ERROR ${f}: ${e.message}`); }
}
if (changed || errors) process.exit(1);
