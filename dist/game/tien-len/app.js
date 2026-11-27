// Tiến Lên Pixel: bàn nỉ, lá bài pixel, chơi với máy (2–4 người) hoặc online. Chỉ tính điểm cho vui.
import * as R from './rules.mjs?v=1';
import { $, sfx, soundButton, banner, hideBanner, say, tabs, choice, renderPlayers, Online, LEVEL_NAMES, store, confirmTwice } from '../kit.js?v=5';

const S = { mode: 'ai', state: null, view: null, me: 0, level: 'vua', picked: new Set(), bySuit: false, totals: [0, 0, 0, 0], online: null, seenMoves: -1, seenRound: -1, timer: 0 };
const PLACE = ['Về nhất', 'Về nhì', 'Về ba', 'Về bét'];

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
  return Array.from({ length: v?.n || 4 }, (_, i) => (i === 0 ? store.get('name') || 'Người chơi' : `Máy ${i} · ${LEVEL_NAMES[S.level]}`));
}
function mySeat() { return S.mode === 'online' ? S.online.room?.state?.you ?? null : 0; }
function canAct() {
  const v = S.view;
  if (!v || v.result || v.turn < 0) return false;
  if (S.mode === 'online') { const st = S.online.room?.state; return st?.status === 'playing' && st.you === v.turn && S.online.room.socket?.readyState === 1; }
  return v.turn === 0;
}
function selection() { return [...S.picked].filter(id => S.view?.hand?.includes(id)); }
function check() {
  const v = S.view, cards = selection();
  if (!cards.length) return { ok: false, why: '' };
  const combo = R.classify(cards);
  if (!combo) return { ok: false, why: 'Các lá đang chọn không thành bộ hợp lệ.' };
  if (v.mustInclude !== null && v.mustInclude !== undefined && !cards.includes(v.mustInclude)) return { ok: false, why: `Nước đầu phải có lá ${R.cardName(v.mustInclude)}.` };
  if (v.table && !R.beats(combo, v.table.combo)) return { ok: false, why: 'Bộ này chưa chặn được bài trên bàn.' };
  return { ok: true, combo };
}

function render() {
  const v = S.view;
  if (!v) return;
  const n = names(), me = mySeat() ?? 0, online = S.online.room?.state;
  // Đối thủ theo chiều đánh, bắt đầu từ người ngồi sau mình
  const opps = [];
  for (let k = 1; k < v.n; k++) {
    const seat = (me + k) % v.n, box = document.createElement('div');
    box.className = 'opp' + (v.turn === seat ? ' turn' : '');
    const name = document.createElement('span'); name.textContent = n[seat] || '';
    const backs = document.createElement('span'); backs.className = 'backs';
    for (let i = 0; i < Math.min(v.counts[seat], 8); i++) backs.append(document.createElement('i'));
    const tag = document.createElement('span'); tag.className = 'opp-tag';
    const place = v.finished.indexOf(seat);
    tag.textContent = place >= 0 ? PLACE[place] : v.passed[seat] ? 'Bỏ lượt' : `${v.counts[seat]} lá`;
    box.append(name, backs, tag);
    if (v.hands && v.hands[seat]?.length) { const rv = document.createElement('div'); rv.className = 'reveal'; for (const id of v.hands[seat]) rv.append(cardEl(id)); box.append(rv); }
    opps.push(box);
  }
  $('#opponents').replaceChildren(...opps);
  // Bài trên bàn
  const pile = $('#pile'), label = $('#pile-label');
  if (v.table) {
    pile.replaceChildren(...v.table.cards.map(id => cardEl(id, 'span', v.table.cards.length > 6 ? ' mini' : '')));
    label.textContent = `${n[v.table.by] || ''} · ${R.typeName(v.table.combo)}`;
  } else {
    pile.replaceChildren();
    label.textContent = v.result ? '' : v.turn >= 0 ? `Vòng mới · ${n[v.turn] || ''} đi tự do` : '';
  }
  // Bài trên tay
  const hand = (v.hand || []).slice().sort((a, b) => (S.bySuit ? R.suit(a) - R.suit(b) || a - b : a - b));
  $('#hand').replaceChildren(...hand.map(id => {
    const b = cardEl(id, 'button');
    b.type = 'button'; b.setAttribute('aria-pressed', String(S.picked.has(id)));
    b.addEventListener('click', () => { if (S.picked.has(id)) S.picked.delete(id); else S.picked.add(id); sfx('card'); render(); });
    return b;
  }));
  const c = check(), act = canAct();
  $('#play').disabled = !act || !c.ok;
  $('#pass').disabled = !act || !v.table;
  $('#clear').disabled = !S.picked.size;
  $('#hint').disabled = !act;
  $('#sort').textContent = S.bySuit ? 'Xếp theo số' : 'Xếp theo chất';
  renderPlayers(Array.from({ length: v.n }, (_, seat) => ({
    name: n[seat] || '', color: ['#c8323c', '#2f6fd0', '#f0b400', '#2e9e5b'][seat],
    tag: seat === mySeat() ? 'Bạn' : S.mode === 'ai' || online?.seats?.[seat]?.bot ? 'Máy' : online && !online.seats?.[seat]?.online ? 'Mất kết nối' : '',
    extra: v.finished.includes(seat) ? PLACE[v.finished.indexOf(seat)] : `${v.counts[seat]} lá`,
    score: S.mode === 'online' ? online?.totals?.[seat] ?? '' : S.totals[seat], turn: v.turn === seat, done: v.finished.includes(seat), offline: !!online && !online.seats?.[seat]?.online
  })), online?.deadline || 0);
  if (v.result) return;
  if (S.mode === 'online' && online?.status === 'waiting') { say('Đang chờ người chơi vào phòng. Gửi link mời hoặc bấm Bắt đầu để máy lấp chỗ trống.'); return; }
  if (act) say(c.why || (v.table ? 'Tới lượt bạn: chọn bài để chặn hoặc bỏ lượt.' : v.mustInclude !== null && v.mustInclude !== undefined ? `Bạn đi đầu, nhớ đánh kèm lá ${R.cardName(v.mustInclude)}.` : 'Bạn được đi tự do: đánh bộ bài bất kỳ.'));
  else say(S.mode === 'online' && online?.you === null ? 'Bạn đang xem ván đấu.' : `${n[v.turn] || 'Đối thủ'} đang đánh…`);
}

// Thông báo khi có nước mới
function announce(v) {
  const last = v.last;
  if (!last) return;
  const n = names();
  if (last.type === 'pass') { sfx('pass'); return; }
  if (last.chop) { sfx('bomb'); banner('CHẶT!', `${n[last.seat] || ''} · ${R.typeName(last.combo)}`, true); }
  else sfx('card');
}
function finish(v) {
  const me = mySeat(), place = v.result.ranking.indexOf(me);
  const n = names();
  const title = me === null ? `${n[v.result.ranking[0]] || ''} về nhất` : place === 0 ? 'Bạn về nhất!' : `Bạn ${PLACE[place].toLowerCase()}`;
  sfx(place === 0 ? 'win' : 'lose');
  banner(title, v.result.reason === 'Hết bài' ? '' : `Tới trắng: ${v.result.reason}`);
  say(v.result.ranking.map((seat, i) => `${PLACE[i]}: ${n[seat]}`).join(' · '));
}
function show(v) {
  const fresh = S.seenMoves !== v.moves;
  S.view = v;
  for (const id of [...S.picked]) if (!v.hand?.includes(id)) S.picked.delete(id);
  if (fresh && v.moves > 0) announce(v);
  S.seenMoves = v.moves;
  render();
  if (v.result && fresh) finish(v);
}

// ---------- Chơi với máy ----------
function newLocal() {
  const n = Number(choice('players')) || 4;
  S.level = choice('level') || 'vua';
  if (S.totals.length !== n || S.state?.n !== n) S.totals = Array(n).fill(0);
  S.state = R.setup(n, Math.random, S.state?.result ? S.state : null);
  S.picked.clear(); S.seenMoves = -1; hideBanner();
  if (S.state.result) S.state.result.scores.forEach(({ seat, delta }) => { S.totals[seat] += delta; });
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
  S.timer = setTimeout(() => { if (S.mode === 'ai' && S.state === s) doLocal(R.bot(s, s.turn, Math.random, S.level)); }, 950);
}

// ---------- Thao tác ----------
function act(action) {
  if (!canAct()) return;
  if (S.mode === 'online') { S.online.act(action); S.picked.clear(); return; }
  if (doLocal(action)) S.picked.clear();
}
$('#play').addEventListener('click', () => { const c = check(); if (c.ok) act({ type: 'play', cards: selection() }); else if (c.why) { say(c.why); sfx('bad'); } });
$('#pass').addEventListener('click', () => act({ type: 'pass' }));
$('#clear').addEventListener('click', () => { S.picked.clear(); render(); });
$('#sort').addEventListener('click', () => { S.bySuit = !S.bySuit; render(); });
$('#hint').addEventListener('click', () => {
  const v = S.view;
  if (!canAct()) return;
  const me = v.turn;
  const fake = { ...v, hands: v.counts.map((c, i) => (i === me ? v.hand : Array(c).fill(-1))) };
  const a = R.bot(fake, me, Math.random, 'vua');
  S.picked = new Set(a.type === 'play' ? a.cards : []);
  say(a.type === 'play' ? 'Gợi ý: các lá đã được chọn sẵn, bấm Đánh.' : 'Gợi ý: nên bỏ lượt ở vòng này.');
  render();
});
$('#new-ai').addEventListener('click', () => { if (S.state && !S.state.result && S.state.moves > 0 && !confirmTwice('new', $('#new-ai'), 'Bấm lần nữa để chia lại')) return; newLocal(); });
for (const r of document.querySelectorAll('input[name="level"]')) r.addEventListener('change', () => { S.level = r.value; render(); });
for (const r of document.querySelectorAll('input[name="players"]')) r.addEventListener('change', () => { S.state = null; newLocal(); });
soundButton($('#sound'));

// ---------- Online ----------
S.online = new Online('tien-len', {
  onEnter() { clearTimeout(S.timer); S.mode = 'online'; S.view = null; S.seenMoves = -1; hideBanner(); S.picked.clear(); },
  onLeave() { mode.set('online'); },
  onState(st) {
    if (!st.view) { S.view = { n: st.capacity, hand: [], counts: Array(st.capacity).fill(0), table: null, passed: [], turn: -1, finished: [], mustInclude: null, moves: 0 }; render(); return; }
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
    if (!S.online.room) { S.view = { n: 4, hand: [], counts: [0, 0, 0, 0], table: null, passed: [], turn: -1, finished: [], mustInclude: null, moves: 0 }; render(); say('Tìm phòng nhanh, tạo phòng mời bạn hoặc nhập mã phòng.'); }
    return;
  }
  S.state = null; newLocal();
});
if (S.online.fromLink()) mode.set('online'); else newLocal();
