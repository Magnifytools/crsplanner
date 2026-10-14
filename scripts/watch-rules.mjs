// Checks whether any IRCC page behind our rule files has a newer "dcterms.modified" date
// than the one we built from. Exits with code 1 if so, which fails the GitHub Action and
// sends the repository owner a failure email: that is the alert to review the rules.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data/rules');
let changed = 0, errors = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const rule = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  if (!rule.source || !rule.sourceModified) continue;
  try {
    const res = await fetch(rule.source, { headers: { 'user-agent': 'crsplanner-rules-watch (+https://crsplanner.com/about/)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/<meta[^>]+name="dcterms\.modified"[^>]+content="([\d-]+)"/i) || html.match(/content="([\d-]+)"[^>]+name="dcterms\.modified"/i);
    if (!m) throw new Error('no dcterms.modified found');
    if (m[1] !== rule.sourceModified) { changed++; console.log(`CHANGED ${f}: IRCC page modified ${m[1]}, our data is from ${rule.sourceModified}. ${rule.source}`); }
    else console.log(`ok ${f}: ${m[1]}`);
  } catch (e) { errors++; console.log(`ERROR ${f}: ${e.message}`); }
}
if (changed || errors) process.exit(1);
