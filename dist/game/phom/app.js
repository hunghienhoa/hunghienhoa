// Phỏm (Tá lả) Pixel: bàn nỉ, lá bài pixel, chơi với máy (2–4 người) hoặc online. Chỉ tính điểm cho vui.
import * as R from './rules.mjs?v=1';
import { $, sfx, soundButton, banner, hideBanner, say, tabs, choice, renderPlayers, Online, LEVEL_NAMES, store, confirmTwice } from '../kit.js?v=3';

const S = { mode: 'ai', state: null, view: null, level: 'vua', picked: null, bySuit: false, totals: [0, 0, 0, 0], online: null, seenMoves: -1, seenRound: -1, timer: 0 };
const PLACE = ['Về nhất', 'Về nhì', 'Về ba', 'Về bét'];

function cardEl(id, tag = 'span', extra = '') {
  const el = document.createElement(tag);
  el.className = 'pcard' + (R.suit(id) >= 2 ? ' red' : '') + extra;
  const rank = document.createElement('b'); rank.textContent = R.RANKS[R.value(id) - 1];
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
function eatList() {
  const v = S.view, me = mySeat();
  if (!v || me === null || v.result || v.phase !== 'take' || v.turn !== me || !v.lastDiscard) return [];
  if (v.lastDiscard.by !== (me - 1 + v.n) % v.n) return [];
  return R.eatOptions(v.hand || [], v.locked?.[me] || [], v.lastDiscard.card);
}

function renderMeldList(container, melds) {
  container.replaceChildren(...(melds || []).map(m => {
    const box = document.createElement('div'); box.className = 'meld';
    for (const id of m) box.append(cardEl(id));
    return box;
  }));
}

function render() {
  const v = S.view;
  if (!v) return;
  const n = names(), me = mySeat() ?? 0, online = S.online.room?.state;
  const opps = [];
  for (let k = 1; k < v.n; k++) {
    const seat = (me + k) % v.n, box = document.createElement('div');
    box.className = 'opp' + (v.turn === seat ? ' turn' : '');
    const name = document.createElement('span'); name.textContent = n[seat] || '';
    const tag = document.createElement('span'); tag.className = 'opp-tag';
    if (v.result) {
      const place = v.result.ranking.indexOf(seat), tb = v.result.table?.[seat];
      tag.textContent = `${PLACE[place]}${v.result.u === seat ? ' · Ù' : tb?.mom ? ' · Móm' : tb ? ` · ${tb.points}đ` : ''}`;
      box.append(name, tag);
      if (tb?.melds?.length) { const ms = document.createElement('div'); ms.className = 'melds'; renderMeldList(ms, tb.melds); box.append(ms); }
      if (tb?.dead?.length) { const dd = document.createElement('div'); dd.className = 'dead'; for (const id of tb.dead) dd.append(cardEl(id)); box.append(dd); }
    } else {
      const backs = document.createElement('span'); backs.className = 'backs';
      for (let i = 0; i < Math.min(v.counts[seat] || 0, 10); i++) backs.append(document.createElement('i'));
      tag.textContent = `${v.counts[seat] || 0} lá · vòng ${v.discCount?.[seat] || 0}/${R.ROUNDS}`;
      box.append(name, backs, tag);
      if (v.locked?.[seat]?.length) { const ms = document.createElement('div'); ms.className = 'melds'; renderMeldList(ms, v.locked[seat]); box.append(ms); }
    }
    if (v.discards?.[seat]?.length) {
      const dr = document.createElement('div'); dr.className = 'discard-row';
      for (const id of v.discards[seat]) dr.append(cardEl(id));
      box.append(dr);
    }
    opps.push(box);
  }
  $('#opponents').replaceChildren(...opps);

  const act = canAct(), eats = eatList();
  const pileBtn = $('#pile-btn');
  pileBtn.disabled = !(act && v.phase === 'take' && v.pile > 0);
  $('#pile-count').textContent = `Nọc: ${v.pile ?? 0} lá`;

  const lastWrap = $('#last-discard'), lastLabel = $('#last-label');
  if (v.lastDiscard) {
    if (eats.length) {
      const b = cardEl(v.lastDiscard.card, 'button', ' eat-glow');
      b.type = 'button';
      b.addEventListener('click', () => doAct({ type: 'eat' }));
      lastWrap.replaceChildren(b);
    } else {
      lastWrap.replaceChildren(cardEl(v.lastDiscard.card));
    }
    lastLabel.textContent = `${n[v.lastDiscard.by] || ''} vừa đánh`;
  } else {
    lastWrap.replaceChildren();
    lastLabel.textContent = v.result ? '' : 'Chưa có lá vừa đánh';
  }

  const lockedCards = new Set((v.locked?.[me] || []).flat());
  const myMelds = $('#my-melds');
  if (v.result && v.result.table?.[me]) {
    const tb = v.result.table[me];
    renderMeldList(myMelds, tb.melds);
    const pt = document.createElement('span'); pt.className = 'points-tag';
    pt.textContent = v.result.u === me ? 'Ù!' : tb.mom ? 'Móm' : `Rác: ${tb.points} điểm`;
    myMelds.append(pt);
  } else {
    renderMeldList(myMelds, v.locked?.[me] || []);
  }

  const hand = (v.hand || []).slice().sort((a, b) => (S.bySuit ? R.suit(a) - R.suit(b) || a - b : a - b));
  if (S.picked !== null && (!hand.includes(S.picked) || lockedCards.has(S.picked))) S.picked = null;
  $('#hand').replaceChildren(...hand.map(id => {
    const locked = lockedCards.has(id);
    const b = cardEl(id, 'button', locked ? ' locked' : '');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(S.picked === id));
    b.addEventListener('click', () => {
      if (locked) { say('Lá này nằm trong phỏm đã ăn, không đánh ra được.'); sfx('bad'); return; }
      S.picked = S.picked === id ? null : id;
      sfx('card'); render();
    });
    return b;
  }));

  const myDisc = $('#my-discards');
  myDisc.replaceChildren(...(v.discards?.[me] || []).map(id => cardEl(id)));

  $('#draw').disabled = !(act && v.phase === 'take' && v.pile > 0);
  $('#eat').disabled = !eats.length;
  $('#discard').disabled = !(act && v.phase === 'discard' && S.picked !== null && !lockedCards.has(S.picked));
  $('#hint').disabled = !act;
  $('#sort').textContent = S.bySuit ? 'Xếp theo số' : 'Xếp theo chất';

  renderPlayers(Array.from({ length: v.n }, (_, seat) => {
    const tb = v.result?.table?.[seat];
    return {
      name: n[seat] || '', color: ['#c8323c', '#2f6fd0', '#f0b400', '#2e9e5b'][seat],
      tag: seat === mySeat() ? 'Bạn' : S.mode === 'ai' || online?.seats?.[seat]?.bot ? 'Máy' : online && !online.seats?.[seat]?.online ? 'Mất kết nối' : '',
      extra: v.result ? (v.result.u === seat ? 'Ù' : tb?.mom ? 'Móm' : `${tb?.points ?? 0}đ`) : `${v.discCount?.[seat] || 0}/${R.ROUNDS} lá`,
      score: S.mode === 'online' ? online?.totals?.[seat] ?? '' : S.totals[seat],
      turn: v.turn === seat, done: !!v.result, offline: !!online && !online.seats?.[seat]?.online
    };
  }), online?.deadline || 0);

  if (v.result) return;
  if (S.mode === 'online' && online?.status === 'waiting') { say('Đang chờ người chơi vào phòng. Gửi link mời hoặc bấm Bắt đầu để máy lấp chỗ trống.'); return; }
  if (act) {
    if (v.phase === 'take') say(eats.length ? `Tới lượt bạn: có thể Ăn lá ${R.cardName(v.lastDiscard.card)} hoặc Bốc nọc.` : 'Tới lượt bạn: bấm Bốc (hoặc chạm vào nọc) để lấy một lá.');
    else say(S.picked !== null ? `Đã chọn ${R.cardName(S.picked)}: bấm Đánh.` : 'Chọn một lá bài trên tay để đánh ra.');
  } else {
    say(S.mode === 'online' && online?.you === null ? 'Bạn đang xem ván đấu.' : `${n[v.turn] || 'Đối thủ'} đang suy nghĩ…`);
  }
}

function announce(v) {
  const last = v.last;
  if (!last) return;
  const n = names();
  if (last.type === 'eat') { sfx('capture'); banner('ĂN!', `${n[last.seat] || ''} ăn ${R.cardName(last.card)}`, true); }
  else sfx('card');
}
function finish(v) {
  const me = mySeat(), place = v.result.ranking.indexOf(me), n = names();
  const uSeat = v.result.u;
  const title = uSeat !== null ? (uSeat === me ? 'Bạn Ù rồi!' : `${n[uSeat] || ''} Ù!`) : me === null ? `${n[v.result.ranking[0]] || ''} về nhất` : place === 0 ? 'Bạn về nhất!' : `Bạn ${PLACE[place].toLowerCase()}`;
  sfx(place === 0 ? 'win' : 'lose');
  const sub = v.result.ranking.map((seat, i) => {
    const tb = v.result.table?.[seat];
    return `${PLACE[i]}: ${n[seat]} (${uSeat === seat ? 'Ù' : tb?.mom ? 'Móm' : `${tb?.points ?? 0}đ`})`;
  }).join(' · ');
  banner(title, uSeat !== null ? 'Đủ phỏm, không còn lá rác' : '');
  say(sub);
}
function show(v) {
  const fresh = S.seenMoves !== v.moves;
  S.view = v;
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
  S.picked = null; S.seenMoves = -1; hideBanner();
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
function doAct(action) {
  if (!canAct()) return;
  if (S.mode === 'online') { S.online.act(action); S.picked = null; return; }
  if (doLocal(action)) S.picked = null;
}
$('#draw').addEventListener('click', () => doAct({ type: 'draw' }));
$('#pile-btn').addEventListener('click', () => doAct({ type: 'draw' }));
$('#eat').addEventListener('click', () => doAct({ type: 'eat' }));
$('#discard').addEventListener('click', () => {
  if (S.picked === null) { say('Hãy chọn một lá bài để đánh.'); sfx('bad'); return; }
  doAct({ type: 'discard', card: S.picked });
});
$('#sort').addEventListener('click', () => { S.bySuit = !S.bySuit; render(); });
$('#hint').addEventListener('click', () => {
  const v = S.view;
  if (!canAct()) return;
  const me = v.turn;
  const fake = { ...v, hands: v.counts.map((c, i) => (i === me ? v.hand : Array(c).fill(-1))), pile: Array(v.pile || 0).fill(-1) };
  const a = R.bot(fake, me, Math.random, 'vua');
  if (a.type === 'eat') say('Gợi ý: nên bấm Ăn lá vừa đánh để tạo phỏm.');
  else if (a.type === 'draw') say('Gợi ý: nên bấm Bốc một lá từ nọc.');
  else { S.picked = a.card; render(); say(`Gợi ý: đã chọn lá ${R.cardName(a.card)}, bấm Đánh.`); }
});
$('#new-ai').addEventListener('click', () => { if (S.state && !S.state.result && S.state.moves > 0 && !confirmTwice('new', $('#new-ai'), 'Bấm lần nữa để chia lại')) return; newLocal(); });
for (const r of document.querySelectorAll('input[name="level"]')) r.addEventListener('change', () => { S.level = r.value; render(); });
for (const r of document.querySelectorAll('input[name="players"]')) r.addEventListener('change', () => { S.state = null; newLocal(); });
soundButton($('#sound'));

// ---------- Online ----------
S.online = new Online('phom', {
  onEnter() { clearTimeout(S.timer); S.mode = 'online'; S.view = null; S.seenMoves = -1; hideBanner(); S.picked = null; },
  onLeave() { mode.set('online'); },
  onState(st) {
    if (!st.view) { S.view = { n: st.capacity, hand: [], counts: Array(st.capacity).fill(0), locked: [], eaten: [], discards: [], pile: 0, turn: -1, phase: 'take', lastDiscard: null, discCount: Array(st.capacity).fill(0), moves: 0 }; render(); return; }
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
    if (!S.online.room) { S.view = { n: 4, hand: [], counts: [0, 0, 0, 0], locked: [], eaten: [], discards: [], pile: 0, turn: -1, phase: 'take', lastDiscard: null, discCount: [0, 0, 0, 0], moves: 0 }; render(); say('Tìm phòng nhanh, tạo phòng mời bạn hoặc nhập mã phòng.'); }
    return;
  }
  S.state = null; newLocal();
});
if (S.online.fromLink()) mode.set('online'); else newLocal();
