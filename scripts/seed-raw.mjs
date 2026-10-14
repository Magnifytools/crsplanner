// Builds a file in IRCC's raw format from data/draws-seed.txt (extracted 2026-10-14 from the official JSON
// through a browser, because this workspace cannot reach canada.ca). Only for local previews; production
// uses `node scripts/draws.mjs --fetch`.
import { readFileSync, writeFileSync } from 'node:fs';

const TYPES = [
  'Provincial Nominee Program', 'Trades Occupations, 2026-Version 3', 'Canadian Experience Class',
  'Senior managers with Canadian Work Experience, 2026-Version 1', 'Healthcare and Social Services Occupations, 2026-Version 3',
  'Physicians with Canadian Work Experience, 2026-Version 1', 'French-Language proficiency 2026-Version 2',
  'Transport Occupations, 2026-Version 2', 'Skilled Military Recruits, 2026-Version 1', 'French language proficiency (Version 1)',
  'Healthcare and social services occupations (Version 2)', 'Trade occupations (Version 2)', 'Education occupations (Version 1)',
  'Healthcare occupations (Version 1)', 'Trade occupations (Version 1)', 'General', 'STEM occupations (Version 1)',
  'Transport occupations (Version 1)', 'Agriculture and agri-food occupations (Version 1)', 'No Program Specified',
  'Federal Skilled Worker', 'Federal Skilled Trades',
];
const LATEST_DIST = {
  drawDistributionAsOn: 'October 12, 2026',
  dd1: '749', dd2: '21,638', dd3: '71,612', dd4: '12,136', dd5: '12,184', dd6: '16,220', dd7: '16,221', dd8: '14,851',
  dd9: '63,528', dd10: '13,749', dd11: '13,474', dd12: '12,467', dd13: '12,201', dd14: '11,637', dd15: '47,167',
  dd16: '17,123', dd17: '7,639', dd18: '229,456',
};

const rows = readFileSync(new URL('../data/draws-seed.txt', import.meta.url), 'utf8').trim().split(';');
const rounds = rows.map((r, i) => {
  const [n, date, t, size, crs] = r.split(',');
  return { drawNumber: n, drawDate: date, drawName: TYPES[Number(t)], drawSize: size, drawCRS: crs, ...(i === 0 ? LATEST_DIST : {}) };
});
writeFileSync(process.argv[2] || '/tmp/ee_rounds_seed.json', JSON.stringify({ rounds }));
console.log(`${rounds.length} rounds written`);
