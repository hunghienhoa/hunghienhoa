// Ô ăn quan (2 người). Bàn 12 ô theo vòng: 0 là ô quan trái, 1..5 là 5 ô dân của người chơi 0 (hàng dưới, trái → phải),
// 6 là ô quan phải, 7..11 là 5 ô dân của người chơi 1 (hàng trên, phải → trái). Mỗi ô dân 5 quân, mỗi ô quan 1 quan (tính 10 điểm).
// Luật: chọn một ô dân bên mình và một chiều, bốc hết quân rải mỗi ô một quân. Rải xong:
//  - ô kế tiếp có dân (không phải ô quan còn quân) thì bốc lên rải tiếp;
//  - ô kế tiếp là ô quan còn quân thì mất lượt;
//  - ô kế tiếp trống mà ô sau đó có quân thì ăn hết ô đó; cứ cách một ô trống lại có quân thì ăn tiếp (ăn liền);
//  - hai ô trống liền nhau thì mất lượt.
// Tới lượt mà 5 ô dân bên mình trống thì lấy 5 quân đã ăn rải lại (thiếu thì vay đối thủ, hết ván trả lại).
// Hai ô quan đều hết quân thì "hết quan, tàn dân, thu quân, kéo về": dân còn bên nào về bên đó. Ai nhiều điểm hơn thắng.
export const meta = { id: 'o-an-quan', name: 'Ô Ăn Quan', seats: 2, minSeats: 2, turnMs: 40000 };
export const QUAN = [0, 6], QUAN_VALUE = 10;
export const sideOf = seat => (seat === 0 ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11]);
const isQuan = i => i === 0 || i === 6;
const wrap = i => (i + 12) % 12;

export function setup(n = 2, rng = Math.random, prev = null) {
  const prevWinner = prev?.result?.ranking?.[0];
  const loser = Number.isInteger(prevWinner) && prev?.result?.reason !== 'Hòa' ? 1 - prevWinner : 0; // ván sau người thua đi trước
  const s = { n: 2, small: Array.from({ length: 12 }, (_, i) => (isQuan(i) ? 0 : 5)), big: Array.from({ length: 12 }, (_, i) => (isQuan(i) ? 1 : 0)),
    captured: [{ small: 0, big: 0 }, { small: 0, big: 0 }], debt: [0, 0], turn: loser, last: null, result: null, moves: 0 };
  prepare(s);
  return s;
}
export const turn = s => (s.result ? -1 : s.turn);
const stones = (s, i) => s.small[i] + s.big[i];
export const points = (s, seat) => s.captured[seat].small + s.captured[seat].big * QUAN_VALUE;

// Đầu lượt: bên mình hết dân thì rải lại 5 quân (vay nếu thiếu). Hai bên đều không còn gì thì kết thúc.
function prepare(s) {
  if (s.result) return;
  if (QUAN.every(i => stones(s, i) === 0)) return end(s);
  const side = sideOf(s.turn);
  if (side.some(i => s.small[i] > 0)) return;
  const me = s.captured[s.turn], op = s.captured[1 - s.turn];
  const need = 5 - Math.min(5, me.small);
  if (need > op.small) return end(s); // không đủ quân để rải lại
  me.small += need; op.small -= need; s.debt[s.turn] += need;
  me.small -= 5;
  for (const i of side) s.small[i] = 1;
  s.last = { ...(s.last || {}), refill: { seat: s.turn, borrowed: need } };
}
function end(s) {
  for (const seat of [0, 1]) for (const i of sideOf(seat)) { s.captured[seat].small += s.small[i]; s.small[i] = 0; }
  for (const i of QUAN) { /* quân còn trong ô quan (nếu có) không thuộc ai */ s.small[i] = 0; }
  for (const seat of [0, 1]) if (s.debt[seat]) { const pay = s.debt[seat]; s.captured[seat].small -= pay; s.captured[1 - seat].small += pay; s.debt[seat] = 0; }
  const a = points(s, 0), b = points(s, 1);
  const ranking = a >= b ? [0, 1] : [1, 0];
  s.result = { ranking, scores: a === b ? [{ seat: 0, delta: 0 }, { seat: 1, delta: 0 }] : [{ seat: ranking[0], delta: 1 }, { seat: ranking[1], delta: -1 }], points: [a, b], reason: a === b ? 'Hòa' : 'Hết quan, tàn dân' };
  s.turn = -1;
}

// Chạy một nước trên bản sao, ghi lại từng bước để giao diện diễn hoạt.
export function play(s, seat, pit, dir) {
  const steps = [];
  let pos = pit, hand = s.small[pit];
  s.small[pit] = 0; steps.push({ k: 'pick', i: pit, n: hand });
  for (let guard = 0; guard < 400; guard++) {
    while (hand > 0) { pos = wrap(pos + dir); s.small[pos]++; hand--; steps.push({ k: 'drop', i: pos }); }
    const next = wrap(pos + dir);
    if (isQuan(next) && stones(s, next) > 0) { steps.push({ k: 'stop', i: next }); break; }
    if (stones(s, next) > 0) { hand = s.small[next]; s.small[next] = 0; pos = next; steps.push({ k: 'pick', i: next, n: hand }); continue; }
    // ô kế tiếp trống: xét ăn
    let gap = next, ate = false;
    while (true) {
      const target = wrap(gap + dir);
      if (stones(s, target) === 0) break;
      const got = { small: s.small[target], big: s.big[target] };
      s.captured[seat].small += got.small; s.captured[seat].big += got.big;
      s.small[target] = 0; s.big[target] = 0; ate = true;
      steps.push({ k: 'take', i: target, ...got });
      gap = wrap(target + dir);
      if (stones(s, gap) > 0) break; // ô sau đó có quân: dừng ăn
    }
    if (!ate) steps.push({ k: 'stop', i: next });
    break;
  }
  return steps;
}
export function legalMoves(s, seat = s.turn) {
  if (s.result || seat !== s.turn) return [];
  return sideOf(seat).filter(i => s.small[i] > 0).flatMap(i => [{ pit: i, dir: 1 }, { pit: i, dir: -1 }]);
}
export function apply(state, seat, action) {
  const s = structuredClone(state);
  if (s.result) throw new Error('Ván đã kết thúc.');
  if (seat !== s.turn) throw new Error('Chưa tới lượt bạn.');
  const pit = Number(action?.pit), dir = Number(action?.dir);
  if (!sideOf(seat).includes(pit) || (dir !== 1 && dir !== -1)) throw new Error('Hãy chọn một ô dân bên bạn và một chiều rải.');
  if (!s.small[pit]) throw new Error('Ô này không còn quân.');
  const steps = play(s, seat, pit, dir);
  s.moves++;
  s.last = { seat, type: 'move', pit, dir, steps };
  s.turn = 1 - seat;
  prepare(s);
  return { state: s, events: [s.last] };
}
export function view(s, seat) { return { ...s, you: seat }; }
export const result = s => s.result;

// Máy: minimax theo chênh lệch điểm (ăn quan được ưu tiên vì quan 10 điểm).
function evaluate(s, seat) {
  if (s.result) { const p = s.result.points; return (p[seat] - p[1 - seat]) * 10 + (p[seat] > p[1 - seat] ? 1000 : p[seat] < p[1 - seat] ? -1000 : 0); }
  const mine = sideOf(seat).reduce((t, i) => t + s.small[i], 0), theirs = sideOf(1 - seat).reduce((t, i) => t + s.small[i], 0);
  return (points(s, seat) - points(s, 1 - seat)) * 10 + (mine - theirs) * 3 - (s.debt[seat] - s.debt[1 - seat]) * 10;
}
function search(s, me, depth, alpha, beta) {
  if (depth === 0 || s.result) return evaluate(s, me);
  const moves = legalMoves(s);
  if (!moves.length) return evaluate(s, me);
  const maxing = s.turn === me;
  let best = maxing ? -Infinity : Infinity;
  for (const m of moves) {
    const v = search(apply(s, s.turn, m).state, me, depth - 1, alpha, beta);
    if (maxing) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}
export function bot(s, seat, rng = Math.random, level = 'vua') {
  const moves = legalMoves(s, seat);
  if (!moves.length) return null;
  if (level === 'de' && rng() < 0.5) return moves[Math.floor(rng() * moves.length)];
  const depth = level === 'kho' ? 5 : level === 'de' ? 1 : 3;
  let best = null, bestV = -Infinity;
  for (const m of moves) {
    const v = search(apply(s, seat, m).state, seat, depth - 1, -Infinity, Infinity) + rng() * 2;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
export const auto = (s, seat, rng) => bot(s, seat, rng, 'vua');
