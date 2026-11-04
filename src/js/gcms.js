// GCMS notes: which request to make, fee, consent and IRCC's response date (Privacy Act / Access to Information Act).
const $ = (s) => document.querySelector(s);
const { D, PA, AT } = JSON.parse(document.getElementById('gcms-rules').textContent);
const form = $('#gcms-form');
const STORE = 'crsplanner.gcms.v1';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const todayIso = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };

function update() {
  const f = form.elements;
  const whose = f.whose.value, status = f.status.value;
  $('#status-field').hidden = whose !== 'sponsor';
  const sent = f.sent.value || todayIso();
  let act, html = '';
  if (whose === 'sponsor' && status === 'out') {
    html = `<div class="total"><span class="tag no">Not under the Access to Information Act</span></div>
    <p>Only Canadian citizens, permanent residents and people or companies in Canada can make an Access to Information request. Your family member can ask for their own file under the Privacy Act, for free, from anywhere, or someone in Canada can make the request with their consent.</p>`;
  } else {
    act = whose === 'sponsor' ? 'access' : 'privacy';
    const P = act === 'privacy';
    const due = addDays(sent, P ? PA.responseDays : AT.responseDays);
    const consent = whose === 'own' ? 'Not needed for your own file.' : P ? `Form IMM 5744 signed by each person on the file ${PA.consentAge}.` : `Form IMM 5744 signed by your family member and by each person on the file ${AT.consentAge}.`;
    html = `<div class="total"><span><span class="of">IRCC must answer by</span><br><span class="score" style="font-size:2.2rem">${longDate(due)}</span></span><span class="tag yes">${P ? 'Privacy Act' : 'Access to Information Act'}</span></div>
    <div class="table-scroll"><table><tbody>
      <tr><td>Request under</td><td>${P ? 'Privacy Act' : 'Access to Information Act'}</td></tr>
      <tr><td>Fee</td><td class="n">${P ? 'None' : `CA$${AT.fee}`}</td></tr>
      <tr><td>Consent</td><td>${consent}</td></tr>
      <tr><td>Received by IRCC</td><td class="n">${longDate(sent)}</td></tr>
      <tr><td>${P ? PA.responseDays : AT.responseDays} days later</td><td class="n">${longDate(due)}</td></tr>
      ${P ? `<tr><td>Latest with the usual extension (up to ${PA.maxExtensionDays} more days)</td><td class="n">${longDate(addDays(due, PA.maxExtensionDays))}</td></tr>` : '<tr><td>If IRCC extends it</td><td>For a "reasonable period"; it must tell you how long within the first 30 days</td></tr>'}
    </tbody></table></div>`;
  }
  const app = f.app.value, ref = f.refused.value;
  if (app !== 'none') {
    const rule = app === 'tr' ? D.temporary : app === 'pr' ? D.permanent : null;
    let note;
    if (!rule) note = 'IRCC does not list this type among the refusals that come with an officer decision note, so the file request is how you see the reasons.';
    else if (!ref) note = 'Enter the date of the refusal letter to check whether it should include an officer decision note.';
    else if (ref >= rule.from) note = `IRCC has sent officer decision notes with most refusals of this type since ${longDate(rule.from)}. Check your letter: the reasons may already be there. Parts can be removed, so the full file can still be worth asking for.`;
    else note = `Your refusal is from before ${longDate(rule.from)}, when IRCC started sending decision notes for this type, so the file request is how you see the officer's reasons.`;
    html += `<p class="small"><strong>Decision note:</strong> ${note}</p>`;
  }
  $('#gcms-out').innerHTML = html;
  try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(['whose', 'status', 'sent', 'app', 'refused'].map((k) => [k, f[k].value])))); } catch (e) { /* ignore */ }
}

let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
const init = saved || { whose: 'own', status: 'citizen', sent: todayIso(), app: 'tr', refused: '' };
for (const [k, v] of Object.entries(init)) if (form.elements[k]) form.elements[k].value = v;
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
