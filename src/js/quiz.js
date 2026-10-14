// Citizenship test practice: grade answers, draw a random 20-question test.
const $ = (s) => document.querySelector(s);
const all = [...document.querySelectorAll('.quiz-q')];
let answered = 0, right = 0, size = all.length;
const score = () => { $('#quiz-score').textContent = answered ? `${right} of ${answered} correct${answered === size ? (size === 20 ? (right >= 15 ? ' · Pass (15 needed)' : ' · Not a pass yet (15 needed)') : '') : ''}` : 'Answer the questions below.'; };
function reset(show) {
  answered = 0; right = 0;
  all.forEach((q) => { q.hidden = !show.includes(q); q.classList.remove('done'); q.querySelectorAll('button').forEach((b) => { b.disabled = false; b.className = ''; }); q.querySelector('details').open = false; });
  size = show.length; score();
}
document.getElementById('quiz').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-o]'); if (!b) return;
  const q = b.closest('.quiz-q'); if (q.classList.contains('done')) return;
  const a = Number(q.dataset.a), o = Number(b.dataset.o);
  q.classList.add('done'); answered++; if (a === o) right++;
  q.querySelectorAll('button').forEach((x) => { x.disabled = true; if (Number(x.dataset.o) === a) x.className = 'right'; });
  if (a !== o) b.className = 'wrong';
  q.querySelector('details').open = true;
  score();
});
$('#quiz-new').addEventListener('click', () => { const s = [...all].sort(() => Math.random() - 0.5).slice(0, 20); reset(s); s.sort((x, y) => all.indexOf(x) - all.indexOf(y)); window.scrollTo({ top: $('#quiz').offsetTop - 80, behavior: 'smooth' }); });
$('#quiz-all').addEventListener('click', () => reset(all));
score();
