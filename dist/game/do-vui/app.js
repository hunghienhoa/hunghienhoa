// Đố Vui Trí Tuệ: 10 câu mỗi lượt, có Mẹo gợi ý (còn nửa điểm), chuỗi đúng được cộng thêm. Chạy hoàn toàn trên trình duyệt.
import { QUESTIONS, GROUPS } from './questions.mjs?v=1';

const $ = s => document.querySelector(s);
const ROUND = 10, BASE = 10, HALF = 5;
const store = {
  get(k) { try { return localStorage.getItem('dovui:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('dovui:' + k, v); } catch { /* chỉ là tiện ích */ } }
};
const panels = { start: $('#quiz-start'), play: $('#quiz-play'), end: $('#quiz-end') };
const show = name => { for (const [k, el] of Object.entries(panels)) el.hidden = k !== name; };
const S = { list: [], i: 0, score: 0, streak: 0, right: 0, hint: false, done: false, best: Number(store.get('best')) || 0 };
$('#best').textContent = S.best;

function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const group = () => document.querySelector('input[name="group"]:checked')?.value || 'all';

function begin() {
  const g = group();
  const pool = QUESTIONS.filter(q => g === 'all' || q.c === g);
  S.list = shuffle(pool).slice(0, ROUND);
  Object.assign(S, { i: 0, score: 0, streak: 0, right: 0 });
  $('#q-total').textContent = S.list.length;
  show('play');
  ask();
}

function ask() {
  const q = S.list[S.i];
  S.hint = false; S.done = false;
  $('#q-num').textContent = S.i + 1;
  $('#score').textContent = S.score;
  $('#streak').textContent = S.streak;
  $('#bar').style.width = (S.i / S.list.length) * 100 + '%';
  $('#q-group').textContent = GROUPS[q.c];
  $('#q-text').textContent = q.q;
  $('#hint').disabled = false;
  $('#hint-text').hidden = true; $('#feedback').hidden = true;
  const box = $('#options'); box.textContent = '';
  // Xáo thứ tự đáp án để không đoán theo vị trí.
  const order = shuffle(q.o.map((text, idx) => ({ text, ok: idx === q.a })));
  order.forEach((opt, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'quiz-option'; b.dataset.ok = opt.ok ? '1' : '0';
    const key = document.createElement('kbd'); key.textContent = k + 1;
    const label = document.createElement('span'); label.textContent = opt.text;
    b.append(key, label);
    b.addEventListener('click', () => choose(b));
    box.append(b);
  });
  $('#q-text').focus({ preventScroll: true });
}

function choose(btn) {
  if (S.done) return;
  S.done = true;
  const q = S.list[S.i], ok = btn.dataset.ok === '1';
  let gain = 0;
  if (ok) {
    S.right++; S.streak++;
    gain = S.hint ? HALF : BASE;
    if (!S.hint && S.streak >= 3) gain += Math.min(S.streak - 2, 5) * 2;
  } else S.streak = 0;
  S.score += gain;
  for (const o of $('#options').children) {
    o.disabled = true;
    if (o.dataset.ok === '1') o.classList.add('is-right');
    else if (o === btn) o.classList.add('is-wrong');
  }
  $('#hint').disabled = true;
  $('#score').textContent = S.score; $('#streak').textContent = S.streak;
  $('#fb-title').textContent = ok ? 'Chính xác!' : 'Chưa đúng rồi';
  $('#fb-points').textContent = ok ? `+${gain} điểm` : '';
  $('#fb-explain').textContent = q.e;
  $('#next').textContent = S.i + 1 < S.list.length ? 'Câu tiếp' : 'Xem kết quả';
  $('#feedback').hidden = false;
  $('#next').focus({ preventScroll: true });
}

function finish() {
  $('#bar').style.width = '100%';
  const max = S.list.length * BASE, pct = max ? S.score / max : 0;
  const rank = pct >= 0.9 ? 'Bậc thầy câu đố' : pct >= 0.7 ? 'Đầu óc nhạy bén' : pct >= 0.4 ? 'Khá lắm, thử lại nhé' : 'Khởi động thôi, chơi lại nào';
  if (S.score > S.best) { S.best = S.score; store.set('best', S.best); }
  $('#best').textContent = S.best;
  $('#end-rank').textContent = rank;
  $('#end-score').textContent = S.score;
  $('#end-right').textContent = S.right;
  $('#end-total').textContent = S.list.length;
  $('#end-best').textContent = S.best;
  show('end');
}

$('#start').addEventListener('click', begin);
$('#again').addEventListener('click', begin);
$('#change').addEventListener('click', () => show('start'));
$('#next').addEventListener('click', () => { if (S.i + 1 < S.list.length) { S.i++; ask(); } else finish(); });
$('#hint').addEventListener('click', () => {
  if (S.done || S.hint) return;
  S.hint = true;
  $('#hint-text').textContent = 'Mẹo: ' + S.list[S.i].h;
  $('#hint-text').hidden = false; $('#hint').disabled = true;
});
document.addEventListener('keydown', e => {
  if (panels.play.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!S.done && /^[1-4]$/.test(e.key)) $('#options').children[Number(e.key) - 1]?.click();
  else if (!S.done && (e.key === 'h' || e.key === 'H')) $('#hint').click();
});
