// Adds every scheduled page whose date has arrived to data/released.json.
// Run daily by .github/workflows/release.yml; a change is committed and the push rebuilds the site.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schedule = JSON.parse(readFileSync(join(root, 'data/schedule.json'), 'utf8'));
const file = join(root, 'data/released.json');
const before = JSON.parse(readFileSync(file, 'utf8'));
const today = process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10);
const due = Object.entries(schedule.pages).filter(([, d]) => d <= today).map(([p]) => p);
const after = [...new Set([...before, ...due])].sort();
writeFileSync(file, JSON.stringify(after, null, 1) + '\n');
const added = after.filter((p) => !before.includes(p));
console.log(added.length ? `Released: ${added.join(', ')}` : `Nothing due on ${today}`);
