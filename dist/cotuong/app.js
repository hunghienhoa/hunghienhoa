// Cờ Tướng: vẽ bàn cờ vector mượt trên canvas, ba chế độ (máy, hai người, online), âm thanh chiptune.
import { Game, RED, BLACK, other, colorOf, kind, row, col, sq, HAN, LETTERS, REASONS, START_FEN } from './core.mjs?v=1';

const $ = s => document.querySelector(s);
const K = 3; // canvas vẽ ở độ phân giải gấp K lần để nét mượt
const canvas = $('#board'), ctx = canvas.getContext('2d', { alpha: false });
const W = 288, H = 320, X0 = 24, Y0 = 25, CELL = 30;
const C = { ink: '#1d1f55', blue: '#303487', yellow: '#ffdc38', cream: '#fbf2e3', red: '#c8323c', redDark: '#8e1f28', line: '#4a2c12', frame: '#5a3818', wood: ['#e6c58a', '#dfbb7d', '#ecd09a', '#d9b373'] };
const store = {
  get(k) { try { return localStorage.getItem('cotuong:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('cotuong:' + k, v); } catch { /* chỉ là tiện ích */ } },
  del(k) { try { localStorage.removeItem('cotuong:' + k); } catch { /* bỏ qua */ } }
};

const S = {
  mode: 'ai', game: new Game(), flip: false, selected: -1, targets: [], cursor: -1, hover: -1, hint: null,
  level: 'vua', human: RED, thinking: false, aiId: 0, sound: store.get('sound') !== 'off', han: store.get('glyph') !== 'viet',
  anim: null, particles: [], shake: 0, banner: null, room: null, armed: null
};

// ---------- Âm thanh chiptune (WebAudio, tạo bằng mã, không tải tệp) ----------
let audio = null;
function tone(freq, start, dur, type = 'square', vol = 0.06) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, audio.currentTime + start);
  g.gain.setValueAtTime(vol, audio.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + dur);
  o.connect(g).connect(audio.destination); o.start(audio.currentTime + start); o.stop(audio.currentTime + start + dur + 0.02);
}
function sfx(name) {
  if (!S.sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { return; }
  const seq = {
    pick: [[660, 0, 0.05]], move: [[392, 0, 0.05], [523, 0.05, 0.07]], capture: [[220, 0, 0.06, 'sawtooth', 0.07], [165, 0.06, 0.12, 'square', 0.06]],
    check: [[880, 0, 0.08], [660, 0.09, 0.08], [880, 0.18, 0.12]], bad: [[110, 0, 0.12, 'sawtooth', 0.05]],
    win: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.25]], lose: [[392, 0, 0.14], [330, 0.15, 0.14], [262, 0.3, 0.3]], ping: [[988, 0, 0.06, 'triangle', 0.08]]
  }[name] || [];
  for (const [f, s, d, t, v] of seq) tone(f, s, d, t, v);
}

// ---------- Vẽ ----------
canvas.width = W * K; canvas.height = H * K;
const off = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const HAN_FONT = '"Noto Serif SC","Noto Serif CJK SC","Songti SC","STSong","SimSun","Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",serif';
function glyphMask(text, size, font, weight = 700) {
  const n = 24, c = off(n, n), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${weight} ${size}px ${font}`;
  g.fillText(text, n / 2, n / 2 + 1);
  const data = g.getImageData(0, 0, n, n).data, mask = [];
  for (let i = 0; i < n * n; i++) if (data[i * 4 + 3] > 110) mask.push([i % n, (i / n) | 0]);
  return mask;
}
// Máy không có phông chữ Hán thì mọi chữ đều thành ô vuông giống nhau: khi đó dùng chữ Việt.
const hanAvailable = (() => { try { const a = JSON.stringify(glyphMask('帥', 15, HAN_FONT)), b = JSON.stringify(glyphMask('將', 15, HAN_FONT)); return a !== b && a.length > 40; } catch { return false; } })();
if (!hanAvailable) S.han = false;

const UI_FONT = '"Be Vietnam Pro",system-ui,sans-serif';
function drawPiece(g, p, x, y, lift = 0, mode) {
  const red = colorOf(p) === RED, ink = red ? C.red : C.ink, cy = y - lift;
  g.fillStyle = 'rgba(58,36,16,.28)'; g.beginPath(); g.ellipse(x, y + 12, 12 + lift * 0.4, 3.4, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(x - 4, cy - 5, 2, x, cy, 13.5);
  gr.addColorStop(0, '#fff8e4'); gr.addColorStop(1, mode === 'ghost' ? '#e6d7b6' : '#e2c58c');
  g.fillStyle = gr; g.beginPath(); g.arc(x, cy, 13.5, 0, Math.PI * 2); g.fill();
  g.lineWidth = 1.2; g.strokeStyle = '#3a2410'; g.stroke();
  g.lineWidth = 1; g.strokeStyle = ink; g.beginPath(); g.arc(x, cy, 10.4, 0, Math.PI * 2); g.stroke();
  const k = kind(p);
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (S.han) { g.font = `700 16px ${HAN_FONT}`; g.fillText(HAN[k][red ? 0 : 1], x, cy + 1); }
  else { g.font = `800 ${LETTERS[k].length > 1 ? 10 : 13}px ${UI_FONT}`; g.fillText(LETTERS[k], x, cy + 1); }
}

let boardLayer = null;
function buildBoard() {
  const c = off(W * K, H * K), g = c.getContext('2d');
  g.scale(K, K);
  const wood = g.createLinearGradient(0, 0, W, H);
  wood.addColorStop(0, '#efd4a0'); wood.addColorStop(0.5, '#e6c58a'); wood.addColorStop(1, '#dfbb7d');
  g.fillStyle = wood; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(138,90,34,.07)'; g.lineWidth = 1;
  for (let y = 3; y < H; y += 5) { g.beginPath(); for (let x = 0; x <= W; x += 8) { const yy = y + Math.sin(x * 0.045 + y * 0.3) * 1.6; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  g.strokeStyle = C.frame; g.lineWidth = 3; g.lineJoin = 'round';
  g.strokeRect(X0 - 8, Y0 - 8, 8 * CELL + 16, 9 * CELL + 16);
  g.strokeStyle = C.line; g.lineWidth = 1.2; g.lineCap = 'round';
  const P = (r, c2) => [X0 + c2 * CELL, Y0 + r * CELL];
  g.beginPath();
  for (let r = 0; r < 10; r++) { g.moveTo(X0, Y0 + r * CELL); g.lineTo(X0 + 8 * CELL, Y0 + r * CELL); }
  for (let c2 = 0; c2 < 9; c2++) {
    if (c2 === 0 || c2 === 8) { g.moveTo(X0 + c2 * CELL, Y0); g.lineTo(X0 + c2 * CELL, Y0 + 9 * CELL); }
    else { g.moveTo(X0 + c2 * CELL, Y0); g.lineTo(X0 + c2 * CELL, Y0 + 4 * CELL); g.moveTo(X0 + c2 * CELL, Y0 + 5 * CELL); g.lineTo(X0 + c2 * CELL, Y0 + 9 * CELL); }
  }
  for (const [a, b] of [[[0, 3], [2, 5]], [[0, 5], [2, 3]], [[7, 3], [9, 5]], [[7, 5], [9, 3]]]) { g.moveTo(...P(...a)); g.lineTo(...P(...b)); }
  g.stroke();
  // Dấu vị trí pháo và tốt.
  const marks = [[2, 1], [2, 7], [7, 1], [7, 7], ...[0, 2, 4, 6, 8].flatMap(c2 => [[3, c2], [6, c2]])];
  g.beginPath();
  for (const [r, c2] of marks) {
    const [x, y] = P(r, c2);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      if ((c2 === 0 && sx < 0) || (c2 === 8 && sx > 0)) continue;
      g.moveTo(x + sx * 7, y + sy * 3); g.lineTo(x + sx * 3, y + sy * 3); g.lineTo(x + sx * 3, y + sy * 7);
    }
  }
  g.stroke();
  // Sông.
  const riverY = Y0 + 4 * CELL + 15;
  const left = S.han ? ['楚', '河'] : ['SỞ', 'HÀ'], right = S.han ? ['漢', '界'] : ['HÁN', 'GIỚI'];
  g.fillStyle = C.frame; g.globalAlpha = 0.85; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = S.han ? `700 17px ${HAN_FONT}` : `800 11px ${UI_FONT}`;
  const drawWord = (text, cx) => g.fillText(text, cx, riverY + 1);
  drawWord(left[0], X0 + 1.4 * CELL); drawWord(left[1], X0 + 2.6 * CELL); drawWord(right[0], X0 + 5.4 * CELL); drawWord(right[1], X0 + 6.6 * CELL);
  g.globalAlpha = 1;
  boardLayer = c;
}
function drawFiles(g) {
  // Số cột: phía trên là cột của bên ở trên, phía dưới là của bên ở dưới (đếm từ phải sang trái của người ngồi).
  g.font = `700 8px ${UI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 9; i++) {
    const x = X0 + i * CELL;
    const topColor = S.flip ? RED : BLACK, bottomColor = other(topColor);
    const c2 = S.flip ? 8 - i : i;
    const top = topColor === BLACK ? c2 + 1 : 9 - c2, bottom = bottomColor === RED ? 9 - c2 : c2 + 1;
    g.fillStyle = topColor === RED ? C.red : C.ink; g.fillText(top, x, 6);
    g.fillStyle = bottomColor === RED ? C.red : C.ink; g.fillText(bottom, x, H - 6);
  }
}

const dispR = r => (S.flip ? 9 - r : r), dispC = c2 => (S.flip ? 8 - c2 : c2);
const pos = i => [X0 + dispC(col(i)) * CELL, Y0 + dispR(row(i)) * CELL];
function brackets(g, i, radius, color) {
  const [x, y] = pos(i);
  g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.roundRect(x - radius, y - radius, radius * 2, radius * 2, 7); g.stroke();
}
function diamond(g, x, y, fill, edge) {
  g.fillStyle = fill; g.strokeStyle = edge; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill(); g.stroke();
}

let raf = 0;
function frame(now) {
  raf = 0;
  const g = ctx, game = S.game;
  g.imageSmoothingEnabled = true;
  if (!boardLayer) buildBoard();
  let ox = 0, oy = 0;
  if (S.shake > now) { ox = (hash(now | 0, 1) - 0.5) * 3; oy = (hash(1, now | 0) - 0.5) * 3; }
  g.setTransform(K, 0, 0, K, ox * K, oy * K);
  g.drawImage(boardLayer, 0, 0, W, H);
  drawFiles(g);
  const last = game.history[game.history.length - 1];
  if (last) { brackets(g, last.from, 9, 'rgba(255,220,56,.85)', 3); brackets(g, last.to, 14, C.yellow, 5); }
  if (S.hint) { brackets(g, S.hint.from, 14, C.blue, 5); brackets(g, S.hint.to, 14, C.blue, 5); }
  if (game.inCheck() && !game.result) {
    const k = game.board.indexOf(game.turn === RED ? 'K' : 'k');
    if (k >= 0 && Math.floor(now / 260) % 2 === 0) brackets(g, k, 15, C.red, 6);
  }
  const anim = S.anim && now - S.anim.start < S.anim.dur ? S.anim : null;
  if (S.anim && !anim) S.anim = null;
  for (let i = 0; i < 90; i++) {
    const p = game.board[i];
    if (!p) continue;
    if (anim && i === anim.to) { if (anim.captured) { const [x, y] = pos(i); drawPiece(g, anim.captured, x, y); } continue; }
    const [x, y] = pos(i);
    drawPiece(g, p, x, y, i === S.selected ? 2 : 0);
  }
  if (anim) {
    const t = Math.min(1, (now - anim.start) / anim.dur), e = 1 - (1 - t) ** 3;
    const [x0, y0] = pos(anim.from), [x1, y1] = pos(anim.to);
    drawPiece(g, anim.piece, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, Math.sin(Math.PI * t) * 5);
  }
  if (S.selected >= 0) {
    const blink = Math.floor(now / 300) % 2 === 0;
    brackets(g, S.selected, 15, blink ? C.yellow : C.ink, 6);
    for (const to of S.targets) {
      const [x, y] = pos(to);
      if (game.board[to]) brackets(g, to, 15, C.red, 5); else diamond(g, x, y, C.yellow, C.ink);
    }
  }
  if (S.cursor >= 0 && document.activeElement === canvas) brackets(g, S.cursor, 13, Math.floor(now / 400) % 2 ? C.blue : C.yellow, 4);
  else if (S.hover >= 0 && S.hover !== S.selected) brackets(g, S.hover, 13, 'rgba(48,52,135,.55)', 3);
  // Mảnh vụn khi ăn quân.
  S.particles = S.particles.filter(pt => now - pt.born < pt.life);
  for (const pt of S.particles) {
    const t = (now - pt.born) / 1000;
    g.fillStyle = pt.color;
    g.beginPath(); g.arc(pt.x + pt.vx * t, pt.y + pt.vy * t + 160 * t * t, pt.size / 2 + 0.5, 0, Math.PI * 2); g.fill();
  }
  g.setTransform(K, 0, 0, K, 0, 0);
  if (S.anim || S.particles.length || S.selected >= 0 || S.shake > now || (game.inCheck() && !game.result) || (S.cursor >= 0 && document.activeElement === canvas)) request();
}
const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
function burst(i, p) {
  const [x, y] = pos(i), colors = colorOf(p) === RED ? [C.red, C.redDark, '#f6e3b6', C.yellow] : [C.ink, C.blue, '#f6e3b6', C.yellow];
  const now = performance.now();
  for (let k = 0; k < 16; k++) {
    const a = (Math.PI * 2 * k) / 16 + hash(k, now | 0), v = 40 + hash(now | 0, k) * 70;
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, born: now + 150, life: 520, size: k % 3 ? 2 : 3, color: colors[k % 4] });
  }
  S.shake = now + 280;
}

// ---------- Nhập liệu ----------
function pointToIndex(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) * W) / rect.width, y = ((clientY - rect.top) * H) / rect.height;
  const dc = Math.round((x - X0) / CELL), dr = Math.round((y - Y0) / CELL);
  if (dc < 0 || dc > 8 || dr < 0 || dr > 9) return -1;
  if (Math.hypot(x - (X0 + dc * CELL), y - (Y0 + dr * CELL)) > 15) return -1;
  return sq(S.flip ? 9 - dr : dr, S.flip ? 8 - dc : dc);
}
function myColor() {
  if (S.mode === 'ai') return S.human;
  if (S.mode === 'online') return S.room?.state?.you || null;
  return S.game.turn;
}
function canAct() {
  const g = S.game;
  if (g.result) return false;
  if (S.mode === 'ai') return !S.thinking && g.turn === S.human;
  if (S.mode === 'online') { const st = S.room?.state; return !!st && st.status === 'playing' && st.you === g.turn && S.room.socket?.readyState === 1; }
  return true;
}
function select(i) {
  S.selected = i; S.targets = i >= 0 ? S.game.legalMoves(i).map(m => m[1]) : [];
  if (i >= 0) sfx('pick');
  request();
}
function tap(i) {
  if (i < 0) return;
  S.cursor = i;
  if (!canAct()) {
    if (S.game.board[i] && colorOf(S.game.board[i]) === myColor()) say(S.mode === 'ai' && S.thinking ? 'Máy đang nghĩ, bạn chờ một chút.' : 'Chưa tới lượt bạn.');
    return;
  }
  if (S.selected >= 0 && S.targets.includes(i)) return play(S.selected, i, 'me');
  const p = S.game.board[i];
  if (p && colorOf(p) === S.game.turn) return select(i === S.selected ? -1 : i);
  if (S.selected >= 0) sfx('bad');
  select(-1);
}
canvas.addEventListener('pointerdown', e => { if (e.button === 0) tap(pointToIndex(e.clientX, e.clientY)); });
canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const i = pointToIndex(e.clientX, e.clientY); if (i !== S.hover) { S.hover = i; request(); } });
canvas.addEventListener('pointerleave', () => { S.hover = -1; request(); });
canvas.addEventListener('focus', () => { if (S.cursor < 0) S.cursor = S.selected >= 0 ? S.selected : S.game.board.indexOf(myColor() === BLACK ? 'k' : 'K'); request(); });
canvas.addEventListener('blur', request);
canvas.addEventListener('keydown', e => {
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (moves[e.key]) {
    e.preventDefault();
    let [dr, dc] = moves[e.key]; if (S.flip) { dr = -dr; dc = -dc; }
    const c0 = S.cursor < 0 ? 40 : S.cursor;
    S.cursor = sq(Math.max(0, Math.min(9, row(c0) + dr)), Math.max(0, Math.min(8, col(c0) + dc)));
    request();
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(S.cursor < 0 ? 40 : S.cursor); }
  else if (e.key === 'Escape') select(-1);
});

// ---------- Ván cờ ----------
function play(from, to, source) {
  const g = S.game, piece = g.board[from];
  const rec = g.move(from, to);
  if (!rec) { sfx('bad'); return null; }
  S.selected = -1; S.targets = []; S.hint = null; S.cursor = to;
  S.anim = { piece, from, to, captured: rec.captured, start: performance.now(), dur: 190 };
  if (rec.captured) { burst(to, rec.captured); sfx('capture'); } else sfx('move');
  if (rec.check && !g.result) { setTimeout(() => sfx('check'), 120); flash('CHIẾU!'); }
  if (S.mode === 'online' && source === 'me') send({ t: 'move', from, to, n: g.history.length - 1 });
  afterMove();
  if (S.mode === 'ai' && !g.result && g.turn !== S.human) thinkSoon();
  return rec;
}
function afterMove() {
  const g = S.game;
  if (g.result) showResult(g.result);
  update(); request();
}
function resultTitle(result) {
  if (!result.winner) return 'Hòa';
  return result.winner === RED ? 'Đỏ thắng' : 'Đen thắng';
}
function showResult(result) {
  const mine = myColor();
  const personal = S.mode !== 'local' && mine && result.winner;
  if (result.winner && personal) sfx(result.winner === mine ? 'win' : 'lose'); else sfx(result.winner ? 'win' : 'ping');
  const title = personal ? (result.winner === mine ? 'Bạn thắng!' : 'Bạn thua rồi') : resultTitle(result);
  banner(title, REASONS[result.reason] || '', false);
}
function banner(title, sub, check) {
  const el = $('#banner');
  $('#banner-title').textContent = title; $('#banner-sub').textContent = sub;
  el.classList.toggle('check', !!check); el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(S.bannerTimer);
  if (check) S.bannerTimer = setTimeout(() => { el.hidden = true; }, 900);
}
const flash = text => banner(text, '', true);
$('#banner').addEventListener('click', () => { $('#banner').hidden = true; });

function newGame(fen = START_FEN) {
  S.aiId++; S.thinking = false;
  S.game = new Game(fen); S.selected = -1; S.targets = []; S.hint = null; S.anim = null; S.particles = [];
  $('#banner').hidden = true;
  if (S.mode === 'ai') { S.flip = S.human === BLACK; if (S.human === BLACK) thinkSoon(); }
  else if (S.mode === 'local') S.flip = false;
  boardLayer = null; update(); request();
}

// ---------- Máy chơi cờ (Web Worker) ----------
let worker = null, fallback = null;
const pending = new Map();
function ai() {
  if (worker || fallback) return;
  try {
    worker = new Worker(new URL('./ai-worker.mjs?v=1', import.meta.url), { type: 'module' });
    worker.onmessage = e => { const cb = pending.get(e.data.id); pending.delete(e.data.id); cb?.(e.data.move); };
    worker.onerror = () => { worker?.terminate(); worker = null; fallback = import('./ai.mjs?v=1'); for (const [id, job] of pendingJobs) runFallback(id, job); };
  } catch { worker = null; fallback = import('./ai.mjs?v=1'); }
}
const pendingJobs = new Map();
async function runFallback(id, job) {
  const mod = await fallback;
  setTimeout(() => { const move = mod.search(job.fen, { ...mod.LEVELS[job.level], history: job.history }); pendingJobs.delete(id); const cb = pending.get(id); pending.delete(id); cb?.(move); }, 30);
}
let jobSeq = 0;
function ask(fen, level, history) {
  ai();
  const id = ++jobSeq, job = { fen, level, history };
  return new Promise(resolve => {
    pending.set(id, resolve); pendingJobs.set(id, job);
    if (worker) { worker.postMessage({ id, ...job }); }
    else runFallback(id, job);
  }).finally(() => pendingJobs.delete(id));
}
function thinkSoon() {
  const id = ++S.aiId, g = S.game, started = performance.now();
  S.thinking = true; update();
  ask(g.fen, S.level, g.keys.slice()).then(move => {
    if (id !== S.aiId || S.mode !== 'ai') return;
    const wait = Math.max(0, 380 - (performance.now() - started));
    setTimeout(() => {
      if (id !== S.aiId) return;
      S.thinking = false;
      if (move && !g.result) play(move.from, move.to, 'ai'); else update();
    }, wait);
  });
}

// ---------- Online ----------
const API = '/api/cotuong';
function playerName() { const v = $('#player-name').value.trim(); store.set('name', v); return v; }
function seatToken(code) {
  try { const v = JSON.parse(store.get('seat:' + code) || 'null'); return v && Date.now() - v.at < 3 * 3600_000 ? v.token : null; } catch { return null; }
}
const saveSeat = (code, token) => store.set('seat:' + code, JSON.stringify({ token, at: Date.now() }));
async function api(path, body) {
  const res = await fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  // POST bị 404 nghĩa là máy chủ này chưa có phòng online (ví dụ bản chạy thử trên máy); GET 404 là phòng không còn.
  if (!res.ok) throw new Error(res.status === 404 && body ? 'Chế độ online chưa sẵn sàng ở đây.' : data.error || 'Chưa kết nối được máy chủ. Hãy thử lại sau.');
  return data;
}
const minutesChoice = () => Number(document.querySelector('input[name="minutes"]:checked')?.value || 10);
async function busy(button, job) {
  const buttons = [...document.querySelectorAll('#lobby button')];
  buttons.forEach(b => { b.disabled = true; });
  try { await job(); } catch (e) { say(e.message); } finally { buttons.forEach(b => { b.disabled = false; }); }
}
$('#create-room').addEventListener('click', e => busy(e.currentTarget, async () => {
  say('Đang tạo phòng…');
  const data = await api('/rooms', { minutes: minutesChoice(), name: playerName() });
  saveSeat(data.room, data.token); enterRoom(data.room);
}));
$('#quick-match').addEventListener('click', e => busy(e.currentTarget, async () => {
  say('Đang tìm đối thủ…');
  const data = await api('/match', { minutes: minutesChoice(), name: playerName() });
  if (data.token) saveSeat(data.room, data.token);
  enterRoom(data.room);
}));
$('#join-form').addEventListener('submit', e => {
  e.preventDefault();
  const code = $('#join-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { say('Mã phòng gồm 6 chữ cái hoặc số.'); return; }
  busy(null, async () => { await api('/rooms/' + code); enterRoom(code); });
});
function send(msg) { const ws = S.room?.socket; if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); }
function enterRoom(code) {
  leaveRoom(false);
  setMode('online', false);
  S.room = { code, socket: null, state: null, retry: 0, alive: true, received: 0 };
  const url = new URL(location.href); url.searchParams.set('phong', code); url.hash = 'ban-co';
  history.replaceState(null, '', url);
  $('#lobby').hidden = true; $('#room').hidden = false;
  $('#room-code').textContent = code;
  $('#invite-link').value = `${location.origin}/cotuong/?phong=${code}`;
  newGame(); S.flip = false;
  connect();
}
function connect() {
  const room = S.room;
  if (!room?.alive) return;
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${API}/ws?room=${room.code}`);
  room.socket = ws;
  say('Đang vào phòng…');
  ws.onopen = () => { room.retry = 0; ws.send(JSON.stringify({ t: 'hello', token: seatToken(room.code), name: playerName() })); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMessage(m); };
  ws.onclose = ev => {
    if (room !== S.room || !room.alive) return;
    if (ev.code === 4404 || ev.code === 4410) { say('Phòng không tồn tại hoặc đã hết hạn.'); room.alive = false; return; }
    room.retry++;
    say('Mất kết nối. Đang nối lại…');
    update();
    setTimeout(connect, Math.min(10000, 800 * 2 ** Math.min(room.retry, 4)));
  };
}
function leaveRoom(reset = true) {
  const room = S.room;
  if (room) { room.alive = false; try { room.socket?.close(1000); } catch { /* bỏ qua */ } }
  S.room = null;
  clearInterval(S.ping);
  if (reset) {
    const url = new URL(location.href); url.searchParams.delete('phong'); history.replaceState(null, '', url);
    $('#lobby').hidden = false; $('#room').hidden = true;
    newGame(); say('Đã rời phòng.');
  }
}
function onMessage(m) {
  const room = S.room;
  if (!room) return;
  if (m.t === 'joined') { saveSeat(room.code, m.token); return; }
  if (m.t === 'emote') { emote(m.color, m.e); sfx('ping'); return; }
  if (m.t === 'error') { say(m.message); if (room.state) sync(room.state, true); return; }
  if (m.t !== 'state') return;
  room.received = performance.now();
  const before = room.state;
  room.state = m;
  if (!before || before.games !== m.games || before.you !== m.you) S.flip = m.you === BLACK;
  if (before && before.status === 'waiting' && m.status === 'playing') { sfx('win'); flash('BẮT ĐẦU!'); }
  if (before && before.drawOffer !== m.drawOffer && m.drawOffer && m.drawOffer !== m.you && m.you) sfx('ping');
  sync(m, before?.games !== m.games);
  clearInterval(S.ping); S.ping = setInterval(() => send({ t: 'ping' }), 25000);
}
function sync(st, hard) {
  const g = S.game, local = g.history.map(h => [h.from, h.to]);
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const prefix = local.every((mv, i) => st.moves[i] && same(mv, st.moves[i]));
  if (!hard && prefix && st.moves.length === local.length + 1) play(st.moves[local.length][0], st.moves[local.length][1], 'remote');
  else if (hard || !prefix || st.moves.length !== local.length) {
    S.game = new Game(); for (const [f, t] of st.moves) S.game.move(f, t);
    S.selected = -1; S.targets = []; S.anim = null; boardLayer = null;
  }
  const ended = st.status === 'ended' && st.result;
  if (ended && !S.game.result) { S.game.result = st.result; showResult(st.result); }
  else if (ended && S.game.result && JSON.stringify(S.game.result) !== JSON.stringify(st.result)) { S.game.result = st.result; showResult(st.result); }
  if (st.status !== 'ended' && $('#banner').classList.contains('check') === false) $('#banner').hidden = true;
  update(); request();
}
function emote(color, e) {
  const bar = barFor(color);
  if (!bar) return;
  const el = bar.querySelector('.emote-bubble');
  el.textContent = e; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
for (const b of document.querySelectorAll('[data-emote]')) b.addEventListener('click', () => { send({ t: 'emote', e: b.dataset.emote }); });
$('#copy-link').addEventListener('click', async () => {
  const input = $('#invite-link');
  try { await navigator.clipboard.writeText(input.value); say('Đã sao chép link mời. Gửi cho bạn qua Zalo hay Messenger nhé.'); }
  catch { input.select(); say('Hãy chọn và sao chép link trong ô.'); }
});
$('#accept-draw').addEventListener('click', () => send({ t: 'draw' }));
$('#decline-draw').addEventListener('click', () => send({ t: 'decline' }));
$('#rematch').addEventListener('click', () => { send({ t: 'rematch' }); say('Đã gửi lời mời đấu lại. Chờ đối thủ đồng ý.'); });
$('#leave-room').addEventListener('click', () => {
  const st = S.room?.state;
  if (st?.status === 'playing' && st.you && !confirmTwice('leave', $('#leave-room'), 'Bấm lần nữa để rời')) return;
  if (st?.status === 'playing' && st.you) send({ t: 'resign' });
  setTimeout(() => leaveRoom(true), 60);
});

// Bấm hai lần cho thao tác khó hoàn tác (xin thua, rời phòng giữa ván).
function confirmTwice(key, button, label) {
  if (S.armed?.key === key && Date.now() - S.armed.at < 3500) { clearTimeout(S.armed.timer); button.textContent = S.armed.text; S.armed = null; return true; }
  if (S.armed) { clearTimeout(S.armed.timer); S.armed.button.textContent = S.armed.text; }
  const text = button.textContent;
  S.armed = { key, at: Date.now(), text, button, timer: setTimeout(() => { button.textContent = text; S.armed = null; }, 3500) };
  button.textContent = label;
  return false;
}

// ---------- Bảng điều khiển ----------
function say(text) { $('#status').textContent = text; const bs = $('#board-status'); if (bs) bs.textContent = text; }
const barFor = color => { const bottom = S.flip ? BLACK : RED; return color === bottom ? $('#bar-bottom') : color ? $('#bar-top') : null; };
const clockText = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
function update() {
  const g = S.game, st = S.room?.state, online = S.mode === 'online' && st;
  for (const color of [RED, BLACK]) {
    const bar = barFor(color);
    bar.classList.toggle('is-black', color === BLACK);
    bar.classList.toggle('turn', !g.result && g.turn === color && (!online || st.status === 'playing'));
    let name, tag = '';
    if (S.mode === 'ai') { name = color === S.human ? (store.get('name') || 'Người chơi') : `Máy · ${({ de: 'Dễ', vua: 'Vừa', kho: 'Khó' })[S.level]}`; tag = color === S.human ? 'Bạn' : (S.thinking && g.turn === color ? 'Đang nghĩ' : ''); }
    else if (S.mode === 'local') name = color === RED ? 'Bên Đỏ' : 'Bên Đen';
    else {
      const p = st?.players?.[color];
      name = p ? p.name : (st ? 'Đang chờ người chơi…' : '');
      tag = st?.you === color ? 'Bạn' : p && !p.online ? 'Mất kết nối' : '';
    }
    bar.querySelector('.player-name').textContent = name;
    bar.querySelector('.player-tag').textContent = tag;
    bar.classList.toggle('offline', tag === 'Mất kết nối');
    const capturedBy = g.history.filter(h => h.color === color && h.captured).map(h => h.captured);
    bar.querySelector('.captured').replaceChildren(...capturedBy.map(p => { const i = document.createElement('i'); i.className = colorOf(p); i.textContent = S.han ? HAN[kind(p)][colorOf(p) === RED ? 0 : 1] : LETTERS[kind(p)]; return i; }));
  }
  tickClocks();
  // Biên bản
  const list = $('#move-list');
  const rows = [];
  for (let i = 0; i < g.history.length; i += 2) {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.textContent = i / 2 + 1 + '.';
    li.append(n);
    for (const h of [g.history[i], g.history[i + 1]]) {
      const s = document.createElement('span');
      if (h) { s.textContent = h.san; s.className = h.color + (h === g.history[g.history.length - 1] ? ' now' : ''); }
      li.append(s);
    }
    rows.push(li);
  }
  if (!rows.length) { const li = document.createElement('li'); const s = document.createElement('span'); s.style.gridColumn = '1/-1'; s.style.opacity = '.6'; s.textContent = 'Chưa có nước nào.'; li.append(s); rows.push(li); }
  list.replaceChildren(...rows);
  list.scrollTop = list.scrollHeight;
  // Nút
  const playing = !g.result && (S.mode !== 'online' || (st?.status === 'playing' && st.you));
  $('#undo').disabled = S.mode === 'online' || !g.history.length || (S.mode === 'ai' && (S.thinking || g.history.length < (S.human === BLACK ? 2 : 1)));
  $('#hint').disabled = S.mode === 'online' || !!g.result || !canAct();
  $('#draw').disabled = !playing || (S.mode === 'online' && st?.drawOffer === st?.you);
  $('#resign').disabled = !playing;
  $('#flip').disabled = false;
  if (S.mode === 'online' && st) {
    $('#room-minutes').textContent = `${st.minutes} phút mỗi bên`;
    $('#draw-offer').hidden = !(st.status === 'playing' && st.drawOffer && st.drawOffer !== st.you && st.you);
    $('#rematch').hidden = !(st.status === 'ended' && st.you && st.players.r && st.players.b);
    $('#rematch').disabled = !!st.rematch?.[st.you];
    $('#invite').hidden = st.status !== 'waiting';
  }
  // Dòng trạng thái
  let text = '';
  if (g.result) text = `${resultTitle(g.result)} · ${REASONS[g.result.reason] || ''}`;
  else if (S.mode === 'online') {
    if (!st) text = 'Đang vào phòng…';
    else if (S.room.socket?.readyState !== 1) text = 'Mất kết nối. Đang nối lại…';
    else if (st.status === 'waiting') text = st.you ? 'Đang chờ đối thủ vào phòng. Gửi link mời cho bạn nhé.' : 'Phòng đang chờ người chơi.';
    else if (!st.you) text = g.turn === RED ? 'Bạn đang xem. Lượt của Đỏ.' : 'Bạn đang xem. Lượt của Đen.';
    else if (st.drawOffer === st.you) text = 'Đã gửi lời xin hòa. Chờ đối thủ trả lời.';
    else text = g.turn === st.you ? (g.inCheck() ? 'Bạn đang bị chiếu! Hãy gỡ chiếu.' : 'Tới lượt bạn.') : 'Đối thủ đang nghĩ…';
  } else if (S.mode === 'ai') text = S.thinking ? 'Máy đang nghĩ…' : g.inCheck() ? 'Bạn đang bị chiếu! Hãy gỡ chiếu.' : 'Tới lượt bạn. Chạm một quân để xem nước đi.';
  else text = g.turn === RED ? (g.inCheck() ? 'Đỏ đang bị chiếu!' : 'Lượt của Đỏ.') : (g.inCheck() ? 'Đen đang bị chiếu!' : 'Lượt của Đen.');
  say(text);
}
function tickClocks() {
  const st = S.room?.state, g = S.game;
  for (const color of [RED, BLACK]) {
    const bar = barFor(color), clock = bar.querySelector('.clock');
    if (S.mode !== 'online' || !st) { clock.textContent = ''; bar.classList.remove('low'); continue; }
    let ms = st.clock[color];
    if (st.status === 'playing' && st.turn === color && S.room.received) ms -= performance.now() - S.room.received;
    clock.textContent = clockText(ms);
    bar.classList.toggle('low', st.status === 'playing' && st.turn === color && ms < 30000);
  }
  if (g && st?.status === 'playing' && S.room.received) {
    const left = st.clock[st.turn] - (performance.now() - S.room.received);
    if (left < -1500 && !S.room.nudged) { S.room.nudged = true; send({ t: 'ping' }); }
  }
}
setInterval(() => { if (S.mode === 'online') tickClocks(); }, 250);

function setMode(mode, fresh = true) {
  if (S.mode === 'online' && mode !== 'online' && S.room) leaveRoom(false);
  S.mode = mode;
  for (const m of ['ai', 'local', 'online']) {
    $('#tab-' + m).setAttribute('aria-selected', String(m === mode));
    $('#panel-' + m).hidden = m !== mode;
  }
  if (mode === 'online' && !S.room) { $('#lobby').hidden = false; $('#room').hidden = true; }
  if (fresh) newGame();
}
for (const m of ['ai', 'local', 'online']) $('#tab-' + m).addEventListener('click', () => { if (S.mode !== m) setMode(m); });
$('.mode-tabs').addEventListener('keydown', e => {
  const tabs = ['ai', 'local', 'online'], i = tabs.indexOf(S.mode);
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const m = tabs[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]; setMode(m); $('#tab-' + m).focus(); }
});
for (const r of document.querySelectorAll('input[name="level"]')) r.addEventListener('change', () => { S.level = r.value; update(); });
for (const r of document.querySelectorAll('input[name="side"]')) r.addEventListener('change', () => { S.human = r.value; newGame(); });
$('#new-ai').addEventListener('click', () => newGame());
$('#new-local').addEventListener('click', () => newGame());
$('#undo').addEventListener('click', () => {
  const g = S.game;
  S.aiId++; S.thinking = false;
  if (S.mode === 'ai') { do { g.undo(); } while (g.history.length && g.turn !== S.human); if (g.turn !== S.human) thinkSoon(); }
  else g.undo();
  S.selected = -1; S.targets = []; S.hint = null; S.anim = null; $('#banner').hidden = true;
  update(); request();
});
$('#hint').addEventListener('click', async () => {
  const g = S.game;
  $('#hint').disabled = true; say('Đang tìm gợi ý…');
  const move = await ask(g.fen, 'vua', g.keys.slice());
  if (move && S.game === g && !g.result) { S.hint = move; say('Gợi ý: đi quân trong khung xanh tới ô khung xanh.'); request(); setTimeout(() => { if (S.hint === move) { S.hint = null; request(); } }, 4000); }
  $('#hint').disabled = false;
});
$('#draw').addEventListener('click', () => {
  const g = S.game;
  if (S.mode === 'online') { send({ t: 'draw' }); return; }
  if (S.mode === 'local') { g.end(null, 'agreement'); afterMove(); return; }
  // Máy chỉ đồng ý hòa khi đang yếu thế rõ.
  import('./ai.mjs?v=1').then(({ evaluate }) => {
    const score = evaluate(g.board, other(S.human));
    if (score < -150) { g.end(null, 'agreement'); afterMove(); }
    else say('Máy từ chối hòa. Ván cờ vẫn tiếp tục.');
  });
});
$('#resign').addEventListener('click', () => {
  const g = S.game;
  if (!confirmTwice('resign', $('#resign'), 'Bấm lần nữa')) return;
  if (S.mode === 'online') { send({ t: 'resign' }); return; }
  g.end(S.mode === 'ai' ? other(S.human) : other(g.turn), 'resign'); S.aiId++; S.thinking = false; afterMove();
});
$('#flip').addEventListener('click', () => { S.flip = !S.flip; update(); request(); });
const soundLabel = () => { $('#sound').textContent = S.sound ? 'Âm thanh: bật' : 'Âm thanh: tắt'; $('#sound').setAttribute('aria-pressed', String(S.sound)); };
$('#sound').addEventListener('click', () => { S.sound = !S.sound; store.set('sound', S.sound ? 'on' : 'off'); soundLabel(); if (S.sound) sfx('ping'); });
const glyphLabel = () => { $('#glyphs').textContent = S.han ? 'Chữ quân: Hán' : 'Chữ quân: Việt'; };
$('#glyphs').addEventListener('click', () => {
  if (!hanAvailable && !S.han) { say('Máy của bạn chưa có phông chữ Hán, nên quân cờ dùng chữ Việt.'); return; }
  S.han = !S.han; store.set('glyph', S.han ? 'han' : 'viet'); boardLayer = null; glyphLabel(); update(); request();
});

// ---------- Khởi động ----------
$('#player-name').value = store.get('name') || '';
soundLabel(); glyphLabel();
const fromLink = new URLSearchParams(location.search).get('phong');
if (fromLink && /^[A-Z0-9]{6}$/i.test(fromLink)) {
  setMode('online', false);
  api('/rooms/' + fromLink.toUpperCase()).then(() => enterRoom(fromLink.toUpperCase())).catch(e => { say(e.message); newGame(); });
} else newGame();
document.fonts?.ready?.then(() => { boardLayer = null; request(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });

// ---------- Toàn màn hình ----------
(() => {
  const arcade = $('.arcade');
  if (!arcade) return;
  const wrap = arcade.closest('.arcade-wrap') || document.documentElement;
  let active = false, wasNative = false;
  const syncButtons = () => {
    for (const [el, fullTxt, shortTxt] of [[$('#fullscreen'), 'Toàn màn hình', 'Thu nhỏ'], [$('.fs-corner'), 'Phóng to', 'Thu nhỏ']]) {
      if (!el) continue;
      el.setAttribute('aria-pressed', String(active));
      el.setAttribute('aria-label', active ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình');
      el.title = active ? 'Thu nhỏ' : 'Toàn màn hình';
      const ic = el.querySelector('.ic'), tx = el.querySelector('span:not(.ic)');
      if (ic) ic.className = 'ic ' + (active ? 'ic-collapse' : 'ic-expand');
      if (tx) tx.textContent = active ? shortTxt : fullTxt;
    }
  };
  const syncViewport = () => {
    document.body.classList.toggle('has-game-fs', active);
    arcade.classList.toggle('is-fs', active);
    if (active) {
      arcade.style.setProperty('--fs-w', window.innerWidth + 'px');
      arcade.style.setProperty('--fs-h', window.innerHeight + 'px');
    } else {
      arcade.style.removeProperty('--fs-w');
      arcade.style.removeProperty('--fs-h');
    }
  };
  const toggle = async force => {
    const next = typeof force === 'boolean' ? force : !active;
    if (next === active) return;
    active = next; syncViewport(); syncButtons();
    if (active) {
      try {
        const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
        if (req && !document.fullscreenElement && !document.webkitFullscreenElement) await req.call(wrap);
      } catch {}
      syncViewport();
    } else {
      wasNative = false;
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        }
      } catch {}
      syncViewport();
    }
  };
  $('#fullscreen')?.addEventListener('click', () => toggle());
  $('.fs-corner')?.addEventListener('click', () => toggle());
  $('#fs-hint')?.addEventListener('click', () => $('#hint')?.click());
  $('#fs-new')?.addEventListener('click', () => { const rm = $('#rematch'); if (rm && !rm.hidden) { rm.click(); return; } const nl = $('#new-local'); if (nl && !$('#panel-local')?.hidden) { nl.click(); return; } $('#new-ai')?.click(); });
  window.addEventListener('resize', () => { if (active) syncViewport(); });
  const onFsChange = () => {
    const nativeEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (nativeEl) { wasNative = true; if (active) syncViewport(); }
    else if (wasNative && active) { wasNative = false; toggle(false); }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active && !document.fullscreenElement && !document.webkitFullscreenElement) toggle(false);
  });
  syncButtons();
})();
