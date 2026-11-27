// Đố Vui Trí Tuệ kiểu "Ai là triệu phú": câu hỏi không giới hạn, mức khó tăng theo chuỗi đúng, 4 quyền trợ giúp.
// Chơi một mình chạy hoàn toàn trên trình duyệt; chơi nhiều người dùng phòng WebSocket (máy chủ giữ đáp án).
import { GROUPS } from './questions.mjs?v=1';
import * as E from './engine.mjs?v=1';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LETTERS = ['A', 'B', 'C', 'D'], LEVELS = ['Dễ', 'Vừa', 'Khó'];
const store = {
  get(k) { try { return localStorage.getItem('dovui:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('dovui:' + k, v); } catch { /* chỉ là tiện ích */ } }
};
const panels = { start: $('#quiz-start'), lobby: $('#multi-lobby'), room: $('#multi-room'), play: $('#quiz-play'), end: $('#quiz-end') };
const show = name => { for (const [k, el] of Object.entries(panels)) el.hidden = k !== name; };
const setStatus = text => { for (const id of ['#lobby-status', '#room-status', '#play-status']) { const el = $(id); if (el) el.textContent = text; } };
const group = () => document.querySelector('input[name="group"]:checked')?.value || 'all';
let mode = 'solo'; // 'solo' | 'multi'

const best = { score: Number(store.get('best')) || 0, streak: Number(store.get('best-streak')) || 0 };
const showBest = () => { $('#best').textContent = best.score; $('#best-streak').textContent = best.streak; };
showBest();

// ---------- Phần hiển thị dùng chung ----------
function renderQuestion(q, { num, group: g }) {
  $('#q-num').textContent = num;
  $('#q-group').textContent = GROUPS[q.c] || GROUPS.logic;
  $('#q-level').textContent = LEVELS[q.lv - 1];
  $('#q-text').textContent = q.q;
  const box = $('#options'); box.textContent = '';
  q.o.forEach((text, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'quiz-option'; b.dataset.i = k;
    const key = document.createElement('kbd'); key.textContent = LETTERS[k];
    const label = document.createElement('span'); label.textContent = text;
    b.append(key, label);
    b.addEventListener('click', () => onPick(k));
    box.append(b);
  });
  clearHelp();
  $('#feedback').hidden = true;
  $('#q-text').focus({ preventScroll: true });
}
function clearHelp() {
  for (const id of ['#hint-text', '#friend-text', '#audience']) $(id).hidden = true;
  $('#audience-bars').textContent = '';
}
function applyRemoved(list) { for (const i of list) { const o = $('#options').children[i]; if (o) { o.disabled = true; o.classList.add('is-removed'); } } }
function showAudience(percent) {
  const wrap = $('#audience-bars'); wrap.textContent = '';
  percent.forEach((v, k) => {
    const row = document.createElement('div'); row.className = 'quiz-abar';
    const l = document.createElement('span'); l.textContent = LETTERS[k];
    const bar = document.createElement('i'); bar.style.setProperty('--w', v + '%');
    const n = document.createElement('b'); n.textContent = v + '%';
    row.append(l, bar, n); wrap.append(row);
  });
  $('#audience').hidden = false;
}
function showFriend(f) { $('#friend-text').textContent = `Người thân: "Mình nghĩ là đáp án ${LETTERS[f.pick]}, chắc khoảng ${f.sure}%."`; $('#friend-text').hidden = false; }
function showHint(text) { $('#hint-text').textContent = 'Mẹo: ' + text; $('#hint-text').hidden = false; }
function setLifelines(left, locked) {
  for (const b of $$('[data-life]')) b.disabled = locked || !left?.[b.dataset.life];
  $('#hint').disabled = locked;
}
function revealOptions(right, pick) {
  for (const o of $('#options').children) {
    const i = Number(o.dataset.i); o.disabled = true;
    if (i === right) o.classList.add('is-right'); else if (i === pick) o.classList.add('is-wrong');
  }
}
function showFeedback({ ok, gain, explain, silent }) {
  $('#fb-title').textContent = silent ? 'Hết giờ' : ok ? 'Chính xác!' : 'Chưa đúng rồi';
  $('#fb-points').textContent = ok ? `+${gain} điểm` : '';
  $('#fb-explain').textContent = explain;
  $('#feedback').hidden = false;
}

// ---------- Chơi một mình ----------
const S = { q: null, num: 0, score: 0, streak: 0, right: 0, bestRun: 0, lives: 3, used: new Set(), life: {}, removed: [], hint: false, done: false };

function soloBegin() {
  mode = 'solo';
  Object.assign(S, { num: 0, score: 0, streak: 0, right: 0, bestRun: 0, lives: 3, used: new Set(), life: { fifty: 1, audience: 1, friend: 1, swap: 1 } });
  $('#lives-wrap').hidden = false; $('#timer-wrap').hidden = true; $('#board-wrap').hidden = true;
  $('#next').hidden = false; $('#fb-auto').hidden = true; $('#swap-note').hidden = true;
  show('play');
  soloNext();
}
function soloNext(replace) {
  const g = group();
  let q;
  for (let tries = 0; tries < 12; tries++) {
    q = E.pickQuestion(Math.random, E.levelForStreak(S.streak), S.used, S.num + tries);
    if (g === 'all' || q.c === g || tries > 8) break;
  }
  S.used.add(q.id); S.q = q; S.removed = []; S.hint = false; S.done = false;
  if (!replace) S.num++;
  $('#bar').style.width = '100%';
  renderQuestion(q, { num: S.num });
  setLifelines(S.life, false);
  updateSoloStats();
}
function updateSoloStats() { $('#score').textContent = S.score; $('#streak').textContent = S.streak; $('#lives').textContent = S.lives; }
function soloPick(i) {
  if (S.done || S.removed.includes(i)) return;
  S.done = true;
  const q = S.q, ok = i === q.a;
  let gain = 0;
  if (ok) { S.right++; S.streak++; S.bestRun = Math.max(S.bestRun, S.streak); gain = E.points({ lv: q.lv, hint: S.hint, streak: S.streak }); S.score += gain; }
  else { S.streak = 0; S.lives--; }
  revealOptions(q.a, i);
  setLifelines(S.life, true);
  updateSoloStats();
  showFeedback({ ok, gain, explain: q.e });
  $('#next').textContent = S.lives > 0 ? 'Câu tiếp' : 'Xem kết quả';
  $('#next').focus({ preventScroll: true });
}
function soloLife(k) {
  if (S.done) return;
  if (k === 'hint') { S.hint = true; showHint(S.q.h); $('#hint').disabled = true; return; }
  if (!S.life[k]) return;
  S.life[k]--;
  if (k === 'fifty') { S.removed = E.fifty(Math.random, S.q); applyRemoved(S.removed); }
  else if (k === 'audience') showAudience(E.audience(Math.random, S.q, S.removed));
  else if (k === 'friend') showFriend(E.friend(Math.random, S.q, S.removed));
  else { soloNext(true); $('#swap-note').hidden = true; }
  setLifelines(S.life, false);
  if (S.hint) $('#hint').disabled = true;
}
function soloFinish() {
  const rank = S.score >= 400 ? 'Bậc thầy câu đố' : S.score >= 200 ? 'Đầu óc nhạy bén' : S.score >= 80 ? 'Khá lắm, thử lại nhé' : 'Khởi động thôi, chơi lại nào';
  if (S.score > best.score) { best.score = S.score; store.set('best', best.score); }
  if (S.bestRun > best.streak) { best.streak = S.bestRun; store.set('best-streak', best.streak); }
  showBest();
  $('#end-rank').textContent = rank;
  $('#end-score').textContent = S.score; $('#end-right').textContent = S.right; $('#end-streak').textContent = S.bestRun; $('#end-best').textContent = best.score;
  show('end');
}

// ---------- Chơi nhiều người ----------
const M = { room: null, ws: null, timer: 0, ping: 0, state: null, offset: 0 };
const roomToken = code => { try { const v = JSON.parse(store.get('seat:' + code) || 'null'); return v && Date.now() - v.at < 3 * 3600_000 ? v.token : null; } catch { return null; } };
const playerName = () => { const v = ($('#player-name').value || '').trim(); store.set('name', v); return v; };
$('#player-name').value = store.get('name') || '';

async function api(path, body) {
  const res = await fetch('/api/game' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(res.status === 404 && body ? 'Chế độ nhiều người chưa sẵn sàng ở đây.' : data.error || 'Chưa kết nối được máy chủ. Hãy thử lại sau.');
  return data;
}
async function guard(job) {
  const buttons = $$('#multi-lobby button'); buttons.forEach(b => { b.disabled = true; });
  try { await job(); } catch (e) { setStatus(e.message); } finally { buttons.forEach(b => { b.disabled = false; }); }
}
function enterRoom(code) {
  leaveRoom(false);
  M.room = { code, retry: 0, alive: true };
  const url = new URL(location.href); url.searchParams.set('phong', code); url.hash = 'choi'; history.replaceState(null, '', url);
  $('#room-code').textContent = code;
  $('#invite-link').value = `${location.origin}${location.pathname}?phong=${code}`;
  mode = 'multi';
  show('room');
  connect();
}
function leaveRoom(back) {
  const r = M.room; M.room = null;
  clearInterval(M.timer); clearInterval(M.ping);
  try { r?.socket?.close(1000, 'leave'); } catch { /* đã đóng */ }
  if (back) {
    const url = new URL(location.href); url.searchParams.delete('phong'); history.replaceState(null, '', url);
    show('lobby'); setStatus('');
  }
}
function send(msg) { const ws = M.room?.socket; if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); }
function connect() {
  const room = M.room;
  if (!room?.alive) return;
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/game/ws?room=${room.code}`);
  room.socket = ws;
  setStatus('Đang vào phòng…');
  ws.onopen = () => { room.retry = 0; ws.send(JSON.stringify({ t: 'hello', token: roomToken(room.code), name: playerName() })); clearInterval(M.ping); M.ping = setInterval(() => send({ t: 'ping' }), 2000); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMessage(m); };
  ws.onclose = ev => {
    if (room !== M.room || !room.alive) return;
    if (ev.code === 4404 || ev.code === 4410) { setStatus('Phòng không tồn tại hoặc đã hết hạn.'); room.alive = false; return; }
    room.retry++; setStatus('Mất kết nối. Đang nối lại…');
    setTimeout(connect, Math.min(10000, 800 * 2 ** Math.min(room.retry, 4)));
  };
}
function onMessage(m) {
  if (m.t === 'joined') { store.set('seat:' + M.room.code, JSON.stringify({ token: m.token, at: Date.now() })); return; }
  if (m.t === 'error') { setStatus(m.message); return; }
  if (m.t === 'state') renderRoom(m);
}
function renderPlayers(listEl, m, withStats) {
  listEl.textContent = '';
  m.players.forEach((p, i) => {
    const li = document.createElement('li');
    if (i === m.you) li.classList.add('is-me');
    if (!p.online) li.classList.add('is-off');
    const name = document.createElement('span'); name.className = 'quiz-pname'; name.textContent = p.name + (i === 0 ? ' (chủ phòng)' : '');
    li.append(name);
    if (withStats) {
      const st = document.createElement('span'); st.className = 'quiz-pstat';
      st.textContent = p.streak >= 2 ? `Chuỗi ${p.streak}` : '';
      const sc = document.createElement('b'); sc.textContent = p.score;
      li.append(st, sc);
      if (m.status === 'asking') li.classList.toggle('is-done', p.answered);
      if (m.status === 'reveal') { const res = m.reveal.results.find(x => x.seat === i); if (res) li.classList.add(res.ok ? 'is-ok' : 'is-bad'); }
    }
    listEl.append(li);
  });
}
function renderRoom(m) {
  const prev = M.state; M.state = m;
  M.offset = Date.now() - m.serverTime;
  $('#room-info').textContent = m.status === 'waiting' ? `${m.players.length} người` : `Câu ${m.round}`;
  if (m.status === 'waiting') {
    clearInterval(M.timer);
    renderPlayers($('#players'), m, m.round > 0);
    $('#start-room').hidden = m.you !== 0;
    $('#start-room').textContent = m.round > 0 ? 'Trận mới' : 'Bắt đầu';
    setStatus(m.you === 0 ? 'Chờ bạn bè vào phòng rồi bấm Bắt đầu.' : m.you === null ? 'Phòng đã đầy, bạn đang xem.' : 'Chờ chủ phòng bắt đầu…');
    if (prev && prev.status !== 'waiting') setStatus('Chủ phòng đã kết thúc trận.');
    show('room');
    return;
  }
  // đang chơi
  $('#lives-wrap').hidden = true; $('#timer-wrap').hidden = false; $('#board-wrap').hidden = false;
  $('#next').hidden = true; $('#fb-auto').hidden = false;
  $('#stop-room').hidden = m.you !== 0;
  show('play');
  const newQ = !prev || prev.round !== m.round || prev.q?.id !== m.q.id;
  const me = m.you !== null ? m.players[m.you] : null;
  $('#score').textContent = me?.score ?? 0; $('#streak').textContent = me?.streak ?? 0;
  if (newQ) renderQuestion(m.q, { num: m.round });
  const swapNote = $('#swap-note');
  swapNote.hidden = !m.swapped; if (m.swapped) swapNote.textContent = `${m.swapped} đã đổi câu hỏi cho cả phòng.`;
  const mine = m.mine;
  applyRemoved(mine?.removed || []);
  if (mine?.audience) showAudience(mine.audience); else if (newQ) $('#audience').hidden = true;
  if (mine?.friend) showFriend(mine.friend); else if (newQ) $('#friend-text').hidden = true;
  if (mine?.hint) showHint(mine.hint); else if (newQ) $('#hint-text').hidden = true;
  renderPlayers($('#board'), m, true);
  const answered = mine?.pick !== null && mine?.pick !== undefined;
  if (m.status === 'asking') {
    $('#feedback').hidden = true;
    if (answered) { const o = $('#options').children[mine.pick]; if (o) o.classList.add('is-picked'); for (const o2 of $('#options').children) o2.disabled = true; }
    setLifelines(m.life, answered || m.you === null);
    if (mine?.hint) $('#hint').disabled = true;
    setStatus(answered ? 'Đã trả lời. Chờ mọi người…' : m.you === null ? 'Bạn đang xem.' : 'Chọn đáp án, hết giờ là tính sai.');
  } else {
    revealOptions(m.reveal.a, mine?.pick ?? null);
    setLifelines(m.life, true);
    const res = m.reveal.results.find(x => x.seat === m.you);
    showFeedback({ ok: !!res?.ok, gain: res?.gain || 0, explain: m.reveal.e, silent: res && res.pick === null });
    setStatus('');
  }
  clearInterval(M.timer);
  const end = Date.now() + m.msLeft;
  const tickTimer = () => {
    const left = Math.max(0, end - Date.now());
    $('#timer').textContent = Math.ceil(left / 1000);
    $('#bar').style.width = (m.limit ? (left / m.limit) * 100 : 0) + '%';
  };
  tickTimer(); M.timer = setInterval(tickTimer, 250);
}

// ---------- Điều khiển ----------
function onPick(i) { if (mode === 'solo') soloPick(i); else if (M.state?.status === 'asking') send({ t: 'answer', n: M.state.round, i }); }
function onLife(k) { if (mode === 'solo') soloLife(k); else if (M.state?.status === 'asking') send({ t: 'life', n: M.state.round, k }); }

function setTab(name) {
  $('#tab-solo').setAttribute('aria-selected', String(name === 'solo'));
  $('#tab-multi').setAttribute('aria-selected', String(name === 'multi'));
  if (name === 'solo') { leaveRoom(false); mode = 'solo'; show('start'); } else { mode = 'multi'; show(M.room ? 'room' : 'lobby'); }
}
$('#tab-solo').addEventListener('click', () => setTab('solo'));
$('#tab-multi').addEventListener('click', () => setTab('multi'));
$('#start').addEventListener('click', soloBegin);
$('#again').addEventListener('click', soloBegin);
$('#change').addEventListener('click', () => show('start'));
$('#next').addEventListener('click', () => { if (S.lives > 0) soloNext(); else soloFinish(); });
for (const b of $$('[data-life]')) b.addEventListener('click', () => onLife(b.dataset.life));
$('#hint').addEventListener('click', () => onLife('hint'));
$('#create-room').addEventListener('click', () => guard(async () => { setStatus('Đang tạo phòng…'); const d = await api('/rooms', { name: playerName() }); store.set('seat:' + d.room, JSON.stringify({ token: d.token, at: Date.now() })); enterRoom(d.room); }));
$('#join-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#join-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { setStatus('Mã phòng gồm 6 chữ cái hoặc số.'); return; }
  guard(async () => { await api('/rooms/' + code); enterRoom(code); });
});
$('#copy-link').addEventListener('click', async () => {
  const input = $('#invite-link');
  try { await navigator.clipboard.writeText(input.value); setStatus('Đã sao chép link mời. Gửi cho bạn qua Zalo hay Messenger nhé.'); } catch { input.select(); setStatus('Hãy chọn và sao chép link trong ô.'); }
});
$('#start-room').addEventListener('click', () => send({ t: 'start' }));
$('#stop-room').addEventListener('click', () => send({ t: 'stop' }));
$('#leave-room').addEventListener('click', () => { leaveRoom(true); });
document.addEventListener('keydown', e => {
  if (panels.play.hidden || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
  const k = e.key.toLowerCase(), idx = '1234'.includes(k) && k ? Number(k) - 1 : 'abcd'.indexOf(k);
  if (k.length === 1 && idx >= 0 && idx < 4) $('#options').children[idx]?.click();
  else if (k === 'h') $('#hint').click();
});
// Link mời ?phong=MÃ: vào thẳng phòng.
const invited = new URL(location.href).searchParams.get('phong');
if (invited && /^[A-Z0-9]{6}$/i.test(invited)) { setTab('multi'); guard(async () => { await api('/rooms/' + invited.toUpperCase()); enterRoom(invited.toUpperCase()); }); }
