// Cờ cá ngựa (2–4 người) theo luật quen thuộc ở Việt Nam:
// - Đổ 1 hoặc 6 mới được xuất quân; đổ 6 được đổ thêm lượt.
// - Ngựa đi đúng số nút, không được nhảy qua đầu ngựa khác, không đứng chồng lên ngựa nhà; đứng đúng ô ngựa địch thì đá ngựa đó về chuồng.
// - Phải dừng đúng cửa chuồng rồi mới lên chuồng: từ cửa đổ ra số nào lên ô số đó (không nhảy qua ngựa trong chuồng);
//   trong chuồng muốn lên ô k+1 phải đổ đúng k+1. Ai đưa đủ 4 ngựa vào chuồng trước thì thắng.
// Bàn 15×15: đường đua 52 ô (13 ô mỗi cánh), mỗi màu một cánh. Vị trí ngựa: -1 trong chuồng xuất phát, 0..50 trên đường (50 là cửa chuồng), 101..106 trong chuồng đích.
export const meta = { id: 'ca-ngua', name: 'Cờ Cá Ngựa', seats: 4, minSeats: 2, turnMs: 20000 };
export const COLORS = ['Đỏ', 'Xanh', 'Vàng', 'Lục'];
export const GATE = 50, TRACK = 52;
const ARM = [2, 3, 0, 1]; // màu 0 ở cánh dưới, 1 trái, 2 trên, 3 phải (đi theo chiều kim đồng hồ)
export const startOf = color => (8 + 13 * ARM[color]) % TRACK;
export const absolute = (color, p) => (startOf(color) + p) % TRACK;
export const colorsFor = n => (n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3]);

// Toạ độ ô trên bàn 15×15 (hàng, cột) để vẽ.
export const PATH = (() => {
  const p = [];
  for (let r = 5; r >= 0; r--) p.push([r, 6]); p.push([0, 7]); for (let r = 0; r <= 5; r++) p.push([r, 8]);
  for (let c = 9; c <= 14; c++) p.push([6, c]); p.push([7, 14]); for (let c = 14; c >= 9; c--) p.push([8, c]);
  for (let r = 9; r <= 14; r++) p.push([r, 8]); p.push([14, 7]); for (let r = 14; r >= 9; r--) p.push([r, 6]);
  for (let c = 5; c >= 0; c--) p.push([8, c]); p.push([7, 0]); for (let c = 0; c <= 5; c++) p.push([6, c]);
  return p;
})();
const rot = ([r, c], k) => { for (let i = 0; i < k; i++) [r, c] = [c, 14 - r]; return [r, c]; };
export const homeCell = (color, h) => rot(h <= 5 ? [h, 7] : [6, 7], ARM[color]);
export const stableCells = color => [[1, 10], [1, 12], [3, 10], [3, 12]].map(x => rot(x, ARM[color]));
export const stableArea = color => { const [r, c] = rot([0, 9], ARM[color]), [r2, c2] = rot([5, 14], ARM[color]); return [Math.min(r, r2), Math.min(c, c2), Math.max(r, r2), Math.max(c, c2)]; };
export function cellOf(color, pos, horse) {
  if (pos < 0) return stableCells(color)[horse];
  if (pos >= 101) return homeCell(color, pos - 100);
  return PATH[absolute(color, pos)];
}

export function setup(n, rng = Math.random, prev = null) {
  n = Math.max(2, Math.min(4, n | 0));
  const colors = colorsFor(n);
  const prevWinner = prev?.result?.ranking?.[0];
  return { n, colors, horses: colors.map(() => [-1, -1, -1, -1]), turn: Number.isInteger(prevWinner) && prevWinner < n ? prevWinner : 0, phase: 'roll', dice: 0, sixes: 0, last: null, result: null, moves: 0 };
}
export const turn = s => (s.result ? -1 : s.turn);

// Ai đang đứng ở ô tuyệt đối `a` trên đường đua.
function occupant(s, a) {
  for (let seat = 0; seat < s.n; seat++) for (let h = 0; h < 4; h++) { const p = s.horses[seat][h]; if (p >= 0 && p <= GATE && absolute(s.colors[seat], p) === a) return { seat, h }; }
  return null;
}
export function legalMoves(s, seat = s.turn, d = s.dice) {
  if (!d) return [];
  const out = [], mine = s.horses[seat], color = s.colors[seat];
  for (let h = 0; h < 4; h++) {
    const p = mine[h];
    if (p < 0) {
      if (d !== 1 && d !== 6) continue;
      const o = occupant(s, startOf(color));
      if (o && o.seat === seat) continue;
      out.push({ h, to: 0, kick: o });
    } else if (p <= GATE) {
      if (p === GATE) {
        if (mine.includes(100 + d) || [...Array(d - 1)].some((_, i) => mine.includes(101 + i))) continue;
        out.push({ h, to: 100 + d, kick: null });
        continue;
      }
      if (p + d > GATE) continue;
      let blocked = false;
      for (let k = 1; k < d; k++) if (occupant(s, absolute(color, p + k))) { blocked = true; break; }
      if (blocked) continue;
      const o = occupant(s, absolute(color, p + d));
      if (o && o.seat === seat) continue;
      out.push({ h, to: p + d, kick: o });
    } else {
      const cell = p - 100;
      if (d === cell + 1 && cell < 6 && !mine.includes(p + 1)) out.push({ h, to: p + 1, kick: null });
    }
  }
  return out;
}
function nextTurn(s, again) {
  if (again) { s.phase = 'roll'; return; }
  s.turn = (s.turn + 1) % s.n; s.phase = 'roll'; s.sixes = 0;
}
export function apply(state, seat, action, rng = Math.random) {
  const s = structuredClone(state);
  if (s.result) throw new Error('Ván đã kết thúc.');
  if (seat !== s.turn) throw new Error('Chưa tới lượt bạn.');
  if (!action || typeof action !== 'object') throw new Error('Thao tác chưa hợp lệ.');
  s.moves++;
  if (action.type === 'roll') {
    if (s.phase !== 'roll') throw new Error('Hãy chọn ngựa để đi.');
    s.dice = 1 + Math.floor(rng() * 6);
    if (s.dice === 6) s.sixes++;
    const moves = legalMoves(s, seat);
    s.last = { seat, type: 'roll', dice: s.dice, stuck: !moves.length };
    if (!moves.length) { const d = s.dice; s.dice = 0; nextTurn(s, d === 6 && s.sixes < 3); }
    else s.phase = 'move';
    return { state: s, events: [s.last] };
  }
  if (action.type !== 'move' || s.phase !== 'move') throw new Error('Hãy đổ xúc xắc trước.');
  const mv = legalMoves(s, seat).find(m => m.h === Number(action.horse));
  if (!mv) throw new Error('Con ngựa này chưa đi được với số vừa đổ.');
  const from = s.horses[seat][mv.h];
  s.horses[seat][mv.h] = mv.to;
  if (mv.kick) s.horses[mv.kick.seat][mv.kick.h] = -1;
  const d = s.dice;
  s.last = { seat, type: 'move', horse: mv.h, from, to: mv.to, dice: d, kick: mv.kick };
  s.dice = 0;
  if (s.horses[seat].every(p => p >= 101)) {
    const order = [seat, ...Array.from({ length: s.n }, (_, i) => i).filter(i => i !== seat).sort((a, b) => progress(s, b) - progress(s, a))];
    s.result = { ranking: order, scores: order.map((x, i) => ({ seat: x, delta: i === 0 ? s.n - 1 : -1 })), reason: 'Đủ 4 ngựa lên chuồng' };
    s.turn = -1;
    return { state: s, events: [s.last] };
  }
  nextTurn(s, d === 6 && s.sixes < 3);
  return { state: s, events: [s.last] };
}
const progress = (s, seat) => s.horses[seat].reduce((t, p) => t + (p < 0 ? 0 : p >= 101 ? 60 + p - 100 : p + 1), 0);
export function view(s, seat) { return { ...s, you: seat }; }
export const result = s => s.result;

// Máy: đá ngựa > lên chuồng > xuất quân > tránh đứng trước mũi ngựa địch > đi con xa nhất.
export function bot(s, seat, rng = Math.random, level = 'vua') {
  if (s.phase === 'roll') return { type: 'roll' };
  const moves = legalMoves(s, seat);
  if (!moves.length) return { type: 'roll' };
  if (level === 'de') return { type: 'move', horse: moves[Math.floor(rng() * moves.length)].h };
  const color = s.colors[seat];
  const danger = to => {
    if (to > GATE || to === 0) return 0;
    const a = absolute(color, to);
    let risk = 0;
    for (let o = 0; o < s.n; o++) { if (o === seat) continue; for (const p of s.horses[o]) { if (p < 0 || p > GATE) continue; const dist = (a - absolute(s.colors[o], p) + TRACK) % TRACK; if (dist >= 1 && dist <= 6) risk += 1; } }
    return risk;
  };
  const score = m => {
    const from = s.horses[seat][m.h];
    let v = 0;
    if (m.kick) v += 120;
    if (m.to >= 101) v += 90 + m.to;
    if (from < 0) v += 70;
    if (from >= 0 && from <= GATE) v += danger(from) * 18; // đang bị đe dọa thì nên chạy
    v -= danger(m.to) * 22;
    if (m.to === GATE) v += 40;
    v += Math.min(m.to, GATE) * 0.6;
    return v + rng() * 2;
  };
  moves.sort((a, b) => score(b) - score(a));
  return { type: 'move', horse: moves[0].h };
}
export const auto = (s, seat, rng) => bot(s, seat, rng, 'vua');
