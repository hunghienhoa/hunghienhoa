// Phỏm (Tá lả, miền Bắc) 2–4 người. Tính điểm cho vui, không cược. Dùng chung cho trình duyệt và phòng online.
// Lá bài = 0..51: điểm = (id>>2)+1 (A=1 … K=13), chất = id&3 (0 bích, 1 chuồn, 2 rô, 3 cơ).
// Phỏm: từ 3 lá cùng số, hoặc từ 3 lá cùng chất liên tiếp (A chỉ đứng đầu, không vòng K-A).
// Luật: mỗi người 9 lá, người cầm cái 10 lá và đánh trước. Tới lượt: ăn lá người trước vừa đánh (nếu ghép được phỏm
// với 2 lá trên tay, mỗi phỏm chỉ một lá ăn, lá đã ăn và phỏm của nó bị khóa) hoặc bốc nọc, rồi đánh một lá.
// Mỗi người đánh đủ 4 lá thì hạ: tự xếp phỏm tốt nhất, người hạ sau được gửi lá vào phỏm đã hạ. Ít điểm rác nhất về nhất;
// không có phỏm nào là móm (xếp cuối). Bài trên tay đủ phỏm ngay khi vừa ăn/bốc là ù, thắng luôn.
export const meta = { id: 'phom', name: 'Phỏm', seats: 4, minSeats: 2, turnMs: 30000 };
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♣', '♦', '♥'];
export const SUIT_NAMES = ['bích', 'chuồn', 'rô', 'cơ'];
export const value = id => (id >> 2) + 1, suit = id => id & 3;
export const cardName = id => `${RANKS[value(id) - 1]} ${SUIT_NAMES[suit(id)]}`;
export const ROUNDS = 4;

export function isMeld(cards) {
  if (!cards || cards.length < 3 || new Set(cards).size !== cards.length) return false;
  const v = cards.map(value);
  if (v.every(x => x === v[0])) return true;
  if (!cards.every(c => suit(c) === suit(cards[0]))) return false;
  const s = v.slice().sort((a, b) => a - b);
  return s.every((x, i) => i === 0 || x === s[i - 1] + 1);
}
// Mọi phỏm có thể tạo từ một tập lá (bộ 3–4 cùng số, dây cùng chất từ 3 lá).
export function candidateMelds(cards) {
  const out = [], byVal = new Map(), bySuit = [[], [], [], []];
  for (const c of cards) { if (!byVal.has(value(c))) byVal.set(value(c), []); byVal.get(value(c)).push(c); bySuit[suit(c)].push(c); }
  for (const g of byVal.values()) {
    if (g.length >= 3) for (let mask = 0; mask < 1 << g.length; mask++) { const pick = g.filter((_, i) => mask & (1 << i)); if (pick.length >= 3) out.push(pick); }
  }
  for (const g of bySuit) {
    const sorted = g.slice().sort((a, b) => value(a) - value(b));
    for (let i = 0; i < sorted.length; i++) {
      const run = [sorted[i]];
      for (let j = i + 1; j < sorted.length && value(sorted[j]) === value(run[run.length - 1]) + 1; j++) { run.push(sorted[j]); if (run.length >= 3) out.push(run.slice()); }
    }
  }
  return out;
}
// Xếp bài tốt nhất: giữ các phỏm đã khóa, chọn thêm phỏm từ lá tự do sao cho tổng điểm rác nhỏ nhất.
export function arrange(hand, locked = []) {
  const lockedCards = new Set(locked.flat());
  const free = hand.filter(c => !lockedCards.has(c));
  const cands = candidateMelds(free);
  let best = { melds: [], dead: free.slice(), points: free.reduce((t, c) => t + value(c), 0) };
  const used = new Set();
  const dfs = (start, melds) => {
    const dead = free.filter(c => !used.has(c)), points = dead.reduce((t, c) => t + value(c), 0);
    if (points < best.points || (points === best.points && melds.length > best.melds.length)) best = { melds: melds.map(m => m.slice()), dead, points };
    for (let i = start; i < cands.length; i++) {
      const m = cands[i];
      if (m.some(c => used.has(c))) continue;
      m.forEach(c => used.add(c)); melds.push(m);
      dfs(i + 1, melds);
      melds.pop(); m.forEach(c => used.delete(c));
    }
  };
  dfs(0, []);
  return { melds: [...locked.map(m => m.slice()), ...best.melds], dead: best.dead.sort((a, b) => a - b), points: best.points };
}
// Các cách ăn lá `card`: 2+ lá tự do trên tay ghép với nó thành phỏm.
export function eatOptions(hand, locked, card) {
  const lockedCards = new Set(locked.flat());
  const free = hand.filter(c => !lockedCards.has(c));
  return candidateMelds([...free, card]).filter(m => m.includes(card));
}
function shuffle(rng) { const d = Array.from({ length: 52 }, (_, i) => i); for (let i = 51; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }

export function setup(n, rng = Math.random, prev = null) {
  n = Math.max(2, Math.min(4, n | 0));
  const deck = shuffle(rng);
  const winner = prev?.result?.ranking?.[0];
  const dealer = Number.isInteger(winner) && winner < n ? winner : 0;
  const hands = Array.from({ length: n }, () => []);
  for (let k = 0; k < 9 * n + 1; k++) hands[(dealer + k) % n].push(deck.pop());
  hands.forEach(h => h.sort((a, b) => a - b));
  const s = { n, dealer, hands, locked: hands.map(() => []), eaten: hands.map(() => []), discards: hands.map(() => []), pile: deck, turn: dealer, phase: 'discard',
    lastDiscard: null, discCount: Array(n).fill(0), bonus: Array(n).fill(0), last: null, result: null, moves: 0 };
  if (uCheck(hands[dealer], []) !== null) { s.last = { seat: dealer, type: 'deal', u: true }; showdown(s, dealer); } // cái ù ngay khi chia
  return s;
}
export const turn = s => (s.result ? -1 : s.turn);
const prevSeat = (s, seat) => (seat - 1 + s.n) % s.n;
export function canEat(s, seat = s.turn) {
  if (s.result || s.phase !== 'take' || seat !== s.turn || !s.lastDiscard || s.lastDiscard.by !== prevSeat(s, seat)) return [];
  return eatOptions(s.hands[seat], s.locked[seat], s.lastDiscard.card);
}
// Ù: sau khi ăn/bốc (10 lá), bỏ một lá mà 9 lá còn lại đều nằm trong phỏm.
export function uCheck(hand, locked) {
  for (const c of hand) {
    if (locked.flat().includes(c)) continue;
    const rest = hand.filter(x => x !== c);
    if (arrange(rest, locked).dead.length === 0) return c;
  }
  return null;
}
export function apply(state, seat, action) {
  const s = structuredClone(state);
  if (s.result) throw new Error('Ván đã kết thúc.');
  if (seat !== s.turn) throw new Error('Chưa tới lượt bạn.');
  if (!action || typeof action !== 'object') throw new Error('Thao tác chưa hợp lệ.');
  s.moves++;
  if (action.type === 'draw' || action.type === 'eat') {
    if (s.phase !== 'take') throw new Error('Bạn đã lấy bài rồi, hãy đánh một lá.');
    if (action.type === 'draw') {
      if (!s.pile.length) throw new Error('Nọc đã hết bài.');
      const card = s.pile.pop();
      s.hands[seat].push(card);
      s.last = { seat, type: 'draw' };
    } else {
      const options = canEat(s, seat);
      if (!options.length) throw new Error('Lá này chưa ghép được phỏm với bài của bạn.');
      let meld = options[0];
      if (Array.isArray(action.with)) { const want = options.find(m => m.length === action.with.length + 1 && action.with.every(c => m.includes(c))); if (!want) throw new Error('Các lá chọn chưa ghép được phỏm với lá ăn.'); meld = want; }
      else { // chọn cách ăn để phần bài còn lại ít điểm rác nhất
        let bestPts = Infinity;
        for (const m of options) { const pts = arrange([...s.hands[seat], s.lastDiscard.card], [...s.locked[seat], m]).points; if (pts < bestPts) { bestPts = pts; meld = m; } }
      }
      const card = s.lastDiscard.card, from = s.lastDiscard.by;
      s.discards[from] = s.discards[from].filter(c => c !== card);
      s.hands[seat].push(card); s.locked[seat].push(meld.slice().sort((a, b) => a - b)); s.eaten[seat].push(card);
      s.bonus[seat] += 1; s.bonus[from] -= 1;
      s.last = { seat, type: 'eat', card, from, meld };
      s.lastDiscard = null;
    }
    s.hands[seat].sort((a, b) => a - b);
    s.phase = 'discard';
    const u = uCheck(s.hands[seat], s.locked[seat]);
    if (u !== null) { s.last.u = true; showdown(s, seat); }
    return { state: s, events: [s.last] };
  }
  if (action.type !== 'discard' || s.phase !== 'discard') throw new Error('Hãy ăn hoặc bốc bài trước.');
  const card = Number(action.card);
  if (!s.hands[seat].includes(card)) throw new Error('Bạn không có lá bài đó.');
  if (s.locked[seat].flat().includes(card)) throw new Error('Lá này nằm trong phỏm đã ăn, không đánh được.');
  s.hands[seat] = s.hands[seat].filter(c => c !== card);
  s.discards[seat].push(card); s.discCount[seat]++;
  s.lastDiscard = { card, by: seat };
  s.last = { seat, type: 'discard', card };
  if (s.discCount.every(x => x >= ROUNDS)) { showdown(s, null); return { state: s, events: [s.last] }; }
  s.turn = (seat + 1) % s.n; s.phase = 'take';
  if (!s.pile.length && !canEat(s).length) showdown(s, null); // phòng hờ nọc hết sớm
  return { state: s, events: [s.last] };
}
// Hạ bài: thứ tự từ người sau cái; người sau được gửi lá rác vào phỏm của người hạ trước.
function showdown(s, uSeat) {
  const order = Array.from({ length: s.n }, (_, k) => (s.dealer + 1 + k) % s.n);
  const shown = [], table = {};
  for (const seat of order) {
    let hand = s.hands[seat];
    if (seat === uSeat) { const out = uCheck(hand, s.locked[seat]); hand = hand.filter(c => c !== out); }
    const a = arrange(hand, s.locked[seat]);
    const sent = [];
    if (seat !== uSeat) {
      let moved = true;
      while (moved) {
        moved = false;
        for (const c of a.dead) for (const m of shown) if (isMeld([...m.cards, c])) { m.cards.push(c); a.dead = a.dead.filter(x => x !== c); a.points -= value(c); sent.push(c); moved = true; break; }
      }
    }
    a.melds.forEach(cards => shown.push({ seat, cards }));
    table[seat] = { melds: a.melds, dead: a.dead, points: a.points, sent, mom: a.melds.length === 0 };
  }
  let ranking;
  if (uSeat !== null) ranking = [uSeat, ...order.filter(x => x !== uSeat)];
  else {
    const ok = order.filter(x => !table[x].mom).sort((a, b) => table[a].points - table[b].points || order.indexOf(a) - order.indexOf(b));
    const mom = order.filter(x => table[x].mom).sort((a, b) => table[a].points - table[b].points);
    ranking = [...ok, ...mom];
  }
  const delta = Array(s.n).fill(0);
  if (uSeat !== null) { for (const x of order) if (x !== uSeat) { delta[x] -= 5; delta[uSeat] += 5; } }
  else ranking.forEach((x, i) => { if (i === 0) return; const pay = table[x].mom ? 4 : i; delta[x] -= pay; delta[ranking[0]] += pay; });
  s.bonus.forEach((b, i) => { delta[i] += b; });
  s.result = { ranking, table, u: uSeat, scores: delta.map((d, seat) => ({ seat, delta: d })), reason: uSeat !== null ? 'Ù' : 'Hạ bài' };
  s.turn = -1;
}
export function view(s, seat) {
  const mine = seat >= 0 && seat < s.n;
  return { n: s.n, dealer: s.dealer, hand: mine ? s.hands[seat] : null, counts: s.hands.map(h => h.length), locked: s.locked, eaten: s.eaten, discards: s.discards,
    pile: s.pile.length, turn: turn(s), phase: s.phase, lastDiscard: s.lastDiscard, discCount: s.discCount, bonus: s.bonus, last: s.last, result: s.result, moves: s.moves,
    hands: s.result ? s.hands : undefined };
}
export const result = s => s.result;

// ---------- Máy chơi ----------
// Điểm "tiềm năng" của một lá: có đôi/cạ (cùng số, hoặc cùng chất cách 1–2) thì đáng giữ.
function potential(hand, c) {
  let p = 0;
  for (const x of hand) { if (x === c) continue; if (value(x) === value(c)) p += 3; else if (suit(x) === suit(c) && Math.abs(value(x) - value(c)) <= 2) p += 2; }
  return p;
}
export function bot(s, seat, rng = Math.random, level = 'vua') {
  if (s.phase === 'take') {
    const options = canEat(s, seat);
    if (options.length && (level !== 'de' || rng() < 0.6)) {
      const now = arrange(s.hands[seat], s.locked[seat]).points;
      const after = Math.min(...options.map(m => arrange([...s.hands[seat], s.lastDiscard.card], [...s.locked[seat], m]).points));
      if (after <= now || level === 'de') return { type: 'eat' };
    }
    return s.pile.length ? { type: 'draw' } : { type: 'eat' };
  }
  const hand = s.hands[seat], lockedCards = new Set(s.locked[seat].flat());
  const choices = hand.filter(c => !lockedCards.has(c));
  if (level === 'de') return { type: 'discard', card: choices[Math.floor(rng() * choices.length)] };
  let best = choices[0], bestScore = Infinity;
  for (const c of choices) {
    const rest = hand.filter(x => x !== c), a = arrange(rest, s.locked[seat]);
    const score = a.points * 2 - value(c) * 0.5 + potential(rest, c) * 1.5 + (a.melds.length ? 0 : 15);
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return { type: 'discard', card: best };
}
export const auto = (s, seat, rng) => bot(s, seat, rng, 'vua');
