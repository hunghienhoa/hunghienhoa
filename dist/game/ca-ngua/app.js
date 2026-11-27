// Cờ Cá Ngựa: bàn 15×15 vẽ bằng canvas, quân ngựa, xúc xắc có hoạt cảnh; chơi với máy, chung một máy hoặc online.
import * as R from './rules.mjs?v=1';
import { $, sfx, soundButton, setup, off, ctxOf, UI_FONT, rrect, brackets, pointer, banner, hideBanner, say, tabs, choice, renderPlayers, Online, LEVEL_NAMES, store } from '../kit.js?v=4';

const W = 300, H = 300, C = 20;
const canvas = $('#board'), g = setup(canvas, W, H, { alpha: false });
const dice = $('#dice'), dg = setup(dice, 28, 28);
const HUE = [['#c8323c', '#f3b7b4', '#8e1f28'], ['#2f6fd0', '#b9d0f3', '#1b4489'], ['#f0b400', '#fbe39a', '#9c7400'], ['#2e9e5b', '#b6e3c7', '#1b6a3b']];
const S = { mode: 'ai', state: null, view: null, me: 0, level: 'vua', disp: null, anim: null, busy: false, hint: null, online: null, rolling: 0 };

// ---------- Vẽ bàn ----------
let layer = null;
function buildLayer() {
  const c = off(W, H), b = ctxOf(c);
  b.fillStyle = '#fbf2e3'; b.fillRect(0, 0, W, H);
  const cell = (r, col, fill) => {
    rrect(b, col * C + 1, r * C + 1, C - 2, C - 2, 5); b.fillStyle = fill; b.fill();
    b.lineWidth = 1; b.strokeStyle = 'rgba(29,31,85,.3)'; b.stroke();
  };
  for (let color = 0; color < 4; color++) {
    const [r0, c0, r1, c1] = R.stableArea(color), [main, light, dark] = HUE[color];
    const x = c0 * C, y = r0 * C, w = (c1 - c0 + 1) * C, h = (r1 - r0 + 1) * C;
    rrect(b, x + 2, y + 2, w - 4, h - 4, 18); b.fillStyle = main; b.fill(); b.lineWidth = 2; b.strokeStyle = dark; b.stroke();
    rrect(b, x + 14, y + 14, w - 28, h - 28, 12); b.fillStyle = '#fbf2e3'; b.fill();
    for (const [r, col] of R.stableCells(color)) { b.beginPath(); b.arc(col * C + C / 2, r * C + C / 2, 13, 0, Math.PI * 2); b.fillStyle = light; b.fill(); b.lineWidth = 1.5; b.strokeStyle = dark; b.stroke(); }
  }
  for (const [r, col] of R.PATH) cell(r, col, '#ffffff');
  b.font = `800 10px ${UI_FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle';
  for (let color = 0; color < 4; color++) {
    const [main, light, dark] = HUE[color];
    const [sr, sc] = R.PATH[R.startOf(color)]; cell(sr, sc, main);
    for (let h = 1; h <= 6; h++) { const [r, col] = R.homeCell(color, h); cell(r, col, light); b.fillStyle = dark; b.fillText(h, col * C + C / 2, r * C + C / 2 + 0.5); }
    const [gr, gc] = R.PATH[R.absolute(color, R.GATE)]; b.beginPath(); b.arc(gc * C + C / 2, gr * C + C / 2, 3, 0, Math.PI * 2); b.fillStyle = main; b.fill();
  }
  rrect(b, 7 * C + 2, 7 * C + 2, C - 4, C - 4, 6); b.fillStyle = '#ffdc38'; b.fill(); b.lineWidth = 1.5; b.strokeStyle = '#1d1f55'; b.stroke();
  b.beginPath(); b.arc(7 * C + C / 2, 7 * C + C / 2, 2.5, 0, Math.PI * 2); b.fillStyle = '#1d1f55'; b.fill();
  return c;
}
function drawHorse(color, x, y) {
  const [main, light, dark] = HUE[color];
  g.fillStyle = 'rgba(29,31,85,.25)'; g.beginPath(); g.ellipse(x, y + 7, 6.5, 2, 0, 0, Math.PI * 2); g.fill();
  const body = g.createLinearGradient(x - 6, 0, x + 6, 0); body.addColorStop(0, light); body.addColorStop(0.45, main); body.addColorStop(1, dark);
  g.fillStyle = body; g.strokeStyle = '#1d1f55'; g.lineWidth = 1; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x - 6.5, y + 6.5); g.quadraticCurveTo(x - 6, y + 4, x - 3, y - 1); g.lineTo(x + 3, y - 1); g.quadraticCurveTo(x + 6, y + 4, x + 6.5, y + 6.5); g.closePath(); g.fill(); g.stroke();
  const head = g.createRadialGradient(x - 1.5, y - 7, 0.5, x, y - 5, 5); head.addColorStop(0, light); head.addColorStop(1, main);
  g.fillStyle = head; g.beginPath(); g.arc(x, y - 4.5, 4.4, 0, Math.PI * 2); g.fill(); g.stroke();
}
const center = ([r, col]) => [col * C + C / 2, r * C + C / 2];
function horsePos(seat, h) {
  if (S.anim && S.anim.seat === seat && S.anim.h === h) return S.anim.at;
  return center(R.cellOf(S.disp.colors[seat], S.disp.horses[seat][h], h));
}
function render() {
  if (!S.disp) return;
  g.imageSmoothingEnabled = true;
  layer ||= buildLayer();
  g.drawImage(layer, 0, 0, W, H);
  const st = S.disp, now = performance.now();
  const legal = canAct() && S.view.phase === 'move' ? R.legalMoves(S.view, S.view.turn) : [];
  for (let seat = 0; seat < st.n; seat++) for (let h = 0; h < 4; h++) {
    const [x, y] = horsePos(seat, h), moving = S.anim && S.anim.seat === seat && S.anim.h === h;
    drawHorse(st.colors[seat], x, y - (moving ? 3 : 0));
  }
  if (legal.length && Math.floor(now / 280) % 2 === 0) for (const m of legal) { const [x, y] = horsePos(S.view.turn, m.h); brackets(g, x - 10, y - 10, 20, 20, '#ffdc38'); }
  if (S.hint) { const [x, y] = horsePos(S.view.turn, S.hint.h); brackets(g, x - 11, y - 11, 22, 22, '#303487'); }
  if (S.flash) { const [x, y] = S.flash; brackets(g, x - 11, y - 11, 22, 22, '#c8323c'); }
  if (legal.length || S.anim || S.hint || S.flash) requestAnimationFrame(render);
}
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
function drawDice(n, color = '#c8323c') {
  dg.clearRect(0, 0, 28, 28);
  const gr = dg.createLinearGradient(0, 0, 28, 28); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e8dcc3');
  rrect(dg, 1, 1, 26, 26, 6); dg.fillStyle = gr; dg.fill(); dg.lineWidth = 1.2; dg.strokeStyle = '#1d1f55'; dg.stroke();
  if (!n) return;
  for (const [x, y] of PIPS[n]) { dg.fillStyle = n === 1 || n === 6 ? color : '#1d1f55'; dg.beginPath(); dg.arc(7 + x * 7, 7 + y * 7, 2.3, 0, Math.PI * 2); dg.fill(); }
}

// ---------- Người chơi ----------
function names() {
  const n = S.disp?.n || 4;
  if (S.mode === 'online') return (S.online.room?.state?.seats || []).map(x => x?.name || 'Đang chờ…');
  if (S.mode === 'local') return Array.from({ length: n }, (_, i) => 'Ngựa ' + R.COLORS[S.disp.colors[i]]);
  return Array.from({ length: n }, (_, i) => (i === 0 ? store.get('name') || 'Người chơi' : `Máy ${i} · ${LEVEL_NAMES[S.level]}`));
}
function mySeat() { if (S.mode === 'online') return S.online.room?.state?.you ?? null; if (S.mode === 'local') return S.view?.turn; return 0; }
function canAct() {
  const v = S.view;
  if (!v || v.result || S.busy) return false;
  if (S.mode === 'online') { const st = S.online.room?.state; return st?.status === 'playing' && st.you === v.turn && S.online.room.socket?.readyState === 1; }
  return v.turn === mySeat() && (S.mode === 'local' || v.turn === 0);
}
function update() {
  const v = S.view, st = S.disp;
  if (!v || !st) return;
  const n = names(), online = S.online.room?.state;
  renderPlayers(Array.from({ length: st.n }, (_, seat) => ({
    name: n[seat] || '', color: HUE[st.colors[seat]][0],
    tag: S.mode === 'local' ? R.COLORS[st.colors[seat]] : seat === mySeat() ? 'Bạn' : S.mode === 'ai' || online?.seats?.[seat]?.bot ? 'Máy' : online && !online.seats?.[seat]?.online ? 'Mất kết nối' : '',
    extra: `Chuồng ${st.horses[seat].filter(p => p >= 101).length}/4`, score: online ? online.totals[seat] : '',
    turn: v.turn === seat && !v.result, offline: !!online && !online.seats?.[seat]?.online
  })), online?.deadline || 0);
  $('#roll').disabled = !(canAct() && v.phase === 'roll');
  $('#hint').disabled = S.mode === 'online' || !(canAct() && v.phase === 'move');
  if (v.result || S.busy) return;
  if (S.mode === 'online' && online?.status === 'waiting') { say('Đang chờ người chơi vào phòng. Gửi link mời hoặc bấm Bắt đầu để máy lấp chỗ trống.'); return; }
  const who = S.mode === 'local' ? 'Ngựa ' + R.COLORS[st.colors[v.turn]] : null;
  if (canAct()) say(v.phase === 'roll' ? (who ? `${who}: đổ xúc xắc.` : 'Tới lượt bạn. Bấm Đổ xúc xắc.') : (who ? `${who} được ${v.dice}: chạm con ngựa muốn đi.` : `Bạn đổ được ${v.dice}. Chạm con ngựa có khung vàng.`));
  else say(S.mode === 'online' && online?.you === null ? 'Bạn đang xem ván đấu.' : 'Đối thủ đang đi…');
}

// ---------- Diễn hoạt ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rollAnim(final, color) {
  sfx('dice');
  for (let k = 0; k < 7; k++) { drawDice(1 + Math.floor(Math.random() * 6)); await sleep(55); }
  drawDice(final, HUE[color][0]);
}
function pathCells(color, from, to, h) {
  const cells = [];
  if (from < 0) cells.push(R.cellOf(color, 0, h));
  else if (from <= R.GATE && to <= R.GATE) for (let p = from + 1; p <= to; p++) cells.push(R.cellOf(color, p, h));
  else if (from === R.GATE) for (let k = 1; k <= to - 100; k++) cells.push(R.homeCell(color, k));
  else cells.push(R.cellOf(color, to, h));
  return cells;
}
async function animate(prev, last, next) {
  S.busy = true; S.hint = null;
  S.disp = prev;
  const color = prev.colors[last.seat];
  if (last.type === 'roll') {
    await rollAnim(last.dice, color);
    if (last.stuck) { sfx('pass'); say(`Đổ được ${last.dice} nhưng không có ngựa nào đi được.`); await sleep(650); }
  } else if (last.type === 'move') {
    S.anim = { seat: last.seat, h: last.horse, at: center(R.cellOf(color, last.from, last.horse)) };
    render();
    for (const cell of pathCells(color, last.from, last.to, last.horse)) { S.anim.at = center(cell); sfx('move'); render(); await sleep(110); }
    S.anim = null;
    if (last.kick) { S.flash = center(R.cellOf(prev.colors[last.kick.seat], prev.horses[last.kick.seat][last.kick.h], last.kick.h)); sfx('capture'); render(); await sleep(380); S.flash = null; }
  }
  S.disp = next; S.busy = false;
  render(); update();
  if (next.result) finish(next.result);
  else if (S.mode !== 'online') afterLocal();
  if (S.pending) { const p = S.pending; S.pending = null; showOnline(p); }
}
function finish(result) {
  const me = mySeat(), win = result.ranking[0];
  const color = R.COLORS[S.disp.colors[win]];
  const title = S.mode === 'local' || me === null ? `Ngựa ${color} thắng` : win === me ? 'Bạn thắng!' : 'Bạn thua rồi';
  sfx(title === 'Bạn thua rồi' ? 'lose' : 'win');
  banner(title, 'Đủ 4 ngựa lên chuồng');
  say(title);
}

// ---------- Ván cục bộ ----------
function newLocal() {
  const n = Number(choice(S.mode === 'local' ? 'local-players' : 'players')) || 4;
  S.level = choice('level') || 'vua';
  S.state = R.setup(n); S.view = S.state; S.disp = S.state; S.anim = null; hideBanner(); drawDice(0);
  layer = null; render(); update();
  afterLocal();
}
async function doLocal(action) {
  const prev = S.state;
  let res;
  try { res = R.apply(prev, prev.turn, action); } catch (e) { say(e.message); sfx('bad'); return; }
  S.state = res.state; S.view = res.state;
  await animate(prev, res.state.last, res.state);
}
function afterLocal() {
  const s = S.state;
  if (!s || s.result || S.busy) return;
  if (S.mode === 'ai' && s.turn !== 0) { setTimeout(() => { if (S.mode === 'ai' && S.state === s) doLocal(R.bot(s, s.turn, Math.random, S.level)); }, s.phase === 'roll' ? 550 : 450); return; }
  autoSingle();
}
// Chỉ có một nước đi thì tự đi cho nhanh.
function autoSingle() {
  const v = S.view;
  if (!canAct() || v.phase !== 'move') return;
  const moves = R.legalMoves(v, v.turn);
  if (moves.length === 1) setTimeout(() => { if (S.view === v && canAct()) act({ type: 'move', horse: moves[0].h }); }, 650);
}
function act(action) {
  if (!canAct()) return;
  if (S.mode === 'online') { S.online.act(action); return; }
  doLocal(action);
}
$('#roll').addEventListener('click', () => act({ type: 'roll' }));
dice.addEventListener('click', () => { if (canAct() && S.view.phase === 'roll') act({ type: 'roll' }); });
canvas.addEventListener('pointerdown', e => {
  if (!canAct()) return;
  const v = S.view;
  if (v.phase === 'roll') { act({ type: 'roll' }); return; }
  const [x, y] = pointer(canvas, W, H, e);
  const moves = R.legalMoves(v, v.turn);
  let best = null, bestD = 14;
  for (const m of moves) { const [hx, hy] = horsePos(v.turn, m.h), d = Math.hypot(hx - x, hy - y); if (d < bestD) { bestD = d; best = m; } }
  if (best) act({ type: 'move', horse: best.h }); else { sfx('bad'); say('Hãy chạm con ngựa có khung vàng.'); }
});
canvas.addEventListener('keydown', e => {
  if (!canAct()) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (S.view.phase === 'roll') act({ type: 'roll' }); else { const m = R.legalMoves(S.view, S.view.turn)[0]; if (m) act({ type: 'move', horse: m.h }); } }
  if (/^[1-4]$/.test(e.key) && S.view.phase === 'move') { const m = R.legalMoves(S.view, S.view.turn).find(x => x.h === +e.key - 1); if (m) act({ type: 'move', horse: m.h }); }
});
$('#hint').addEventListener('click', () => { if (!canAct()) return; const a = R.bot(S.view, S.view.turn, Math.random, 'vua'); if (a?.type === 'move') { S.hint = { h: a.horse }; say('Gợi ý: con ngựa có khung xanh.'); render(); setTimeout(() => { S.hint = null; render(); }, 3000); } });
$('#new-ai').addEventListener('click', newLocal);
$('#new-local').addEventListener('click', newLocal);
for (const r of document.querySelectorAll('input[name="level"]')) r.addEventListener('change', () => { S.level = r.value; update(); });
soundButton($('#sound'));

// ---------- Online ----------
S.online = new Online('ca-ngua', {
  onEnter() { S.mode = 'online'; S.view = null; S.shown = null; S.pending = null; hideBanner(); },
  onLeave() { mode.set('online'); },
  onError() { const st = S.online.room?.state; if (st?.view) { S.view = st.view; S.disp = st.view; render(); update(); } },
  onState(st) {
    if (S.busy) { S.pending = st; return; }
    showOnline(st);
  }
});
function showOnline(st) {
  S.me = st.you ?? 0;
  const v = st.view, prev = S.shown;
  if (!v) { S.shown = null; const n = st.capacity; S.state = R.setup(n); S.view = { ...S.state, turn: -1 }; S.disp = S.state; layer = null; render(); update(); return; }
  S.view = v; S.state = v;
  const sameRound = S.shownRound === st.round;
  S.shown = v; S.shownRound = st.round;
  if (prev && sameRound && v.moves === prev.moves + 1 && v.last) { animate(prev, v.last, v).then(autoSingle); return; }
  S.disp = v; render(); update();
  if (v.dice) drawDice(v.dice, HUE[v.colors[v.turn]]?.[0]);
  autoSingle();
  if (v.result && (!prev?.result || !sameRound)) finish(v.result);
}
const mode = tabs(['ai', 'local', 'online'], m => {
  if (S.online.room && m !== 'online') S.online.leave(false);
  S.mode = m;
  if (m === 'online') { $('#lobby').hidden = !!S.online.room; $('#room').hidden = !S.online.room; if (!S.online.room) { S.state = R.setup(4); S.view = { ...S.state, turn: -1 }; S.disp = S.state; render(); update(); say('Tìm phòng nhanh, tạo phòng mời bạn hoặc nhập mã phòng.'); } return; }
  newLocal();
});
drawDice(0);
if (S.online.fromLink()) mode.set('online'); else newLocal();
