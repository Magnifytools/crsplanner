// Bridging open work permit checklist by program.
const $ = (s) => document.querySelector(s);
const R = JSON.parse(document.getElementById('bowp-rules').textContent);
const form = $('#bowp-form');
function render() {
  const reqs = R[form.elements.program.value];
  $('#reqs').innerHTML = reqs.map((x, i) => `<div class="field check"><input type="checkbox" id="q${i}" data-req><label for="q${i}">${x}</label></div>`).join('');
  update();
}
function update() {
  const boxes = [...form.querySelectorAll('[data-req]')];
  const n = boxes.filter((b) => b.checked).length;
  const ok = n === boxes.length;
  $('#status').className = `tag ${ok ? 'yes' : 'no'}`;
  $('#status').textContent = ok ? 'You can apply for a BOWP' : `${n} of ${boxes.length} requirements met`;
  $('#verdict').textContent = ok ? 'You meet every requirement IRCC lists for your program. Apply online as a work permit extension and choose "Open work permit".' : 'Tick each requirement you meet. All of them are needed.';
}
form.elements.program.addEventListener('change', render);
form.addEventListener('change', (e) => { if (e.target.dataset.req !== undefined) update(); });
form.addEventListener('submit', (e) => e.preventDefault());
render();
