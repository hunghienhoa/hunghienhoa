// Ba Cây (2–4 người). Tính điểm cho vui, không cược. Mỗi người 3 lá úp; lần lượt từng người "nặn" lật từng lá.
// Điểm (nút) = tổng điểm 3 lá lấy hàng đơn vị: A = 1, 2–9 theo số, 10/J/Q/K = 0 (10 nút = bù).
// Mạnh nhất là sáp (3 lá cùng số), rồi ba tiên (3 lá J/Q/K), rồi theo nút 9 → 0.
// Bằng nhau thì so lá cao nhất: chất rô > cơ > chuồn > bích, cùng chất thì A > K > … > 2.
export const meta = { id: 'ba-cay', name: 'Ba Cây', seats: 4, minSeats: 2, turnMs: 15000 };
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♣', '♥', '♦'];
export const SUIT_NAMES = ['bích', 'chuồn', 'cơ', 'rô'];
// id = hạng*4 + chất; hạng 0 = A … 12 = K; chất theo thứ tự yếu → mạnh (bích, chuồn, cơ, rô)
export const rank = id => id >> 2, suit = id => id & 3;
export const cardName = id => `${RANKS[rank(id)]} ${SUIT_NAMES[suit(id)]}`;
const points = id => (rank(id) >= 9 ? 0 : rank(id) + 1);
const high = id => suit(id) * 13 + (rank(id) === 0 ? 12 : rank(id) - 1); // A cao nhất trong cùng chất
export function score(cards) {
  const r = cards.map(rank);
  if (r.every(x => x === r[0])) return { tier: 3, nut: 10, label: 'Sáp', key: 3000 + r[0] };
  const top = Math.max(...cards.map(high));
  if (r.every(x => x >= 10)) return { tier: 2, nut: 10, label: 'Ba tiên', key: 2000 + top };
  const nut = cards.reduce((t, c) => t + points(c), 0) % 10;
  return { tier: 1, nut, label: nut === 0 ? 'Bù' : `${nut} nút`, key: 1000 + nut * 60 + top };
}
function shuffle(rng) { const d = Array.from({ length: 52 }, (_, i) => i); for (let i = 51; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
export function setup(n, rng = Math.random, prev = null) {
  n = Math.max(2, Math.min(4, n | 0));
  const deck = shuffle(rng), winner = prev?.result?.ranking?.[0];
  return { n, hands: Array.from({ length: n }, () => deck.splice(0, 3)), revealed: Array.from({ length: n }, () => [false, false, false]),
    turn: Number.isInteger(winner) && winner < n ? winner : 0, done: 0, last: null, result: null, moves: 0 };
}
export const turn = s => (s.result ? -1 : s.turn);
export function apply(state, seat, action) {
  const s = structuredClone(state);
  if (s.result) throw new Error('Ván đã kết thúc.');
  if (seat !== s.turn) throw new Error('Chưa tới lượt bạn.');
  const rev = s.revealed[seat];
  if (action?.type === 'flipAll') rev.fill(true);
  else if (action?.type === 'flip' && [0, 1, 2].includes(Number(action.i))) { if (rev[Number(action.i)]) throw new Error('Lá này đã lật rồi.'); rev[Number(action.i)] = true; }
  else throw new Error('Thao tác chưa hợp lệ.');
  s.moves++;
  s.last = { seat, type: 'flip', i: action.type === 'flip' ? Number(action.i) : null };
  if (rev.every(Boolean)) {
    s.last.score = score(s.hands[seat]);
    s.done++;
    if (s.done >= s.n) {
      const ranking = Array.from({ length: s.n }, (_, i) => i).sort((a, b) => score(s.hands[b]).key - score(s.hands[a]).key);
      s.result = { ranking, scores: ranking.map((x, i) => ({ seat: x, delta: i === 0 ? s.n - 1 : -1 })), hands: s.hands.map(score), reason: 'Lật bài' };
      s.turn = -1;
    } else s.turn = (seat + 1) % s.n;
  }
  return { state: s, events: [s.last] };
}
// Lá chưa lật thì không ai thấy, kể cả chính mình (để "nặn").
export function view(s, seat) {
  return { n: s.n, cards: s.hands.map((h, i) => h.map((c, k) => (s.result || s.revealed[i][k] ? c : null))), revealed: s.revealed, turn: turn(s), last: s.last, result: s.result, moves: s.moves, you: seat };
}
export const result = s => s.result;
export function bot(s, seat) { const i = s.revealed[seat].findIndex(x => !x); return i >= 0 ? { type: 'flip', i } : { type: 'flipAll' }; }
export const auto = s => ({ type: 'flipAll' });
