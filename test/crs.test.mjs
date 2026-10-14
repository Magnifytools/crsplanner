import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, clbForScore, whatIf } from '../src/js/crs.js';

const rules = JSON.parse(readFileSync(new URL('../data/rules/crs.json', import.meta.url)));
const lang = JSON.parse(readFileSync(new URL('../data/rules/language-tests.json', import.meta.url)));

const base = {
  age: 29, spouseCounts: false, education: 'none', firstLanguage: null, secondLanguage: null,
  canadianWorkYears: 0, foreignWorkYears: 0, certificateOfQualification: false, spouse: null,
  sibling: false, canadianEducation: 'none', provincialNomination: false,
};
const ielts = (s, l, r, w) => ({ test: 'ielts', scores: { speaking: s, listening: l, reading: r, writing: w } });

test('CLB conversion follows the official thresholds', () => {
  assert.equal(clbForScore(lang, 'ielts', 'listening', 7.0), 7);
  assert.equal(clbForScore(lang, 'ielts', 'listening', 8.0), 9);
  assert.equal(clbForScore(lang, 'ielts', 'reading', 5.0), 6);
  assert.equal(clbForScore(lang, 'ielts', 'reading', 3.0), 0);
  assert.equal(clbForScore(lang, 'celpip', 'writing', 12), 10);
  assert.equal(clbForScore(lang, 'pte', 'writing', 89), 9);
  assert.equal(clbForScore(lang, 'pte', 'writing', 90), 10);
  assert.equal(clbForScore(lang, 'tef', 'reading', 248), 9);
  assert.equal(clbForScore(lang, 'tcf', 'speaking', 11), 7);
});

test('A: single, 29, master, IELTS CLB 9, 3 years abroad = 469', () => {
  const r = calculate(rules, lang, { ...base, education: 'master', firstLanguage: ielts(7, 8, 7, 7), foreignWorkYears: 3 });
  assert.deepEqual(r.sections, { core: 369, spouse: 0, transferability: 100, additional: 0 });
  assert.equal(r.total, 469);
});

test('B: couple, 33, bachelor, CELPIP 8, 1 year in Canada, sibling = 402', () => {
  const r = calculate(rules, lang, {
    ...base, age: 33, spouseCounts: true, education: 'bachelor',
    firstLanguage: { test: 'celpip', scores: { speaking: 8, listening: 8, reading: 8, writing: 8 } },
    canadianWorkYears: 1, foreignWorkYears: 2, sibling: true,
    spouse: { education: 'bachelor', language: ielts(6, 6, 6, 6), canadianWorkYears: 0 },
  });
  assert.deepEqual(r.sections, { core: 315, spouse: 20, transferability: 52, additional: 15 });
  assert.equal(r.total, 402);
});

test('C: French first language NCLC 9 with English CLB 5+ = 428', () => {
  const r = calculate(rules, lang, {
    ...base, age: 40, education: 'phd',
    firstLanguage: { test: 'tef', scores: { speaking: 371, listening: 298, reading: 248, writing: 371 } },
    secondLanguage: ielts(5.0, 5.0, 5.0, 5.0),
  });
  assert.deepEqual(r.sections, { core: 328, spouse: 0, transferability: 50, additional: 50 });
  assert.equal(r.total, 428);
});

test('D: second language is capped at 22 when the spouse counts', () => {
  const r = calculate(rules, lang, {
    ...base, spouseCounts: true, spouse: { education: 'none', language: null, canadianWorkYears: 0 },
    firstLanguage: ielts(8, 9, 8, 8), secondLanguage: { test: 'tef', scores: { speaking: 400, listening: 320, reading: 270, writing: 400 } },
  });
  assert.equal(r.items.find((i) => i.key === 'secondLanguage').points, 22);
});

test('E: transferability never exceeds 100 and additional never exceeds 600', () => {
  const r = calculate(rules, lang, {
    ...base, education: 'phd', firstLanguage: ielts(9, 9, 9, 9), canadianWorkYears: 5, foreignWorkYears: 3,
    certificateOfQualification: true, sibling: true, canadianEducation: 'threePlusYears', provincialNomination: true,
    secondLanguage: { test: 'tef', scores: { speaking: 450, listening: 360, reading: 300, writing: 450 } },
  });
  assert.equal(r.sections.transferability, 100);
  assert.equal(r.sections.additional, 600);
  assert.ok(r.total <= 1200);
});

test('Ages outside 18-44 get the official edge values', () => {
  const s = (age) => calculate(rules, lang, { ...base, age }).items.find((i) => i.key === 'age').points;
  assert.equal(s(17), 0);
  assert.equal(s(18), 99);
  assert.equal(s(44), 6);
  assert.equal(s(45), 0);
  assert.equal(s(52), 0);
});

test('What-if: one more year of Canadian work for profile A adds core + transferability', () => {
  const p = { ...base, education: 'master', firstLanguage: ielts(7, 8, 7, 7), foreignWorkYears: 3 };
  const w = whatIf(rules, lang, p).find((x) => x.id === 'canadianWorkPlusOne');
  // core +40; education+CW 25 but education already capped at 50; foreign+CW 25 but foreign capped at 50
  assert.equal(w.delta, 40);
});

test('TCF Canada at NCLC 4 scores 6 per ability, as in the published criteria (IRCC tool gives 0)', () => {
  const r = calculate(rules, lang, { ...base, firstLanguage: { test: 'tcf', scores: { speaking: 4, listening: 331, reading: 342, writing: 4 } } });
  assert.equal(r.items.find((i) => i.key === 'firstLanguage').points, 24);
});
