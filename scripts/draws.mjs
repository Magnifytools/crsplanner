// Normalizes IRCC's rounds JSON (ee_rounds_123_en.json) into data/draws.json.
// Usage:
//   node scripts/draws.mjs --fetch            (production: downloads the official file)
//   node scripts/draws.mjs --raw path.json    (normalizes a local copy)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = 'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';
export const PAGE_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html';

// Labels as published in the distribution table on the rounds page (checked 2026-10-14).
export const DIST_FIELDS = [
  ['dd1', '601-1200', 0], ['dd2', '501-600', 0], ['dd3', '451-500', 0],
  ['dd4', '491-500', 1], ['dd5', '481-490', 1], ['dd6', '471-480', 1], ['dd7', '461-470', 1], ['dd8', '451-460', 1],
  ['dd9', '401-450', 0],
  ['dd10', '441-450', 1], ['dd11', '431-440', 1], ['dd12', '421-430', 1], ['dd13', '411-420', 1], ['dd14', '401-410', 1],
  ['dd15', '351-400', 0], ['dd16', '301-350', 0], ['dd17', '0-300', 0],
];

export const CATEGORIES = [
  ['fsw', 'Federal Skilled Worker', /Federal Skilled Worker/i],
  ['fst', 'Federal Skilled Trades', /Federal Skilled Trades/i],
  ['pnp', 'Provincial Nominee Program', /Provincial Nominee/i],
  ['cec', 'Canadian Experience Class', /Canadian Experience Class/i],
  ['french', 'French-language proficiency', /French/i],
  ['physicians', 'Physicians with Canadian work experience', /Physicians/i],
  ['health', 'Healthcare and social services', /Healthcare/i],
  ['trades', 'Trades', /Trade/i],
  ['stem', 'STEM', /STEM/i],
  ['transport', 'Transport', /Transport/i],
  ['education', 'Education', /Education occupations/i],
  ['agriculture', 'Agriculture and agri-food', /Agriculture/i],
  ['managers', 'Senior managers with Canadian work experience', /Senior managers/i],
  ['military', 'Skilled military recruits', /Military/i],
  ['general', 'General (all programs)', /General|No Program Specified/i],
];

export function categoryOf(name) {
  const hit = CATEGORIES.find(([, , re]) => re.test(name || ''));
  return hit ? hit[0] : 'other';
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function normalize(raw, fetchedAt) {
  if (!raw || !Array.isArray(raw.rounds) || raw.rounds.length === 0) throw new Error('Unexpected structure: no rounds array');
  const required = ['drawNumber', 'drawDate', 'drawName', 'drawSize', 'drawCRS'];
  const missing = required.filter((k) => !(k in raw.rounds[0]));
  if (missing.length) throw new Error(`Unexpected structure: missing ${missing.join(', ')}`);

  const rounds = raw.rounds.map((r) => ({
    n: String(r.drawNumber),
    date: r.drawDate,
    name: r.drawName,
    category: categoryOf(r.drawName),
    size: num(r.drawSize),
    crs: num(r.drawCRS),
    tieBreak: r.drawDateTime || r.drawCutOff || null,
  })).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const latest = raw.rounds[0];
  const distribution = DIST_FIELDS
    .map(([k, range, sub]) => ({ range, count: num(latest[k]), sub: !!sub }))
    .filter((d) => d.count !== null);
  const total = num(latest.dd18);
  const check = distribution.filter((d) => !d.sub).reduce((s, d) => s + d.count, 0);
  if (total !== null && check !== total) throw new Error(`Distribution does not add up: ${check} vs ${total}`);

  const usedCats = [...new Set(rounds.map((r) => r.category))];
  return {
    source: SOURCE_URL,
    page: PAGE_URL,
    fetchedAt,
    latestRound: rounds[0],
    distribution: { asOf: latest.drawDistributionAsOn || null, total, buckets: distribution },
    categories: CATEGORIES.filter(([id]) => usedCats.includes(id)).map(([id, label]) => ({ id, label })),
    rounds,
  };
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  let raw;
  if (args[0] === '--fetch') {
    const res = await fetch(SOURCE_URL, { headers: { 'user-agent': 'crsplanner-data-bot (+https://crsplanner.com/about/)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    raw = JSON.parse(text);
    const day = new Date().toISOString().slice(0, 10);
    mkdirSync(join(root, 'data/archive'), { recursive: true });
    writeFileSync(join(root, `data/archive/ee_rounds_${day}.json`), text);
  } else if (args[0] === '--raw') {
    raw = JSON.parse(readFileSync(args[1], 'utf8'));
  } else {
    console.error('Usage: --fetch | --raw <file>');
    process.exit(2);
  }
  const out = normalize(raw, new Date().toISOString());
  const target = join(root, 'data/draws.json');
  const before = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : null;
  writeFileSync(target, JSON.stringify(out, null, 1));
  const changed = !before || before.latestRound?.n !== out.latestRound.n || before.distribution?.asOf !== out.distribution.asOf;
  console.log(`${out.rounds.length} rounds, latest #${out.latestRound.n} on ${out.latestRound.date}; pool ${out.distribution.total} as of ${out.distribution.asOf}; changed=${changed}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
