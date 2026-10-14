// NOC 2021 code finder: search job titles, show TEER and Express Entry notes.
const $ = (s) => document.querySelector(s);
const M = JSON.parse(document.getElementById('noc-meta').textContent);
const q = $('#noc-q'), list = $('#noc-results'), status = $('#noc-status');
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let idx = null, details = null;
async function load() {
  if (idx) return idx;
  status.textContent = 'Loading the NOC 2021 list…';
  const rows = await (await fetch('/data/noc-index.json')).json();
  idx = rows.map(([c, t, ex]) => { const exs = ex ? ex.split('|') : []; return { c, t, teer: Number(c[1]), exs, nt: norm(t), nex: exs.map(norm) }; });
  return idx;
}
function search(text) {
  const n = norm(text);
  if (!n) return [];
  if (/^\d{5}$/.test(n)) return idx.filter((u) => u.c === n).map((u) => ({ u, hits: [] }));
  if (/^\d{1,4}$/.test(n)) return idx.filter((u) => u.c.startsWith(n)).map((u) => ({ u, hits: [] }));
  const toks = n.split(' ');
  const has = (s) => toks.every((t) => (` ${s}`).includes(` ${t}`));
  const out = [];
  for (const u of idx) {
    let score = 0; const hits = [];
    if (u.nt === n) score = 100; else if (has(u.nt)) score = 50;
    u.nex.forEach((e, i) => { if (has(e)) { hits.push(u.exs[i]); score = Math.max(score, e === n ? 90 : 30); } });
    if (score) out.push({ u, hits: hits.sort((a, b) => a.length - b.length), score: score + Math.min(hits.length, 10) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 25);
}
function card({ u, hits }) {
  const T = M.teer[u.teer];
  const skilled = u.teer <= 3;
  const cats = M.cats[u.c] || [];
  const ee = skilled
    ? `Counts as skilled work (TEER 0 to 3) for the Federal Skilled Worker Program and the Canadian Experience Class. For the CEC the minimum is CLB ${u.teer <= 1 ? M.cec.teer01 : M.cec.teer23}.`
    : 'TEER 4 and 5 jobs do not count as skilled work for the Federal Skilled Worker Program or the Canadian Experience Class.';
  return `<li class="noc-card"><div class="noc-head"><span class="noc-code">${u.c}</span><strong>${esc(u.t)}</strong><span class="badge">TEER ${u.teer}</span></div>
<p class="small">${esc(T[1])}.</p>
${hits.length ? `<p class="small"><strong>Matching job titles:</strong> ${hits.slice(0, 8).map(esc).join('; ')}${hits.length > 8 ? ` and ${hits.length - 8} more` : ''}</p>` : ''}
<p class="small">${ee}</p>
${M.sowp && (u.teer <= 1 || M.sowp.includes(u.c)) ? `<p class="small">Your spouse may qualify for an open work permit while you work in this job; see the <a href="/spousal-open-work-permit/">spousal open work permit checker</a>.</p>` : ''}
${cats.length ? `<p class="small"><strong>Express Entry category:</strong> ${cats.map(([id, name]) => `<a href="/express-entry-categories/#${id}">${esc(name)}</a>`).join(', ')}</p>` : ''}
<button type="button" class="linkish" data-code="${u.c}">Main duties and requirements</button><div class="noc-more" id="more-${u.c}" hidden></div></li>`;
}
let timer;
async function run() {
  await load();
  const v = q.value.trim();
  const res = search(v);
  if (!v) { status.textContent = `${idx.length} occupations in NOC 2021. Type a job title or a code.`; list.innerHTML = ''; return; }
  if (/^\d{4}$/.test(v) && !res.length) { status.textContent = 'Four-digit codes are from NOC 2016. NOC 2021 codes have five digits: search your job title instead.'; list.innerHTML = ''; return; }
  status.textContent = res.length ? `${res.length}${res.length === 25 ? '+' : ''} occupation${res.length > 1 ? 's' : ''} for “${v}”` : `No NOC 2021 occupation matches “${v}”. Try a shorter or more general title.`;
  list.innerHTML = res.map(card).join('');
  try { history.replaceState(null, '', `?q=${encodeURIComponent(v)}`); } catch (e) { /* ignore */ }
}
q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 150); });
$('#noc-form').addEventListener('submit', (e) => { e.preventDefault(); run(); });
list.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-code]'); if (!b) return;
  const box = document.getElementById(`more-${b.dataset.code}`);
  if (!box.hidden) { box.hidden = true; return; }
  if (!details) details = await (await fetch('/data/noc-details.json')).json();
  const [d, du, rq] = details[b.dataset.code];
  box.innerHTML = `<p class="small">${esc(d)}</p>${du.length ? `<p class="small"><strong>Main duties</strong></p><ul class="small">${du.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${rq.length ? `<p class="small"><strong>Employment requirements</strong></p><ul class="small">${rq.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
  box.hidden = false;
});
const start = new URLSearchParams(location.search).get('q');
if (start) q.value = start;
run();
