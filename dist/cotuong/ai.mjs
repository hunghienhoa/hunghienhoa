// Máy chơi cờ tướng: tìm kiếm alpha-beta lặp sâu dần, bảng chuyển vị (Zobrist), tìm tĩnh khi ăn quân,
// sắp xếp nước theo "quân rẻ ăn quân đắt" và nước sát thủ. Chạy trong Web Worker để giao diện không bị đứng.
import { parseFen, pseudoMoves, makeMove, unmakeMove, inCheck, colorOf, kind, other, positionKey, notation, START_FEN, RED, row, col } from './core.mjs?v=1';

const VALUE = { K: 0, A: 200, B: 200, N: 400, R: 900, C: 450, P: 100 };
// Bảng vị trí nhìn từ phía Đỏ (hàng 0 là phía Đen); quân Đen dùng bảng lật dọc.
const T = {
  P: [[0, 3, 6, 9, 12, 9, 6, 3, 0], [18, 36, 56, 80, 120, 80, 56, 36, 18], [14, 26, 42, 60, 80, 60, 42, 26, 14], [10, 20, 30, 34, 40, 34, 30, 20, 10], [6, 12, 18, 18, 20, 18, 18, 12, 6], [2, 0, 8, 0, 8, 0, 8, 0, 2], [0, 0, -2, 0, 4, 0, -2, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]],
  N: [[4, 8, 16, 12, 4, 12, 16, 8, 4], [4, 10, 28, 16, 8, 16, 28, 10, 4], [12, 14, 16, 20, 18, 20, 16, 14, 12], [8, 24, 18, 24, 20, 24, 18, 24, 8], [6, 16, 14, 18, 16, 18, 14, 16, 6], [4, 12, 16, 14, 12, 14, 16, 12, 4], [2, 6, 8, 6, 10, 6, 8, 6, 2], [4, 2, 8, 8, 4, 8, 8, 2, 4], [0, 2, 4, 4, -2, 4, 4, 2, 0], [0, -4, 0, 0, 0, 0, 0, -4, 0]],
  R: [[14, 14, 12, 18, 16, 18, 12, 14, 14], [16, 20, 18, 24, 26, 24, 18, 20, 16], [12, 12, 12, 18, 18, 18, 12, 12, 12], [12, 18, 16, 22, 22, 22, 16, 18, 12], [12, 14, 12, 18, 18, 18, 12, 14, 12], [12, 16, 14, 20, 20, 20, 14, 16, 12], [6, 10, 8, 14, 14, 14, 8, 10, 6], [4, 8, 6, 14, 12, 14, 6, 8, 4], [8, 4, 8, 16, 8, 16, 8, 4, 8], [-2, 10, 6, 14, 12, 14, 6, 10, -2]],
  C: [[6, 4, 0, -10, -12, -10, 0, 4, 6], [2, 2, 0, -4, -14, -4, 0, 2, 2], [2, 2, 0, -10, -8, -10, 0, 2, 2], [0, 0, -2, 4, 10, 4, -2, 0, 0], [0, 0, 0, 2, 8, 2, 0, 0, 0], [-2, 0, 4, 2, 6, 2, 4, 0, -2], [0, 0, 0, 2, 4, 2, 0, 0, 0], [4, 0, 8, 6, 10, 6, 8, 0, 4], [0, 2, 4, 6, 6, 6, 4, 2, 0], [0, 0, 2, 6, 6, 6, 2, 0, 0]],
  A: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 12, 0, 0, 0, 0], [0, 0, 0, 2, 0, 2, 0, 0, 0]],
  B: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, -2, 0, 0, 0, -2, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [-2, 0, 0, 0, 12, 0, 0, 0, -2], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 2, 0, 0, 0, 2, 0, 0]],
  K: [[0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, -8, -8, -8, 0, 0, 0], [0, 0, 0, -4, -4, -4, 0, 0, 0], [0, 0, 0, 4, 8, 4, 0, 0, 0]]
};
// Giá trị (vật chất + vị trí) của từng quân trên từng ô, tính sẵn.
const SCORE = {};
for (const p of 'KABNRCPkabnrcp') {
  const k = p.toUpperCase(), red = p === k;
  SCORE[p] = Array.from({ length: 90 }, (_, i) => VALUE[k] + T[k][red ? row(i) : 9 - row(i)][col(i)]);
}

// Zobrist 52 bit (hai nửa 21 + 31 bit) để làm khóa cho bảng chuyển vị.
let seed = 0x9e3779b9;
const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
const ZOB = {};
for (const p of 'KABNRCPkabnrcp') ZOB[p] = Array.from({ length: 90 }, () => [rand() & 0x1fffff, rand() & 0x7fffffff]);
const ZSIDE = [rand() & 0x1fffff, rand() & 0x7fffffff];

const MATE = 30000;
export const LEVELS = {
  de: { maxDepth: 2, timeMs: 300, randomness: 140 },
  vua: { maxDepth: 5, timeMs: 900, randomness: 12 },
  kho: { maxDepth: 12, timeMs: 2600, randomness: 0 }
};

export function evaluate(board, color) {
  let s = 0;
  for (let i = 0; i < 90; i++) { const p = board[i]; if (p) s += colorOf(p) === RED ? SCORE[p][i] : -SCORE[p][i]; }
  return color === RED ? s : -s;
}

export function search(fen, options = {}) {
  const { maxDepth = 5, timeMs = 900, randomness = 0, history = [] } = { ...options };
  const { board, turn } = parseFen(fen);
  const deadline = Date.now() + timeMs;
  let h1 = 0, h2 = 0;
  for (let i = 0; i < 90; i++) if (board[i]) { h1 ^= ZOB[board[i]][i][0]; h2 ^= ZOB[board[i]][i][1]; }
  if (turn !== RED) { h1 ^= ZSIDE[0]; h2 ^= ZSIDE[1]; }
  const tt = new Map(), killers = [], path = [];
  let nodes = 0, stopped = false;
  const hash = () => h1 * 2147483648 + h2;
  const toggle = (p, i) => { h1 ^= ZOB[p][i][0]; h2 ^= ZOB[p][i][1]; };
  const play = (from, to) => {
    const p = board[from], cap = board[to];
    toggle(p, from); toggle(p, to); if (cap) toggle(cap, to);
    h1 ^= ZSIDE[0]; h2 ^= ZSIDE[1];
    makeMove(board, from, to);
    return cap;
  };
  const back = (from, to, cap) => {
    unmakeMove(board, from, to, cap);
    const p = board[from];
    toggle(p, from); toggle(p, to); if (cap) toggle(cap, to);
    h1 ^= ZSIDE[0]; h2 ^= ZSIDE[1];
  };
  const order = (moves, ttMove, ply) => {
    const k = killers[ply] || [];
    return moves.map(m => {
      let s = 0;
      if (ttMove && m[0] === ttMove[0] && m[1] === ttMove[1]) s = 1e6;
      else if (board[m[1]]) s = 1e5 + VALUE[kind(board[m[1]])] * 10 - VALUE[kind(board[m[0]])];
      else if (k.some(x => x[0] === m[0] && x[1] === m[1])) s = 9e4;
      return [s, m];
    }).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  };
  const timeUp = () => { if ((++nodes & 1023) === 0 && Date.now() > deadline) stopped = true; return stopped; };

  function quiesce(color, alpha, beta, ply, qd) {
    if (timeUp()) return 0;
    const checked = inCheck(board, color);
    if (!checked) {
      const stand = evaluate(board, color);
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      if (qd >= 6) return stand;
    }
    let legal = 0;
    const moves = order(pseudoMoves(board, color).filter(m => checked || board[m[1]]), null, ply);
    for (const [from, to] of moves) {
      const cap = play(from, to);
      if (inCheck(board, color)) { back(from, to, cap); continue; }
      legal++;
      const score = -quiesce(other(color), -beta, -alpha, ply + 1, qd + 1);
      back(from, to, cap);
      if (stopped) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    if (checked && !legal) return -MATE + ply;
    return alpha;
  }

  function negamax(color, depth, alpha, beta, ply, ext) {
    if (timeUp()) return 0;
    const key = hash();
    if (ply > 0 && path.includes(key)) return 0; // lặp thế trong đường tìm: coi như hòa để khỏi đi vòng
    const checked = inCheck(board, color);
    if (checked && ext < 3) { depth++; ext++; }
    if (depth <= 0) return quiesce(color, alpha, beta, ply, 0);
    const entry = tt.get(key);
    if (entry && entry.depth >= depth && ply > 0) {
      if (entry.flag === 0) return entry.score;
      if (entry.flag === 1 && entry.score >= beta) return entry.score;
      if (entry.flag === -1 && entry.score <= alpha) return entry.score;
    }
    const alpha0 = alpha;
    let best = -Infinity, bestMove = null, legal = 0;
    path.push(key);
    for (const [from, to] of order(pseudoMoves(board, color), entry?.move, ply)) {
      const cap = play(from, to);
      if (inCheck(board, color)) { back(from, to, cap); continue; }
      legal++;
      const score = -negamax(other(color), depth - 1, -beta, -alpha, ply + 1, ext);
      back(from, to, cap);
      if (stopped) { path.pop(); return 0; }
      if (score > best) { best = score; bestMove = [from, to]; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!cap) { const k = killers[ply] || (killers[ply] = []); if (!k.some(x => x[0] === from && x[1] === to)) { k.unshift([from, to]); k.length = Math.min(k.length, 2); } }
        break;
      }
    }
    path.pop();
    if (!legal) return -MATE + ply; // cờ tướng: hết nước đi (bị bí hay không) đều thua
    if (tt.size > 400000) tt.clear();
    tt.set(key, { depth, score: best, flag: best <= alpha0 ? -1 : best >= beta ? 1 : 0, move: bestMove });
    return best;
  }

  // Nước gốc: lọc nước hợp lệ, tránh tạo thế lặp lần thứ ba trong ván.
  const seen = new Map();
  for (const k of history) seen.set(k, (seen.get(k) || 0) + 1);
  let roots = [];
  for (const [from, to] of pseudoMoves(board, turn)) {
    const cap = play(from, to);
    const ok = !inCheck(board, turn);
    const repeat = ok ? seen.get(positionKey(board, other(turn))) || 0 : 0;
    back(from, to, cap);
    if (ok) roots.push({ move: [from, to], repeat, score: -Infinity });
  }
  if (!roots.length) return null;
  const fresh = roots.filter(r => r.repeat < 2);
  if (fresh.length) roots = fresh;
  // Khai cuộc: vài nước quen thuộc để máy đi đa dạng (pháo đầu, thuận pháo, bình phong mã, phi tượng…).
  const plies = Math.max(0, history.length - 1);
  if (options.book !== false && plies < 2) {
    const firstKey = positionKey(parseFen(START_FEN).board, RED);
    const book = plies === 0 ? ['P2-5', 'P8-5', 'M2.3', 'T3.5', 'B7.1'] : history[0] === firstKey ? ['M8.7', 'M2.3', 'P8-5', 'P2-5', 'T7.5'] : [];
    const picks = roots.filter(r => book.includes(notation(board, r.move[0], r.move[1])));
    if (picks.length) { const r = picks[Math.floor(Math.random() * picks.length)]; return { from: r.move[0], to: r.move[1], score: 0, depth: 0, nodes: 0, book: true }; }
  }
  let best = roots[0], depthDone = 0;
  path.push(hash()); // thế gốc: nước nào quay lại đúng thế này coi như lặp
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -Infinity;
    const scored = [];
    const list = order(roots.map(r => r.move), best.move, 0).map(m => roots.find(r => r.move === m));
    for (const r of list) {
      const cap = play(r.move[0], r.move[1]);
      let score = -negamax(other(turn), depth - 1, -Infinity, alpha === -Infinity ? Infinity : -alpha + randomness, 1, 0);
      back(r.move[0], r.move[1], cap);
      if (stopped) break;
      score -= r.repeat * 30;
      r.score = score; scored.push(r);
      if (score > alpha) alpha = score;
    }
    if (stopped && depth > 1) break;
    if (scored.length) {
      const pool = randomness ? scored.map(r => ({ r, s: r.score + (Math.random() * 2 - 1) * randomness })) : scored.map(r => ({ r, s: r.score }));
      pool.sort((a, b) => b.s - a.s);
      best = pool[0].r; depthDone = depth;
    }
    if (stopped || Math.abs(best.score) > MATE - 100) break;
  }
  return { from: best.move[0], to: best.move[1], score: best.score, depth: depthDone, nodes };
}
