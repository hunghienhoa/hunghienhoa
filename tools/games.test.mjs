import assert from 'node:assert/strict';
import test from 'node:test';
import * as TL from '../dist/game/tien-len/rules.mjs';

function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const card = (r, s) => TL.RANKS.indexOf(r) * 4 + TL.SUITS.indexOf(s);

test('tiến lên: nhận bộ bài và luật chặt', () => {
  const c = cards => TL.classify(cards.map(([r, s]) => card(r, s)));
  assert.equal(c([['3', '♠'], ['4', '♣'], ['5', '♥']]).type, 'straight');
  assert.equal(c([['Q', '♠'], ['K', '♣'], ['A', '♥'], ['2', '♠']]), null, 'sảnh không có 2');
  assert.equal(c([['5', '♠'], ['5', '♥'], ['6', '♣'], ['6', '♦'], ['7', '♠'], ['7', '♣']]).type, 'pairseq');
  assert.equal(c([['9', '♠'], ['9', '♣'], ['9', '♦'], ['9', '♥']]).type, 'quad');
  assert.equal(c([['9', '♠'], ['10', '♣']]), null);
  const heo = c([['2', '♥']]), quad = c([['4', '♠'], ['4', '♣'], ['4', '♦'], ['4', '♥']]), ba = c([['5', '♠'], ['5', '♥'], ['6', '♣'], ['6', '♦'], ['7', '♠'], ['7', '♣']]);
  assert.ok(TL.beats(quad, heo) && TL.beats(ba, heo), 'tứ quý và 3 đôi thông chặt được heo');
  assert.ok(!TL.beats(ba, c([['2', '♠'], ['2', '♥']])), '3 đôi thông không chặt được đôi heo');
  assert.ok(TL.beats(quad, ba), 'tứ quý chặt 3 đôi thông');
  assert.ok(TL.beats(c([['3', '♥']]), c([['3', '♠']])) && !TL.beats(c([['4', '♠'], ['5', '♣'], ['6', '♦']]), c([['7', '♠']])));
  assert.equal(TL.instantWin([48, 49, 50, 51, 0, 4, 8, 12, 16, 20, 24, 28, 32]), 'Tứ quý heo');
});

test('tiến lên: luật lượt (phải có lá nhỏ nhất, bỏ lượt, vòng mới, hưởng sái)', () => {
  const s = TL.setup(4, seeded(7));
  const lead = s.turn, low = s.mustInclude;
  assert.ok(s.hands[lead].includes(low));
  const other = s.hands[lead].find(x => x !== low);
  assert.throws(() => TL.apply(s, lead, { type: 'play', cards: [other] }), /Nước đầu tiên/);
  assert.throws(() => TL.apply(s, (lead + 1) % 4, { type: 'pass' }), /Chưa tới lượt/);
  assert.throws(() => TL.apply(s, lead, { type: 'pass' }), /đi tự do/);
  let t = TL.apply(s, lead, { type: 'play', cards: [low] }).state;
  for (let k = 1; k <= 3; k++) t = TL.apply(t, t.turn, { type: 'pass' }).state;
  assert.equal(t.turn, lead, 'ba người bỏ lượt thì người đánh cuối được đi tự do');
  assert.equal(t.table, null);
});

test('tiến lên: máy tự đấu 300 ván 2–4 người đều kết thúc, không mất lá nào', () => {
  for (let g = 0; g < 300; g++) {
    const rng = seeded(g + 1), n = 2 + (g % 3);
    let s = TL.setup(n, rng);
    for (let step = 0; step < 400 && !s.result; step++) {
      const total = s.hands.flat().length;
      const act = TL.bot(s, s.turn, rng, g % 4 === 0 ? 'de' : 'vua');
      const next = TL.apply(s, s.turn, act).state;
      assert.equal(next.hands.flat().length + (act.type === 'play' ? act.cards.length : 0), total);
      s = next;
    }
    assert.ok(s.result, `ván ${g} phải kết thúc`);
    assert.deepEqual([...s.result.ranking].sort(), Array.from({ length: n }, (_, i) => i));
    assert.equal(s.result.scores.reduce((a, x) => a + x.delta, 0), s.result.reason === 'Hết bài' ? 0 : 0);
  }
});


import * as PH from '../dist/game/phom/rules.mjs';
import * as BC from '../dist/game/ba-cay/rules.mjs';
const pc = (r, s) => (PH.RANKS.indexOf(r)) * 4 + PH.SUITS.indexOf(s);

test('phỏm: nhận phỏm, xếp bài ít rác nhất, cách ăn, ù', () => {
  assert.ok(PH.isMeld([pc('7', '♠'), pc('7', '♥'), pc('7', '♦')]));
  assert.ok(PH.isMeld([pc('A', '♣'), pc('2', '♣'), pc('3', '♣')]));
  assert.ok(!PH.isMeld([pc('Q', '♣'), pc('K', '♣'), pc('A', '♣')]), 'không vòng K-A');
  assert.ok(!PH.isMeld([pc('4', '♣'), pc('5', '♦'), pc('6', '♣')]));
  const hand = [pc('7', '♠'), pc('7', '♥'), pc('7', '♦'), pc('8', '♦'), pc('9', '♦'), pc('K', '♠'), pc('2', '♣')];
  const a = PH.arrange(hand);
  assert.equal(a.points, 7 + 7 + 13 + 2, 'dây 7-8-9 rô để lại ít rác hơn bộ ba con 7');
  const opts = PH.eatOptions([pc('5', '♥'), pc('6', '♥'), pc('9', '♣')], [], pc('7', '♥'));
  assert.equal(opts.length, 1);
  const u = PH.uCheck([pc('2', '♠'), pc('2', '♥'), pc('2', '♦'), pc('5', '♣'), pc('6', '♣'), pc('7', '♣'), pc('J', '♠'), pc('J', '♥'), pc('J', '♣'), pc('K', '♦')], []);
  assert.equal(u, pc('K', '♦'), 'bỏ K rô thì 9 lá còn lại đủ phỏm: ù');
});

test('phỏm: luật lượt, ăn bài khóa phỏm, không đánh lá đã khóa', () => {
  let s = PH.setup(2, seeded(3));
  assert.equal(s.hands[s.dealer].length, 10);
  assert.throws(() => PH.apply(s, s.dealer, { type: 'draw' }), /đánh một lá/);
  const d = s.dealer, other = 1 - d;
  // Dựng thế: người sau cái có 5♥ 6♥, cái đánh 7♥
  s.hands[d] = s.hands[d].filter(c => c !== pc('7', '♥')); s.hands[d][0] = pc('7', '♥');
  s.hands[other] = s.hands[other].filter(c => ![pc('5', '♥'), pc('6', '♥'), pc('7', '♥')].includes(c)).slice(0, 7).concat([pc('5', '♥'), pc('6', '♥')]);
  s = PH.apply(s, d, { type: 'discard', card: pc('7', '♥') }).state;
  assert.ok(PH.canEat(s).length >= 1);
  s = PH.apply(s, other, { type: 'eat' }).state;
  assert.deepEqual(s.locked[other][0], [pc('5', '♥'), pc('6', '♥'), pc('7', '♥')]);
  assert.throws(() => PH.apply(s, other, { type: 'discard', card: pc('6', '♥') }), /phỏm đã ăn/);
});

test('phỏm: máy tự đấu 300 ván 2–4 người, đủ 4 vòng, bảo toàn bài, có người nhất', () => {
  for (let g = 0; g < 300; g++) {
    const rng = seeded(9000 + g), n = 2 + (g % 3);
    let s = PH.setup(n, rng), steps = 0;
    while (!s.result && steps < 200) {
      const total = s.hands.flat().length + s.discards.flat().length + s.pile.length;
      s = PH.apply(s, s.turn, PH.bot(s, s.turn, rng, g % 4 === 0 ? 'de' : 'vua')).state; steps++;
      assert.equal(s.hands.flat().length + s.discards.flat().length + s.pile.length, total);
      assert.ok(s.locked.every((ms, seat) => ms.flat().every(c => s.hands[seat].includes(c))), 'phỏm khóa luôn nằm trên tay');
    }
    assert.ok(s.result, `ván ${g} phải kết thúc`);
    assert.deepEqual([...s.result.ranking].sort(), Array.from({ length: n }, (_, i) => i));
    assert.equal(s.result.scores.reduce((t, x) => t + x.delta, 0), 0);
    if (s.result.u === null) assert.ok(s.discCount.every(x => x === PH.ROUNDS));
  }
});

test('ba cây: tính nút, ba tiên, sáp, so chất; lá chưa lật bị ẩn; lần lượt nặn', () => {
  const c = (r, s) => BC.RANKS.indexOf(r) * 4 + BC.SUITS.indexOf(s);
  assert.equal(BC.score([c('4', '♠'), c('5', '♥'), c('K', '♣')]).nut, 9);
  assert.equal(BC.score([c('J', '♠'), c('Q', '♥'), c('K', '♣')]).label, 'Ba tiên');
  assert.equal(BC.score([c('3', '♠'), c('3', '♥'), c('3', '♣')]).label, 'Sáp');
  assert.ok(BC.score([c('2', '♠'), c('2', '♥'), c('2', '♣')]).key > BC.score([c('J', '♠'), c('Q', '♥'), c('K', '♦')]).key);
  assert.ok(BC.score([c('4', '♦'), c('5', '♠'), c('10', '♣')]).key > BC.score([c('4', '♠'), c('5', '♥'), c('10', '♣')]).key, 'cùng 9 nút: lá rô thắng');
  let s = BC.setup(3, seeded(1));
  const v = BC.view(s, 0);
  assert.ok(v.cards.every(h => h.every(x => x === null)), 'chưa lật thì không ai thấy, kể cả chính mình');
  assert.throws(() => BC.apply(s, 1, { type: 'flip', i: 0 }), /Chưa tới lượt/);
  s = BC.apply(s, 0, { type: 'flip', i: 1 }).state;
  assert.notEqual(BC.view(s, 2).cards[0][1], null);
  s = BC.apply(s, 0, { type: 'flipAll' }).state;
  assert.equal(s.turn, 1);
  s = BC.apply(s, 1, { type: 'flipAll' }).state; s = BC.apply(s, 2, { type: 'flipAll' }).state;
  assert.ok(s.result && s.result.ranking.length === 3);
  assert.equal(s.result.scores.reduce((t, x) => t + x.delta, 0), 0);
});
