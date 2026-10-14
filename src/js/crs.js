// CRS engine. Pure functions, no DOM. Rules come from data/rules/*.json.
// Profile shape:
// {
//   age: number,
//   spouseCounts: boolean,          // spouse/partner is coming AND is not a Canadian citizen/PR
//   education: 'none'|'secondary'|'oneYear'|'twoYear'|'bachelor'|'twoOrMore'|'master'|'phd',
//   firstLanguage:  { test: 'ielts'|'celpip'|'pte'|'tef'|'tcf', scores: {speaking, listening, reading, writing} } | null,
//   secondLanguage: same | null,
//   canadianWorkYears: number,      // 0..5+ (skilled, in Canada)
//   foreignWorkYears: number,       // 0..3+
//   certificateOfQualification: boolean,
//   spouse: { education, language: {test, scores} | null, canadianWorkYears } | null,
//   sibling: boolean,
//   canadianEducation: 'none'|'oneOrTwoYears'|'threePlusYears',
//   provincialNomination: boolean
// }

export const SKILLS = ['speaking', 'listening', 'reading', 'writing'];

export function clbForScore(langRules, test, skill, score) {
  const t = langRules.tests[test];
  if (!t) throw new Error(`Unknown test: ${test}`);
  if (score === null || score === undefined || score === '' || Number.isNaN(Number(score))) return null;
  const thresholds = t[skill];
  let clb = 0; // below CLB 4
  langRules.levels.forEach((lvl, i) => {
    if (Number(score) >= thresholds[i]) clb = lvl;
  });
  return clb;
}

export function clbsFor(langRules, entry) {
  if (!entry || !entry.test) return null;
  const out = {};
  for (const s of SKILLS) out[s] = clbForScore(langRules, entry.test, s, entry.scores?.[s]);
  if (SKILLS.some((s) => out[s] === null)) return null;
  return out;
}

const col = (spouseCounts) => (spouseCounts ? 0 : 1);
const yearsKey = (y, cap) => String(Math.max(0, Math.min(cap, Math.floor(Number(y) || 0))));
const minClb = (clbs) => Math.min(...SKILLS.map((s) => clbs[s]));

function perAbility(table, clb, c) {
  const row = table.find((r) => clb >= r.minClb);
  if (!row) return 0;
  return Array.isArray(row.points) ? row.points[c] : row.points;
}

function langOf(langRules, entry) {
  return entry && entry.test ? langRules.tests[entry.test].language : null;
}

export function calculate(rules, langRules, p) {
  const c = col(p.spouseCounts);
  const items = [];
  const add = (section, key, label, points, max) => items.push({ section, key, label, points, max });

  // A. Core
  const age = Number(p.age);
  let agePts = 0;
  if (age >= 17) {
    const k = String(Math.min(Math.floor(age), rules.core.age.maxAge));
    agePts = (rules.core.age.byAge[k] || [0, 0])[c];
  }
  add('core', 'age', 'Age', agePts, rules.core.age.max[c]);

  const eduPts = (rules.core.education.levels[p.education] || [0, 0])[c];
  add('core', 'education', 'Level of education', eduPts, rules.core.education.max[c]);

  const first = clbsFor(langRules, p.firstLanguage);
  const second = clbsFor(langRules, p.secondLanguage);

  let firstPts = 0;
  if (first) for (const s of SKILLS) firstPts += perAbility(rules.core.firstLanguage.perAbilityByClb, first[s], c);
  add('core', 'firstLanguage', 'First official language', firstPts, rules.core.firstLanguage.max[c]);

  let secondPts = 0;
  if (second) for (const s of SKILLS) secondPts += perAbility(rules.core.secondLanguage.perAbilityByClb, second[s], c);
  secondPts = Math.min(secondPts, rules.core.secondLanguage.max[c]);
  add('core', 'secondLanguage', 'Second official language', secondPts, rules.core.secondLanguage.max[c]);

  const cwy = yearsKey(p.canadianWorkYears, 5);
  add('core', 'canadianWork', 'Canadian work experience', rules.core.canadianWork.byYears[cwy][c], rules.core.canadianWork.max[c]);

  // B. Spouse
  if (p.spouseCounts && p.spouse) {
    const sp = rules.spouse;
    add('spouse', 'spouseEducation', "Spouse's education", sp.education.levels[p.spouse.education] || 0, sp.education.max);
    const sclb = clbsFor(langRules, p.spouse.language);
    let slp = 0;
    if (sclb) for (const s of SKILLS) slp += perAbility(sp.language.perAbilityByClb, sclb[s], 0);
    add('spouse', 'spouseLanguage', "Spouse's official language", Math.min(slp, sp.language.max), sp.language.max);
    add('spouse', 'spouseCanadianWork', "Spouse's Canadian work experience", sp.canadianWork.byYears[yearsKey(p.spouse.canadianWorkYears, 5)], sp.canadianWork.max);
  }

  // C. Skill transferability (uses first official language)
  const t = rules.transferability;
  const fmin = first ? minClb(first) : 0;
  const langCol = fmin >= 9 ? 1 : fmin >= 7 ? 0 : -1;
  const cwCol = Number(cwy) >= 2 ? 1 : Number(cwy) === 1 ? 0 : -1;

  const eg = t.education.groups[p.education] || 'noPostSecondary';
  const eduLang = langCol >= 0 ? t.education.withLanguage[eg][langCol] : 0;
  const eduCw = cwCol >= 0 ? t.education.withCanadianWork[eg][cwCol] : 0;
  add('transferability', 'educationLanguage', 'Education + language', eduLang, 50);
  add('transferability', 'educationCanadianWork', 'Education + Canadian work experience', eduCw, 50);

  const fg = t.foreignWork.groups[yearsKey(p.foreignWorkYears, 3)];
  const fwLang = langCol >= 0 ? t.foreignWork.withLanguage[fg][langCol] : 0;
  const fwCw = cwCol >= 0 ? t.foreignWork.withCanadianWork[fg][cwCol] : 0;
  add('transferability', 'foreignWorkLanguage', 'Foreign work experience + language', fwLang, 50);
  add('transferability', 'foreignWorkCanadianWork', 'Foreign work experience + Canadian work experience', fwCw, 50);

  let cert = 0;
  if (p.certificateOfQualification && first && fmin >= 5) cert = fmin >= 7 ? t.certificate.points[1] : t.certificate.points[0];
  add('transferability', 'certificate', 'Certificate of qualification + language', cert, 50);

  // D. Additional
  const a = rules.additional;
  add('additional', 'sibling', 'Brother or sister in Canada', p.sibling ? a.sibling : 0, a.sibling);

  let french = 0;
  const entries = [[p.firstLanguage, first], [p.secondLanguage, second]];
  const fr = entries.find(([e]) => langOf(langRules, e) === 'fr');
  const en = entries.find(([e]) => langOf(langRules, e) === 'en');
  if (fr && fr[1] && minClb(fr[1]) >= a.french.minNclc) {
    french = en && en[1] && minClb(en[1]) >= 5 ? a.french.withEnglishClb5 : a.french.withWeakOrNoEnglish;
  }
  add('additional', 'french', 'French language skills', french, 50);

  const ce = a.canadianEducation[p.canadianEducation] || 0;
  add('additional', 'canadianEducation', 'Post-secondary education in Canada', ce, 30);
  add('additional', 'nomination', 'Provincial or territorial nomination', p.provincialNomination ? a.provincialNomination : 0, 600);

  // Subtotals with caps
  const sum = (s) => items.filter((i) => i.section === s).reduce((n, i) => n + i.points, 0);
  const transferRaw = {
    education: Math.min(t.education.max, eduLang + eduCw),
    foreignWork: Math.min(t.foreignWork.max, fwLang + fwCw),
    certificate: cert,
  };
  const sections = {
    core: sum('core'),
    spouse: sum('spouse'),
    transferability: Math.min(t.max, transferRaw.education + transferRaw.foreignWork + transferRaw.certificate),
    additional: Math.min(a.max, sum('additional')),
  };
  const total = sections.core + sections.spouse + sections.transferability + sections.additional;
  return { total, sections, transferRaw, items, clb: { first, second }, spouseCounts: !!p.spouseCounts };
}

// What-if scenarios: each returns a modified copy of the profile, or null if it does not apply.
export const SCENARIOS = [
  {
    id: 'ageOlder',
    label: 'One year older (same profile)',
    apply: (p) => ({ ...p, age: Number(p.age) + 1 }),
  },
  {
    id: 'canadianWorkPlusOne',
    label: 'One more year of Canadian work experience',
    apply: (p) => (Number(p.canadianWorkYears) >= 5 ? null : { ...p, canadianWorkYears: Number(p.canadianWorkYears) + 1 }),
  },
  {
    id: 'firstLanguageNextLevel',
    label: 'First language: every ability one CLB level higher',
    apply: (p, langRules) => bumpLanguage(p, 'firstLanguage', langRules),
  },
  {
    id: 'frenchNclc7',
    label: 'French at NCLC 7 in all four abilities (as second language)',
    apply: (p, langRules) => {
      if (langOf(langRules, p.firstLanguage) === 'fr') return null;
      const t = langRules.tests.tef;
      const scores = {};
      SKILLS.forEach((s) => { scores[s] = t[s][langRules.levels.indexOf(7)]; });
      return { ...p, secondLanguage: { test: 'tef', scores } };
    },
  },
  {
    id: 'canadianEducation',
    label: 'A Canadian credential of three years or more',
    apply: (p) => (p.canadianEducation === 'threePlusYears' ? null : { ...p, canadianEducation: 'threePlusYears' }),
  },
  {
    id: 'nomination',
    label: 'Provincial nomination',
    apply: (p) => (p.provincialNomination ? null : { ...p, provincialNomination: true }),
  },
];

function bumpLanguage(p, key, langRules) {
  const e = p[key];
  if (!e || !e.test) return null;
  const t = langRules.tests[e.test];
  const scores = { ...e.scores };
  let changed = false;
  for (const s of SKILLS) {
    const cur = clbForScore(langRules, e.test, s, e.scores[s]);
    const idx = langRules.levels.indexOf(cur);
    const nextIdx = cur < 4 ? 0 : idx + 1;
    if (nextIdx < langRules.levels.length) {
      scores[s] = t[s][nextIdx];
      changed = true;
    }
  }
  return changed ? { ...p, [key]: { ...e, scores } } : null;
}

export function whatIf(rules, langRules, profile) {
  const base = calculate(rules, langRules, profile).total;
  return SCENARIOS.map((sc) => {
    const next = sc.apply(profile, langRules);
    if (!next) return null;
    const total = calculate(rules, langRules, next).total;
    return { id: sc.id, label: sc.label, total, delta: total - base };
  }).filter(Boolean);
}
