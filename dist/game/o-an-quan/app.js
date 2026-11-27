// Ô Ăn Quan Pixel: bàn gỗ vẽ bằng canvas, rải quân có hoạt cảnh, chơi với máy, hai người hoặc online.
import * as R from './rules.mjs?v=1';
import { $, sfx, soundButton, off, hash, px, digits, disc, brackets, pointer, banner, hideBanner, say, tabs, choice, renderPlayers, Online, LEVEL_NAMES, store } from '../kit.js?v=2';

const canvas = $('#board'), g = canvas.getContext('2d', { alpha: false });
const W = 352, H = 140, CW = 48, CH = 52, GX = 56, TOP = 16, BOT = 72;
const S = { mode: 'ai', state: null, me: 0, level: 'vua', disp: null, hand: null, busy: false, selected: -1, hint: null, view: null, online: null, flash: null };

// ---------- Hình học ----------
function rawRect(i) {
  if (i === 0) return { x: 6, y: TOP, w: 48, h: 2 * CH + 4, quan: true };
  if (i === 6) return { x: GX + 5 * CW + 2, y: TOP, w: 48, h: 2 * CH + 4, quan: true };
  if (i <= 5) return { x: GX + (i - 1) * CW, y: BOT, w: CW, h: CH };
  return { x: GX + (11 - i) * CW, y: TOP, w: CW, h: CH };
}
const flipped = () => S.me === 1 && S.mode !== 'local';
function rect(i) { const r = rawRect(i); return flipped() ? { ...r, x: W - r.x - r.w, y: H - r.y - r.h } : r; }
const bottomSeat = () => (flipped() ? 1 : 0);
const dirRight = seat => (seat === bottomSeat() ? 1 : -1);

// ---------- Vẽ ----------
let layer = null;
function buildLayer() {
  const c = off(W, H), b = c.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const grain = Math.sin(y * 0.7 + Math.sin(x * 0.05) * 2);
    px(b, x, y, grain > 0.85 ? '#7a4a22' : hash(x, y) < 0.1 ? '#94602f' : '#8a5a2b');
  }
  b.fillStyle = '#5a3818'; b.fillRect(2, 10, W - 4, 2); b.fillRect(2, H - 12, W - 4, 2);
  return c;
}
function drawCell(r, quan, active) {
  if (quan) {
    const cx = r.x + (r.x < W / 2 ? r.w : 0), cy = r.y + r.h / 2;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const dx = (x + 0.5 - cx) / r.w, dy = (y + 0.5 - cy) / (r.h / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      px(g, x, y, d > 0.86 ? '#3a2410' : hash(x, y) < 0.08 ? '#e2bf86' : active ? '#f3d89d' : '#ecd09a');
    }
    return;
  }
  g.fillStyle = '#3a2410'; g.fillRect(r.x + 1, r.y, r.w - 2, r.h);
  g.fillStyle = active ? '#f3d89d' : '#ecd09a'; g.fillRect(r.x + 3, r.y + 2, r.w - 6, r.h - 4);
  g.fillStyle = '#d9b373'; g.fillRect(r.x + 3, r.y + r.h - 5, r.w - 6, 3); g.fillRect(r.x + r.w - 6, r.y + 2, 3, r.h - 4);
}
const PEBBLE = [['#ffffff', '#e8e4dc', '#c9c2b4', '#9d9484'], ['#f6e3b6', '#e7cc8f', '#c9a96a', '#9a7a44'], ['#dfe7f3', '#c3cfe2', '#98a8c3', '#6d7c98']];
function drawStones(r, i, n, big, ghost) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (big) disc(g, Math.round(cx + (r.x < W / 2 ? 6 : -6)), Math.round(cy - 8), 8, ['#8a8fd6', '#5a5fb8', '#303487', '#1d1f55']);
  const shown = Math.min(n, 24);
  for (let k = 0; k < shown; k++) {
    const a = hash(i * 31 + k, 7) * Math.PI * 2, rad = (hash(k, i * 13 + 3) ** 0.7) * (r.w / 2 - 9);
    const x = Math.round(cx + Math.cos(a) * rad), y = Math.round(cy + Math.sin(a) * rad * 0.8 + (big ? 10 : 0));
    disc(g, x, y, n <= 10 ? 3 : 2, PEBBLE[(i + k) % 3], ghost ? '#8a7a66' : '#4a3a2a');
  }
  if (n > 0 || big) {
    const label = n + (big ? 10 : 0);
    g.fillStyle = 'rgba(29,31,85,.85)';
    const w = String(label).length * 4 + 3;
    g.fillRect(r.x + 4, r.y + r.h - 12, w, 8);
    digits(g, label, r.x + 6, r.y + r.h - 10, big ? '#ffdc38' : '#fbf2e3');
  }
}
function arrow(x, y, dir, color) {
  for (let k = 0; k < 6; k++) { g.fillStyle = color; g.fillRect(dir > 0 ? x + k : x - k, y - (5 - k), 1, (5 - k) * 2 + 1); }
}
function render() {
  if (!S.disp) return;
  g.imageSmoothingEnabled = false;
  layer ||= buildLayer();
  g.drawImage(layer, 0, 0);
  const st = S.disp, turn = S.view?.turn ?? -1;
  for (let i = 0; i < 12; i++) {
    const r = rect(i), quan = i === 0 || i === 6;
    const mineTurn = !quan && turn >= 0 && R.sideOf(turn).includes(i);
    drawCell(r, quan, mineTurn);
    drawStones(r, i, st.small[i], st.big[i] > 0);
  }
  if (S.flash) { const r = rect(S.flash.i); brackets(g, r.x + 1, r.y, r.w - 2, r.h, S.flash.color, 6); }
  if (S.hint) { const r = rect(S.hint.pit); brackets(g, r.x + 2, r.y + 1, r.w - 4, r.h - 2, '#303487', 6); const right = S.hint.dir === dirRight(S.view.turn); arrow(right ? r.x + r.w - 10 : r.x + 9, r.y + r.h / 2, right ? 1 : -1, '#303487'); }
  if (S.selected >= 0) {
    const r = rect(S.selected), blink = Math.floor(performance.now() / 300) % 2;
    brackets(g, r.x + 2, r.y + 1, r.w - 4, r.h - 2, blink ? '#ffdc38' : '#1d1f55', 6);
    arrow(r.x + 9, r.y + r.h / 2, -1, '#c8323c'); arrow(r.x + r.w - 10, r.y + r.h / 2, 1, '#c8323c');
  }
  if (S.hand) {
    const r = rect(S.hand.at), x = r.x + r.w / 2, y = r.y - 2;
    g.fillStyle = '#ffdc38'; g.fillRect(x - 9, y - 9, 18, 10); g.fillStyle = '#1d1f55'; g.fillRect(x - 9, y + 1, 18, 1);
    digits(g, S.hand.n, x - 6, y - 7, '#1d1f55');
  }
  if (S.selected >= 0 || S.hint) requestAnimationFrame(render);
}

// ---------- Hiển thị người chơi ----------
function names() {
  if (S.mode === 'online') return (S.online.room?.state?.seats || []).map(x => x?.name || 'Đang chờ…');
  if (S.mode === 'local') return ['Hàng dưới', 'Hàng trên'];
  return [S.me === 0 ? store.get('name') || 'Người chơi' : `Máy · ${LEVEL_NAMES[S.level]}`, S.me === 1 ? store.get('name') || 'Người chơi' : `Máy · ${LEVEL_NAMES[S.level]}`];
}
function update() {
  const v = S.view, st = S.disp;
  if (!v || !st) return;
  const n = names(), online = S.online.room?.state;
  renderPlayers([0, 1].map(seat => ({
    name: n[seat] || '', color: seat === 0 ? '#c8323c' : '#303487',
    tag: S.mode === 'local' ? '' : seat === myTurnSeat(true) ? 'Bạn' : S.mode === 'ai' ? 'Máy' : online?.seats?.[seat]?.bot ? 'Máy' : online && !online.seats?.[seat]?.online ? 'Mất kết nối' : '',
    score: online ? online.totals[seat] : '',
    extra: `${R.points(st, seat)} điểm · ${st.captured[seat].big} quan`, turn: v.turn === seat, offline: !!online && !online.seats?.[seat]?.online
  })), online?.deadline || 0);
  $('#dir-left').disabled = $('#dir-right').disabled = S.selected < 0;
  $('#hint').disabled = S.mode === 'online' || !canAct();
  if (v.result) return;
  if (S.busy) return;
  if (S.mode === 'online' && online?.status === 'waiting') { say('Đang chờ người chơi vào phòng. Gửi link mời hoặc bấm Bắt đầu để chơi với máy.'); return; }
  if (canAct()) say(S.selected >= 0 ? 'Chọn chiều rải: mũi tên trên ô hoặc nút bên dưới.' : 'Tới lượt bạn. Chạm một ô dân còn quân ở hàng của bạn.');
  else if (S.mode === 'local') say(v.turn === 0 ? 'Lượt hàng dưới.' : 'Lượt hàng trên.');
  else say(S.mode === 'ai' ? 'Máy đang nghĩ…' : online?.you === null ? 'Bạn đang xem ván đấu.' : 'Đối thủ đang nghĩ…');
}
// Ghế của "mình": chế độ máy là S.me, online là ghế được cấp, hai người là người đang tới lượt.
function myTurnSeat(forTag) {
  if (S.mode === 'online') return S.online.room?.state?.you ?? null;
  if (S.mode === 'local') return forTag ? null : S.view?.turn;
  return S.me;
}
function canAct() {
  const v = S.view;
  if (!v || v.result || S.busy) return false;
  if (S.mode === 'online') { const st = S.online.room?.state; return st?.status === 'playing' && st.you === v.turn && S.online.room.socket?.readyState === 1; }
  return v.turn === myTurnSeat();
}

// ---------- Diễn hoạt rải quân ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function animate(prev, last, next) {
  S.busy = true; S.selected = -1; S.hint = null;
  const d = { small: prev.small.slice(), big: prev.big.slice(), captured: prev.captured.map(x => ({ ...x })), debt: prev.debt };
  S.disp = d;
  const fast = last.steps.length > 60 ? 45 : 95;
  for (const st of last.steps) {
    if (st.k === 'pick') { d.small[st.i] = 0; S.hand = { at: st.i, n: st.n }; sfx('pick'); await sleep(fast + 60); }
    else if (st.k === 'drop') { d.small[st.i]++; S.hand.at = st.i; S.hand.n--; sfx('drop'); }
    else if (st.k === 'take') { d.small[st.i] = 0; d.big[st.i] = 0; d.captured[last.seat].small += st.small; d.captured[last.seat].big += st.big; S.flash = { i: st.i, color: '#c8323c' }; sfx(st.big ? 'bomb' : 'capture'); render(); await sleep(320); S.flash = null; }
    else if (st.k === 'stop') { S.flash = { i: st.i, color: '#303487' }; render(); await sleep(260); S.flash = null; }
    render(); update();
    await sleep(fast);
  }
  S.hand = null; S.disp = { small: next.small, big: next.big, captured: next.captured, debt: next.debt };
  S.busy = false;
  if (next.last?.refill) { sfx('pass'); say(next.last.refill.borrowed ? 'Hết dân: rải lại 5 quân (có vay của đối thủ).' : 'Hết dân: lấy 5 quân đã ăn rải lại.'); await sleep(700); }
  render(); update();
  if (next.result) finish(next.result);
  if (S.pending) { const p = S.pending; S.pending = null; showOnline(p); }
}
function finish(result) {
  const p = result.points, me = myTurnSeat(true);
  const title = result.reason === 'Hòa' ? 'Hòa' : S.mode === 'local' ? (result.ranking[0] === 0 ? 'Hàng dưới thắng' : 'Hàng trên thắng') : me === null ? (result.ranking[0] === 0 ? 'Bên đỏ thắng' : 'Bên xanh thắng') : result.ranking[0] === me ? 'Bạn thắng!' : 'Bạn thua rồi';
  sfx(title === 'Bạn thua rồi' ? 'lose' : 'win');
  banner(title, `${p[0]} – ${p[1]} điểm`);
  say(`${title} · ${p[0]} – ${p[1]} điểm`);
}

// ---------- Ván cục bộ ----------
function newLocal() {
  S.level = choice('level') || 'vua';
  S.me = S.mode === 'ai' ? 0 : 0;
  S.state = R.setup(2);
  S.state.turn = S.mode === 'ai' && choice('first') === '1' ? 1 : 0;
  S.view = S.state; S.disp = S.state; S.selected = -1; S.hint = null; hideBanner();
  layer = null; render(); update();
  botSoon();
}
async function playLocal(action) {
  const prev = S.state;
  let res;
  try { res = R.apply(prev, prev.turn, action); } catch (e) { say(e.message); sfx('bad'); return; }
  S.state = res.state; S.view = res.state;
  await animate(prev, res.state.last, res.state);
  botSoon();
}
function botSoon() {
  if (S.mode !== 'ai' || S.state.result || S.state.turn === S.me) return;
  update();
  setTimeout(() => { if (S.mode !== 'ai' || S.state.turn === S.me || S.state.result) return; playLocal(R.bot(S.state, S.state.turn, Math.random, S.level)); }, 650);
}

// ---------- Thao tác ----------
function choose(dir) {
  if (S.selected < 0 || !canAct()) return;
  const action = { pit: S.selected, dir };
  S.selected = -1;
  if (S.mode === 'online') { S.online.act(action); S.pending = true; return; }
  playLocal(action);
}
function hitTest(x, y) { for (let i = 0; i < 12; i++) { const r = rect(i); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i; } return -1; }
canvas.addEventListener('pointerdown', e => {
  const [x, y] = pointer(canvas, W, H, e), i = hitTest(x, y);
  if (i < 0 || !canAct()) { if (i >= 0 && !S.busy) say(S.view?.result ? 'Ván đã kết thúc. Bấm Ván mới để chơi tiếp.' : 'Chưa tới lượt bạn.'); return; }
  const seat = S.view.turn;
  if (S.selected === i) {
    const r = rect(i);
    if (x < r.x + r.w * 0.38) return choose(-dirRight(seat));
    if (x > r.x + r.w * 0.62) return choose(dirRight(seat));
    S.selected = -1; update(); render(); return;
  }
  if (R.sideOf(seat).includes(i) && S.disp.small[i] > 0) { S.selected = i; S.hint = null; sfx('pick'); update(); render(); }
  else { sfx('bad'); say('Hãy chọn một ô dân còn quân ở hàng của bạn.'); }
});
canvas.addEventListener('keydown', e => {
  if (!canAct()) return;
  const side = R.sideOf(S.view.turn).filter(i => S.disp.small[i] > 0);
  if (!side.length) return;
  const order = side.slice().sort((a, b) => rect(a).x - rect(b).x);
  if (e.key === 'Tab') return;
  e.preventDefault();
  if (e.key === 'ArrowRight' && S.selected < 0) S.selected = order[0];
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const k = order.indexOf(S.selected); S.selected = order[(k + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length]; }
  else if (e.key === 'Escape') S.selected = -1;
  update(); render();
});
$('#dir-left').addEventListener('click', () => choose(-dirRight(S.view.turn)));
$('#dir-right').addEventListener('click', () => choose(dirRight(S.view.turn)));
$('#hint').addEventListener('click', () => {
  if (!canAct()) return;
  S.hint = R.bot(S.state, S.state.turn, Math.random, 'kho'); S.selected = -1;
  say('Gợi ý: ô có khung xanh, rải theo mũi tên xanh.'); render();
  setTimeout(() => { S.hint = null; render(); }, 3500);
});
$('#new-ai').addEventListener('click', newLocal);
$('#new-local').addEventListener('click', newLocal);
for (const r of document.querySelectorAll('input[name="level"]')) r.addEventListener('change', () => { S.level = r.value; update(); });
soundButton($('#sound'));

// ---------- Online ----------
S.online = new Online('o-an-quan', {
  onEnter() { S.mode = 'online'; S.view = null; S.disp = null; S.shown = null; S.pending = null; hideBanner(); },
  onLeave() { mode.set('online'); },
  onError() { const st = S.online.room?.state; if (st?.view) { S.view = st.view; S.disp = st.view; render(); update(); } },
  onState(st) {
    if (S.busy) { S.pending = st; return; } // đang diễn nước trước: chờ diễn xong rồi xử lý bản mới nhất
    showOnline(st);
  }
});
// Bản trạng thái online: hơn đúng một nước so với bàn đang hiện thì diễn hoạt, còn lại vẽ thẳng.
function showOnline(st) {
  S.me = st.you ?? 0;
  const v = st.view, prev = S.shown;
  if (!v) { S.shown = null; S.view = { turn: -1, captured: [{ small: 0, big: 0 }, { small: 0, big: 0 }] }; S.disp = R.setup(2); layer = null; render(); update(); return; }
  S.view = v; S.state = v;
  const sameRound = S.shownRound === st.round;
  S.shown = v; S.shownRound = st.round;
  if (prev && sameRound && v.moves === prev.moves + 1 && v.last?.steps) { animate(prev, v.last, v); return; }
  S.disp = v; layer = null; render(); update();
  if (v.result && (!prev?.result || !sameRound)) finish(v.result);
}
const mode = tabs(['ai', 'local', 'online'], m => {
  if (S.online.room && m !== 'online') S.online.leave(false);
  S.mode = m;
  if (m === 'online') { $('#lobby').hidden = !!S.online.room; $('#room').hidden = !S.online.room; if (!S.online.room) { S.state = R.setup(2); S.view = { ...S.state, turn: -1 }; S.disp = S.state; render(); update(); say('Tìm đối thủ nhanh, tạo phòng mời bạn hoặc nhập mã phòng.'); } return; }
  newLocal();
});
if (S.online.fromLink()) mode.set('online'); else newLocal();
document.fonts?.ready?.then(render);
