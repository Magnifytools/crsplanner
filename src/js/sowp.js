// Spousal / family open work permit eligibility (IRCC rules).
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('sowp-rules').textContent);
const form = $('#sowp-form');
const STORE = 'crsplanner.sowp.v1';
function update() {
  const f = form.elements;
  const code = f.noc.value.trim();
  const valid = /^\d{5}$/.test(code);
  const teer = valid ? Number(code[1]) : null;
  const months = f.months.value === '' ? null : Number(f.months.value);
  const spouse = f.who.value === 'spouse';
  const sp = f.special.value;
  $('#noc-hint').dataset.t ||= $('#noc-hint').innerHTML;
  $('#noc-hint').innerHTML = valid ? `TEER ${teer}${teer >= 2 && teer <= 3 ? (R.select.includes(code) ? ', on the eligible TEER 2–3 list' : ', not on the eligible TEER 2–3 list') : ''}` : $('#noc-hint').dataset.t;
  let ok = false, verdict = '', checks = [];
  const row = (l, v, n = '') => checks.push([l, v, n]);
  if (['student', 'pgwp', 'sowp'].includes(sp)) {
    verdict = 'Your family member is not eligible under this measure in your current situation.';
  } else if (f.pr.value !== 'no' && f.permitPr.checked) {
    const rural = f.pr.value === 'rural';
    row('You applied for PR through an eligible economic program and your permit came from it', true);
    row(`Your work permit is valid at least ${R.path} more months`, months !== null && months >= R.path, months === null ? 'enter the months left' : `${months} months`);
    row(rural && spouse ? 'Spouses of RCIP and FCIP applicants use the separate pilot open work permit' : 'Family member covered: spouse, dependent child or their child', !(rural && spouse));
    ok = checks.every((c) => c[1]);
    verdict = ok ? 'Likely eligible under the measure for workers who applied for permanent residence.' : rural && spouse ? 'Under this measure only children qualify for RCIP and FCIP applicants; spouses apply for the pilot open work permit.' : 'Not yet: check the item marked as not met.';
  } else if (f.pathway.checked && teer !== null && teer >= 4) {
    row('On a pathway to PR in a TEER 4 or 5 job', true);
    row(`Your work permit is valid at least ${R.path} more months`, months !== null && months >= R.path, months === null ? 'enter the months left' : `${months} months`);
    ok = checks.every((c) => c[1]);
    verdict = ok ? 'Likely eligible: spouse and dependent children of workers on a pathway to PR.' : 'Not yet: check the item marked as not met.';
  } else if (sp === 'sip') {
    row('Valid work permit or letter of introduction under a B.C. significant investment project', true);
    row('Applicant is a spouse or common-law partner', spouse, spouse ? '' : 'children are not covered');
    ok = spouse;
    verdict = ok ? 'Likely eligible: spouses of B.C. SIP workers, any TEER, no 16-month rule.' : 'Only spouses qualify under the SIP measure.';
  } else {
    const skill = teer !== null && (teer <= 1 || (teer <= 3 && R.select.includes(code)));
    row('Job in TEER 0 or 1, or an eligible TEER 2 or 3 occupation', skill, valid ? `NOC ${code}, TEER ${teer}` : 'enter your NOC code');
    const need = sp === 'qchealth' ? 0 : R.high;
    row(need ? `Your work permit is valid at least ${R.high} more months` : 'Quebec-recruited health worker: no 16-month rule', need ? months !== null && months >= R.high : true, need && months !== null ? `${months} months` : need ? 'enter the months left' : '');
    row('Applicant is a spouse or common-law partner (children no longer qualify since January 21, 2025)', spouse);
    ok = checks.every((c) => c[1]);
    verdict = ok ? 'Likely eligible as the spouse of a high-skilled worker.' : teer !== null && teer >= 4 && !f.pathway.checked ? 'Family of TEER 4 and 5 workers who are not on a pathway to PR no longer qualify, except to extend a permit they already have.' : 'Not yet: check the items marked as not met.';
  }
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'Likely eligible' : 'Not eligible yet';
  $('#verdict').textContent = verdict;
  $('#checks').innerHTML = checks.map(([l, v, n]) => `<div class="cmp-row"><span>${l}</span><span class="tag ${v ? 'yes' : 'no'}">${v ? 'met' : 'not met'}</span>${n ? `<span class="sub">${n}</span>` : ''}</div>`).join('');
  const data = Object.fromEntries([...new FormData(form)]);
  for (const el of form.querySelectorAll('input[type=checkbox]')) data[el.name] = el.checked;
  try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
if (saved) for (const [k, v] of Object.entries(saved)) { const el = form.elements[k]; if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; }
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
