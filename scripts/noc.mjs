// Builds data/noc/noc-2021.json from Statistics Canada's NOC 2021 Version 1.0 CSVs
// (Open Government Licence - Canada). Usage: node scripts/noc.mjs [--fetch | dir-with-csvs]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const BASE = 'https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1/';
const FILES = ['noc-2021-v1.0-classification-structure.csv', 'noc-2021-v1.0-elements.csv'];
function csv(text) {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const arg = process.argv[2];
const texts = [];
for (const n of FILES) {
  if (arg === '--fetch') { const r = await fetch(BASE + n); if (!r.ok) throw new Error(`${n} ${r.status}`); texts.push(await r.text()); }
  else texts.push(readFileSync(`${arg}/${n}`, 'utf8'));
}
const [struct, elems] = texts.map(csv);
const broad = {}, units = {};
for (const [lvl, , code, title, def] of struct.slice(1)) {
  if (lvl === '1') broad[code] = title.trim();
  if (lvl === '5') units[code] = { c: code, t: title.trim(), teer: Number(code[1]), b: Number(code[0]), d: def.trim(), ex: [], du: [], rq: [] };
}
const key = { 'All examples': 'ex', 'Main duties': 'du', 'Employment requirements': 'rq' };
for (const [lvl, code, , type, text] of elems.slice(1)) {
  const u = units[code]; const k = key[type]; const v = (text || '').trim();
  if (lvl === '5' && u && k && v && !u[k].includes(v)) u[k].push(v);
}
const out = { source: BASE, licence: 'Open Government Licence - Canada', version: 'NOC 2021 Version 1.0', broad, units: Object.values(units).sort((a, b) => a.c.localeCompare(b.c)) };
mkdirSync('data/noc', { recursive: true });
writeFileSync('data/noc/noc-2021.json', JSON.stringify(out));
console.log(`${out.units.length} unit groups, ${out.units.reduce((t, u) => t + u.ex.length, 0)} job titles`);
