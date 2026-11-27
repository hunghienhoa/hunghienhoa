// Ba Cây Pixel: bàn nỉ, 3 lá úp cho mỗi người, nặn từng lá hoặc lật hết. Chỉ tính điểm cho vui.
import * as R from './rules.mjs?v=1';
import { $, sfx, soundButton, banner, hideBanner, say, tabs, choice, renderPlayers, Online, store, confirmTwice } from '../kit.js?v=2';

const S = { mode: 'ai', state: null, view: null, totals: [0, 0, 0, 0], online: null, seenMoves: -1, seenRound: -1, timer: 0 };

function cardEl(id, tag = 'span', extra = '') {
  const el = document.createElement(tag);
  el.className = 'pcard' + (R.suit(id) >= 2 ? ' red' : '') + extra;
  const rank = document.createElement('b'); rank.textContent = R.RANKS[R.rank(id)];
  const suit = document.createElement('span'); suit.className = 'suit'; suit.textContent = R.SUITS[R.suit(id)];
  el.append(rank, suit);
  el.setAttribute('aria-label', R.cardName(id));
  return el;
}
function names() {
  const v = S.view;
  if (S.mode === 'online') return (S.online.room?.state?.seats || []).map(x => x?.name || 'Đang chờ…');
  return Array.from({ length: v?.n || 4 }, (_, i) => (i === 0 ? store.get('name') || 'Người chơi' : `Máy ${i}`));
}
function mySeat() { return S.mode === 'online' ? S.online.room?.state?.you ?? null : 0; }
function canAct() {
  const v = S.view;
  if (!v || v.result || v.turn < 0) return false;
  if (S.mode === 'online') { const st = S.online.room?.state; return st?.status === 'playing' && st.you === v.turn && S.online.room.socket?.readyState === 1; }
  return v.turn === 0;
}

function render() {
  const v = S.view;
  if (!v) return;
  const n = names(), me = mySeat(), act = canAct(), online = S.online.room?.state;
  const winSeat = v.result?.ranking?.[0] ?? -1;

  const boxes = Array.from({ length: v.n }, (_, seat) => {
    const box = document.createElement('div');
    box.className = 'seat-box' + (v.turn === seat ? ' turn' : '') + (seat === me ? ' me' : '') + (winSeat === seat ? ' win' : '');
    const title = document.createElement('div'); title.className = 'seat-name'; title.textContent = n[seat] || `Ghế ${seat + 1}`;
    const row = document.createElement('div'); row.className = 'seat-cards';
    const cards = v.cards?.[seat] || [null, null, null];
    for (let k = 0; k < 3; k++) {
      const id = cards[k];
      if (id !== null && id !== undefined) {
        const just = v.last?.seat === seat && (v.last.i === k || v.last.i === null);
        row.append(cardEl(id, 'span', just ? ' flip-in' : ''));
      } else if (act && seat === me) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pcard back';
        b.setAttribute('aria-label', `Nặn lá bài thứ ${k + 1}`);
        const r = document.createElement('b'); r.textContent = '?';
        const s = document.createElement('span'); s.className = 'suit'; s.textContent = '?';
        b.append(r, s);
        b.addEventListener('click', () => doAct({ type: 'flip', i: k }));
        row.append(b);
      } else {
        const sp = document.createElement('span');
        sp.className = 'pcard back'; sp.setAttribute('aria-hidden', 'true');
        const r = document.createElement('b'); r.textContent = '?';
        const s = document.createElement('span'); s.className = 'suit'; s.textContent = '?';
        sp.append(r, s);
        row.append(sp);
      }
    }
    const sc = document.createElement('div'); sc.className = 'seat-score';
    if (v.result?.hands?.[seat]) sc.textContent = v.result.hands[seat].label;
    else if (cards.every(c => c !== null && c !== undefined)) sc.textContent = R.score(cards).label;
    box.append(title, row, sc);
    return box;
  });
  $('#seats').replaceChildren(...boxes);

  $('#flip-all').disabled = !act;
  $('#again').disabled = S.mode === 'online' ? !(online?.status === 'ended' && online?.you !== null) : false;

  renderPlayers(Array.from({ length: v.n }, (_, seat) => {
    const cards = v.cards?.[seat] || [null, null, null];
    const done = cards.every(c => c !== null && c !== undefined);
    const label = v.result?.hands?.[seat]?.label || (done ? R.score(cards).label : `${(v.revealed?.[seat] || []).filter(Boolean).length}/3 lá`);
    return {
      name: n[seat] || '', color: ['#c8323c', '#2f6fd0', '#f0b400', '#2e9e5b'][seat],
      tag: seat === me ? 'Bạn' : S.mode === 'ai' || online?.seats?.[seat]?.bot ? 'Máy' : online && !online.seats?.[seat]?.online ? 'Mất kết nối' : '',
      extra: label,
      score: S.mode === 'online' ? online?.totals?.[seat] ?? '' : S.totals[seat],
      turn: v.turn === seat, done, offline: !!online && !online.seats?.[seat]?.online
    };
  }), online?.deadline || 0);

  if (v.result) return;
  if (S.mode === 'online' && online?.status === 'waiting') { say('Đang chờ người chơi vào phòng. Gửi link mời hoặc bấm Bắt đầu để máy lấp chỗ trống.'); return; }
  if (act) say('Tới lượt bạn: chạm vào từng lá bài úp để nặn hoặc bấm Lật hết.');
  else say(S.mode === 'online' && online?.you === null ? 'Bạn đang xem ván đấu.' : `${n[v.turn] || 'Đối thủ'} đang nặn bài…`);
}

function finish(v) {
  const me = mySeat(), win = v.result.ranking[0], n = names(), winScore = v.result.hands[win];
  const title = me === null ? `${n[win] || ''} thắng (${winScore.label})` : win === me ? `Bạn thắng! (${winScore.label})` : `${n[win] || ''} thắng (${winScore.label})`;
  sfx(win === me ? 'win' : 'lose');
  banner(title, v.result.ranking.map(s => `${n[s]}: ${v.result.hands[s].label}`).join(' · '));
  say(v.result.ranking.map((s, i) => `${i === 0 ? 'Nhất' : `Hạng ${i + 1}`}: ${n[s]} (${v.result.hands[s].label})`).join(' · '));
}
function show(v) {
  const fresh = S.seenMoves !== v.moves;
  S.view = v;
  if (fresh && v.moves > 0) sfx('card');
  S.seenMoves = v.moves;
  render();
  if (v.result && fresh) finish(v);
}

// ---------- Chơi với máy ----------
function newLocal() {
  const n = Number(choice('players')) || 4;
  if (S.totals.length !== n || S.state?.n !== n) S.totals = Array(n).fill(0);
  S.state = R.setup(n, Math.random, S.state?.result ? S.state : null);
  S.seenMoves = -1; hideBanner();
  show(R.view(S.state, 0));
  botSoon();
}
function doLocal(action) {
  let res;
  try { res = R.apply(S.state, S.state.turn, action); } catch (e) { say(e.message); sfx('bad'); return false; }
  S.state = res.state;
  if (S.state.result) S.state.result.scores.forEach(({ seat, delta }) => { S.totals[seat] += delta; });
  show(R.view(S.state, 0));
  botSoon();
  return true;
}
function botSoon() {
  clearTimeout(S.timer);
  const s = S.state;
  if (S.mode !== 'ai' || !s || s.result || s.turn === 0) return;
  S.timer = setTimeout(() => { if (S.mode === 'ai' && S.state === s) doLocal(R.bot(s, s.turn)); }, 650);
}

// ---------- Thao tác ----------
function doAct(action) {
  if (!canAct()) return;
  if (S.mode === 'online') { S.online.act(action); return; }
  doLocal(action);
}
$('#flip-all').addEventListener('click', () => doAct({ type: 'flipAll' }));
$('#again').addEventListener('click', () => {
  if (S.mode === 'online') { S.online.send({ t: 'start' }); return; }
  if (S.state && !S.state.result && S.state.moves > 0 && !confirmTwice('again', $('#again'), 'Bấm lần nữa để chia lại')) return;
  newLocal();
});
$('#new-ai').addEventListener('click', () => {
  if (S.state && !S.state.result && S.state.moves > 0 && !confirmTwice('new', $('#new-ai'), 'Bấm lần nữa để chia lại')) return;
  newLocal();
});
for (const r of document.querySelectorAll('input[name="players"]')) r.addEventListener('change', () => { S.state = null; newLocal(); });
soundButton($('#sound'));

// ---------- Online ----------
S.online = new Online('ba-cay', {
  onEnter() { clearTimeout(S.timer); S.mode = 'online'; S.view = null; S.seenMoves = -1; hideBanner(); },
  onLeave() { mode.set('online'); },
  onState(st) {
    if (!st.view) { S.view = { n: st.capacity, cards: Array.from({ length: st.capacity }, () => [null, null, null]), revealed: Array.from({ length: st.capacity }, () => [false, false, false]), turn: -1, moves: 0 }; render(); return; }
    if (st.round !== S.seenRound) { S.seenRound = st.round; S.seenMoves = -1; hideBanner(); }
    show(st.view);
  }
});
const mode = tabs(['ai', 'online'], m => {
  if (S.online.room && m !== 'online') S.online.leave(false);
  S.mode = m;
  if (m === 'online') {
    clearTimeout(S.timer);
    $('#lobby').hidden = !!S.online.room; $('#room').hidden = !S.online.room;
    if (!S.online.room) { S.view = { n: 4, cards: Array.from({ length: 4 }, () => [null, null, null]), revealed: Array.from({ length: 4 }, () => [false, false, false]), turn: -1, moves: 0 }; render(); say('Tìm phòng nhanh, tạo phòng mời bạn hoặc nhập mã phòng.'); }
    return;
  }
  S.state = null; newLocal();
});
if (S.online.fromLink()) mode.set('online'); else newLocal();
