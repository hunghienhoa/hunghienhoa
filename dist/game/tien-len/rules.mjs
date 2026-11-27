// Tiến Lên Miền Nam (2–4 người, tính điểm cho vui, không cược). Dùng chung cho trình duyệt và phòng online.
// Lá bài = số 0..51: hạng = id>>2 (0 là 3 … 11 là A, 12 là 2), chất = id&3 (0 bích, 1 chuồn, 2 rô, 3 cơ). id lớn hơn = lá lớn hơn.
export const meta = { id: 'tien-len', name: 'Tiến Lên', seats: 4, minSeats: 2, turnMs: 30000 };
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUITS = ['♠', '♣', '♦', '♥'];
export const SUIT_NAMES = ['bích', 'chuồn', 'rô', 'cơ'];
export const rank = id => id >> 2, suit = id => id & 3;
export const cardName = id => `${RANKS[rank(id)]} ${SUIT_NAMES[suit(id)]}`;
const POINTS = { 2: [1, -1], 3: [2, 0, -2], 4: [3, 1, -1, -3] };
const TYPE_NAMES = { single: 'Rác', pair: 'Đôi', triple: 'Sám cô', quad: 'Tứ quý', straight: 'Sảnh', pairseq: 'Đôi thông' };
export const typeName = combo => (combo ? TYPE_NAMES[combo.type] + (combo.type === 'straight' ? ' ' + combo.len : combo.type === 'pairseq' ? ' ' + combo.len / 2 + ' đôi' : '') : '');

export function classify(cards) {
  const c = [...cards].sort((a, b) => a - b), n = c.length;
  if (!n || new Set(c).size !== n || c.some(x => !Number.isInteger(x) || x < 0 || x > 51)) return null;
  const r = c.map(rank), top = c[n - 1];
  if (n === 1) return { type: 'single', len: 1, top };
  if (r.every(x => x === r[0])) return n === 2 ? { type: 'pair', len: 2, top } : n === 3 ? { type: 'triple', len: 3, top } : n === 4 ? { type: 'quad', len: 4, top } : null;
  if (r[n - 1] === 12) return null; // sảnh, đôi thông không có 2
  if (n >= 3 && r.every((x, i) => i === 0 || x === r[i - 1] + 1)) return { type: 'straight', len: n, top };
  if (n >= 6 && n % 2 === 0) {
    let ok = true;
    for (let i = 0; i < n; i += 2) if (r[i] !== r[i + 1] || (i > 0 && r[i] !== r[i - 2] + 1)) ok = false;
    if (ok) return { type: 'pairseq', len: n, top };
  }
  return null;
}
// a có chặn được b (bài trên bàn) không.
export function beats(a, b) {
  if (!a) return false;
  if (!b) return true;
  const pairs = a.type === 'pairseq' ? a.len / 2 : 0;
  if (a.type === b.type && a.len === b.len) return a.top > b.top;
  if (b.type === 'single' && rank(b.top) === 12) return a.type === 'quad' || pairs >= 3;
  if (b.type === 'pair' && rank(b.top) === 12) return a.type === 'quad' || pairs >= 4;
  if (b.type === 'pairseq' && b.len === 6) return a.type === 'quad' || pairs >= 4;
  if (b.type === 'quad') return pairs >= 4;
  if (b.type === 'pairseq' && b.len >= 8) return a.type === 'pairseq' && a.len > b.len;
  return false;
}

function shuffle(rng) { const d = Array.from({ length: 52 }, (_, i) => i); for (let i = 51; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
// Tới trắng: tứ quý heo, sảnh rồng (3→A), 6 đôi, 5 đôi thông.
export function instantWin(hand) {
  const count = Array(13).fill(0); for (const id of hand) count[rank(id)]++;
  if (count[12] === 4) return 'Tứ quý heo';
  if (count.slice(0, 12).every(x => x > 0)) return 'Sảnh rồng';
  if (count.reduce((s, x) => s + Math.floor(x / 2), 0) >= 6) return 'Sáu đôi';
  for (let r = 0, run = 0; r < 12; r++) { run = count[r] >= 2 ? run + 1 : 0; if (run >= 5) return 'Năm đôi thông'; }
  return null;
}

export function setup(n, rng = Math.random, prev = null) {
  n = Math.max(2, Math.min(4, n | 0));
  const deck = shuffle(rng);
  const hands = Array.from({ length: n }, (_, i) => deck.slice(i * 13, i * 13 + 13).sort((a, b) => a - b));
  const lowest = Math.min(...hands.flat());
  const prevWinner = prev?.result?.ranking?.[0];
  const lead = Number.isInteger(prevWinner) && prevWinner < n ? prevWinner : hands.findIndex(h => h.includes(lowest));
  const s = { n, hands, turn: lead, table: null, passed: Array(n).fill(false), finished: [], mustInclude: Number.isInteger(prevWinner) ? null : lowest, last: null, result: null, moves: 0 };
  for (let k = 0; k < n; k++) {
    const seat = (lead + k) % n, why = instantWin(hands[seat]);
    if (why) { s.result = finish(s, [seat, ...Array.from({ length: n }, (_, i) => i).filter(i => i !== seat)], why); s.turn = -1; break; }
  }
  return s;
}
function finish(s, ranking, why = null) {
  const pts = POINTS[s.n];
  const instant = !!why;
  return { ranking, scores: ranking.map((seat, i) => ({ seat, delta: instant ? (i === 0 ? s.n - 1 : -1) : pts[i] })), reason: why || 'Hết bài' };
}
const done = (s, i) => s.finished.includes(i);
function advance(s, from) {
  for (let k = 1; k <= s.n; k++) {
    const i = (from + k) % s.n;
    if (s.table && i === s.table.by) { newRound(s, i); return; }
    if (!done(s, i) && !s.passed[i]) { s.turn = i; return; }
  }
  if (s.table) newRound(s, s.table.by);
}
function newRound(s, owner) {
  s.table = null; s.passed = Array(s.n).fill(false);
  if (!done(s, owner)) { s.turn = owner; return; }
  for (let k = 1; k <= s.n; k++) { const i = (owner + k) % s.n; if (!done(s, i)) { s.turn = i; return; } } // hưởng sái: người kế tiếp được đi
}
export const turn = s => (s.result ? -1 : s.turn);

export function apply(state, seat, action) {
  const s = structuredClone(state);
  if (s.result) throw new Error('Ván đã kết thúc.');
  if (seat !== s.turn) throw new Error('Chưa tới lượt bạn.');
  if (!action || typeof action !== 'object') throw new Error('Thao tác chưa hợp lệ.');
  if (action.type === 'pass') {
    if (!s.table) throw new Error('Bạn đang được đi tự do, hãy đánh một bộ bài.');
    s.passed[seat] = true; s.last = { seat, type: 'pass' }; s.moves++;
    advance(s, seat);
    return { state: s, events: [s.last] };
  }
  if (action.type !== 'play' || !Array.isArray(action.cards) || action.cards.length > 13) throw new Error('Thao tác chưa hợp lệ.');
  const cards = action.cards.map(Number), hand = s.hands[seat];
  if (cards.some(c => !hand.includes(c))) throw new Error('Bạn không có lá bài đó.');
  const combo = classify(cards);
  if (!combo) throw new Error('Bộ bài này không hợp lệ.');
  if (s.mustInclude !== null && !cards.includes(s.mustInclude)) throw new Error(`Nước đầu tiên phải có lá ${cardName(s.mustInclude)}.`);
  if (s.table && !beats(combo, s.table.combo)) throw new Error('Bộ bài này chưa chặn được bài trên bàn.');
  s.hands[seat] = hand.filter(c => !cards.includes(c));
  const chop = !!s.table && combo.type !== s.table.combo.type;
  s.table = { cards: [...cards].sort((a, b) => a - b), combo, by: seat };
  s.mustInclude = null; s.moves++;
  s.last = { seat, type: 'play', cards: s.table.cards, combo, chop };
  if (!s.hands[seat].length) s.finished.push(seat);
  const left = Array.from({ length: s.n }, (_, i) => i).filter(i => !done(s, i));
  if (left.length <= 1) { s.result = finish(s, [...s.finished, ...left]); s.turn = -1; return { state: s, events: [s.last] }; }
  advance(s, seat);
  return { state: s, events: [s.last] };
}

export function view(s, seat) {
  return {
    n: s.n, hand: seat >= 0 && seat < s.n ? s.hands[seat] : null, counts: s.hands.map(h => h.length), table: s.table, passed: s.passed,
    turn: turn(s), finished: s.finished, mustInclude: s.mustInclude, last: s.last, result: s.result, moves: s.moves,
    hands: s.result ? s.hands : undefined // hết ván thì lật bài còn lại
  };
}
export const result = s => s.result;

// ---------- Máy chơi ----------
const byRank = hand => { const m = new Map(); for (const id of [...hand].sort((a, b) => a - b)) { const r = rank(id); if (!m.has(r)) m.set(r, []); m.get(r).push(id); } return m; };
function choose(arr, k) { const out = []; const rec = (i, acc) => { if (acc.length === k) { out.push(acc.slice()); return; } for (let j = i; j < arr.length; j++) { acc.push(arr[j]); rec(j + 1, acc); acc.pop(); } }; rec(0, []); return out; }
export function combos(hand, type, len) {
  const g = byRank(hand), out = [];
  if (type === 'single') for (const id of hand) out.push([id]);
  else if (type === 'pair' || type === 'triple' || type === 'quad') { const k = { pair: 2, triple: 3, quad: 4 }[type]; for (const ids of g.values()) if (ids.length >= k) out.push(...choose(ids, k)); }
  else if (type === 'straight') {
    for (let r = 0; r + len - 1 < 12; r++) {
      if (![...Array(len)].every((_, i) => g.has(r + i))) continue;
      const base = [...Array(len - 1)].map((_, i) => g.get(r + i)[0]);
      for (const t of g.get(r + len - 1)) out.push([...base, t]);
    }
  } else if (type === 'pairseq') {
    const p = len / 2;
    for (let r = 0; r + p - 1 < 12; r++) {
      if (![...Array(p)].every((_, i) => (g.get(r + i) || []).length >= 2)) continue;
      const base = [...Array(p - 1)].flatMap((_, i) => g.get(r + i).slice(0, 2));
      for (const pr of choose(g.get(r + p - 1), 2)) out.push([...base, ...pr]);
    }
  }
  return out;
}
function allCombos(hand) {
  const out = [];
  for (const t of ['single', 'pair', 'triple', 'quad']) out.push(...combos(hand, t));
  for (let L = 3; L <= 12; L++) out.push(...combos(hand, 'straight', L));
  for (let P = 3; P <= 6; P++) out.push(...combos(hand, 'pairseq', P * 2));
  return out;
}
// Điểm "tiếc" khi tách bộ: lá thuộc đôi/sám/tứ quý hoặc là 2 thì giữ lại.
function cost(hand, cards) {
  const g = byRank(hand);
  let c = 0;
  for (const id of cards) { const k = g.get(rank(id)).length; if (rank(id) === 12) c += 30; if (k >= 2 && cards.filter(x => rank(x) === rank(id)).length < k) c += 6 * k; }
  return c + Math.max(...cards) / 10;
}
export function bot(s, seat, rng = Math.random, level = 'vua') {
  const hand = s.hands[seat];
  const opponentsLow = s.hands.some((h, i) => i !== seat && !s.finished.includes(i) && h.length <= 3);
  const nextSeat = (() => { for (let k = 1; k < s.n; k++) { const i = (seat + k) % s.n; if (!s.finished.includes(i)) return i; } return -1; })();
  if (!s.table) {
    let options = allCombos(hand).filter(c => s.mustInclude === null || c.includes(s.mustInclude));
    if (!options.length) return { type: 'play', cards: [hand[0]] };
    if (level === 'de') return { type: 'play', cards: options[Math.floor(rng() * options.length)] };
    const finishing = options.find(c => c.length === hand.length && classify(c));
    if (finishing) return { type: 'play', cards: finishing };
    const safe = options.filter(c => !c.some(id => rank(id) === 12) && classify(c).type !== 'quad');
    if (safe.length) options = safe;
    const lowest = Math.min(...hand);
    const withLow = options.filter(c => c.includes(lowest));
    if (withLow.length && !(nextSeat >= 0 && s.hands[nextSeat].length === 1)) options = withLow;
    if (nextSeat >= 0 && s.hands[nextSeat].length === 1) { const multi = options.filter(c => c.length > 1); if (multi.length) options = multi; else options = [[Math.max(...hand)]]; }
    options.sort((a, b) => (b.length - a.length) || (cost(hand, a) - cost(hand, b)));
    return { type: 'play', cards: options[0] };
  }
  const t = s.table.combo;
  let options = [];
  if (['single', 'pair', 'triple', 'quad'].includes(t.type)) options = combos(hand, t.type);
  else options = combos(hand, t.type, t.len);
  options.push(...combos(hand, 'quad'), ...[3, 4, 5, 6].flatMap(p => combos(hand, 'pairseq', p * 2)));
  options = options.filter(c => beats(classify(c), t));
  const uniq = new Map(); for (const c of options) uniq.set(c.slice().sort((a, b) => a - b).join(','), c); options = [...uniq.values()];
  if (!options.length) return { type: 'pass' };
  if (level === 'de') return rng() < 0.3 ? { type: 'pass' } : { type: 'play', cards: options[Math.floor(rng() * options.length)] };
  const winNow = options.find(c => c.length === hand.length);
  if (winNow) return { type: 'play', cards: winNow };
  const bomb = c => { const k = classify(c); return k.type === 'quad' || k.type === 'pairseq'; };
  const urgent = opponentsLow || hand.length <= 4 || rank(t.top) === 12;
  let pool = options.filter(c => (!bomb(c) || t.type === 'pairseq' || urgent) && (!c.some(id => rank(id) === 12) || urgent || t.type === 'single' && rank(t.top) >= 10));
  if (!pool.length) return { type: 'pass' };
  pool.sort((a, b) => cost(hand, a) - cost(hand, b));
  // Đỡ bài nhỏ mà phải phá đôi/2 thì thà bỏ lượt khi chưa gấp.
  if (!urgent && cost(hand, pool[0]) > 25 && s.table.by !== nextSeat) return { type: 'pass' };
  return { type: 'play', cards: pool[0] };
}
export const auto = (s, seat, rng) => bot(s, seat, rng, 'vua');
