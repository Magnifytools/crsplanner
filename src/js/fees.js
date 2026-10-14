// IRCC permanent residence fee total.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('fees-rules').textContent);
const form = $('#fees-form');
const money = (n) => `$${n.toLocaleString('en-CA')}`;
function update() {
  const f = form.elements;
  const p = R.programs[f.program.value];
  const kids = Math.max(0, Number(f.kids.value) || 0), adults = 1 + (f.spouse.checked ? 1 : 0);
  const bio = Math.max(0, Number(f.bio.value) || 0);
  const rows = [['Principal applicant processing', p.pa]];
  if (f.spouse.checked) rows.push(['Spouse or partner processing', p.spouse]);
  if (kids) rows.push([`Dependent children (${kids} × ${money(p.child)})`, kids * p.child]);
  if (f.rprf.checked && p.rprf) rows.push([`Right of permanent residence fee (${adults} × ${money(R.rprf)})`, adults * R.rprf]);
  if (bio) rows.push([bio > 1 ? `Biometrics (family maximum ${money(R.biometrics.family)})` : 'Biometrics', Math.min(bio * R.biometrics.person, R.biometrics.family)]);
  $('#total').textContent = money(rows.reduce((t, [, v]) => t + v, 0)).slice(1);
  $('#breakdown').innerHTML = rows.map(([l, v]) => `<tr><td>${l}</td><td class="n">${money(v)}</td></tr>`).join('');
}
form.addEventListener('input', update);
form.addEventListener('change', update);
form.addEventListener('submit', (e) => e.preventDefault());
update();
