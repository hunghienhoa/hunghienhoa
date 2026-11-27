import assert from 'node:assert/strict';
import test from 'node:test';
import * as TL from '../dist/game/tien-len/rules.mjs';
import * as CN from '../dist/game/ca-ngua/rules.mjs';
import * as OQ from '../dist/game/o-an-quan/rules.mjs';

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

test('cá ngựa: đường đua, xuất quân, không nhảy qua đầu ngựa, đá ngựa, lên chuồng', () => {
  assert.equal(CN.PATH.length, 52);
  assert.equal(new Set(CN.PATH.map(String)).size, 52);
  assert.deepEqual(CN.PATH[CN.absolute(2, CN.GATE)], [0, 7], 'cửa chuồng của màu ở cánh trên');
  let s = CN.setup(2);
  assert.deepEqual(s.colors, [0, 2]);
  s.phase = 'move'; s.dice = 3;
  assert.deepEqual(CN.legalMoves(s), [], 'đổ 3 không xuất quân được');
  s.dice = 6;
  assert.equal(CN.legalMoves(s).length, 4);
  // Ngựa đỏ ở 0, ngựa vàng đứng chắn ở ô +2: đổ 4 không qua được, đổ 2 thì đá.
  s = CN.setup(2); s.horses[0][0] = 0; s.phase = 'move';
  const a = CN.absolute(0, 2); const pYellow = (a - CN.startOf(2) + 52) % 52; s.horses[1][0] = pYellow;
  s.dice = 4; assert.ok(!CN.legalMoves(s).some(m => m.h === 0), 'không nhảy qua đầu ngựa');
  s.dice = 2; const kick = CN.legalMoves(s).find(m => m.h === 0);
  assert.ok(kick && kick.kick && kick.kick.seat === 1);
  const after = CN.apply(s, 0, { type: 'move', horse: 0 }).state;
  assert.equal(after.horses[1][0], -1, 'ngựa bị đá về chuồng');
  // Lên chuồng: từ cửa đổ 3 lên ô 3; trong chuồng ô 3 muốn lên ô 4 phải đổ 4.
  s = CN.setup(2); s.horses[0][0] = CN.GATE; s.phase = 'move'; s.dice = 3;
  const up = CN.apply(s, 0, { type: 'move', horse: 0 }).state;
  assert.equal(up.horses[0][0], 103);
  up.turn = 0; up.phase = 'move'; up.dice = 5; assert.equal(CN.legalMoves(up).length, 0);
  up.dice = 4; assert.equal(CN.legalMoves(up)[0].to, 104);
});

test('cá ngựa: máy tự đấu 200 ván 2–4 người đều có người thắng', () => {
  for (let g = 0; g < 200; g++) {
    const rng = seeded(1000 + g), n = 2 + (g % 3);
    let s = CN.setup(n, rng);
    let steps = 0;
    while (!s.result && steps < 20000) {
      s = CN.apply(s, s.turn, CN.bot(s, s.turn, rng, g % 5 === 0 ? 'de' : 'vua'), rng).state; steps++;
      for (let seat = 0; seat < n; seat++) {
        const onTrack = s.horses[seat].filter(p => p >= 0 && p <= CN.GATE || p >= 101);
        assert.equal(new Set(onTrack).size, onTrack.length, 'ngựa nhà không đứng chồng');
      }
    }
    assert.ok(s.result, `ván ${g} phải kết thúc (đã đi ${steps} lượt)`);
    assert.ok(s.horses[s.result.ranking[0]].every(p => p >= 101));
  }
});

test('ô ăn quan: rải, bốc tiếp, ăn, ăn liền, mất lượt khi gặp ô quan', () => {
  let s = OQ.setup();
  assert.equal(s.small.reduce((a, b) => a + b, 0), 50);
  // Ô 5 có 5 quân, rải sang phải: 6(quan),7,8,9,10 → ô kế 11 có quân → bốc tiếp…
  const r = OQ.apply(s, 0, { pit: 1, dir: -1 }).state; // rải sang trái: 0(quan),11,10,9,8 rồi ô 7 có quân, bốc tiếp
  assert.ok(r.last.steps.filter(x => x.k === 'pick').length >= 2);
  // Ăn liền: dựng thế 2 ô trống xen kẽ có quân.
  s = OQ.setup(); s.small = [0, 1, 0, 3, 0, 4, 0, 0, 0, 0, 0, 0]; s.big = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  s.small[7] = 2; // bên kia còn quân
  const eat = OQ.apply(s, 0, { pit: 1, dir: 1 }).state; // rải 1 quân vào ô 2, ô 3 có quân → bốc…
  assert.ok(eat.last.steps.length > 2);
  s = OQ.setup(); s.small = [0, 1, 0, 0, 3, 0, 0, 5, 5, 5, 5, 5]; s.big = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  const take = OQ.apply(s, 0, { pit: 1, dir: 1 }).state; // rải vào 2, ô 3 trống, ăn ô 4 (3 quân); ô 5 trống, ăn ô quan 6
  assert.equal(take.captured[0].small, 3);
  assert.equal(take.captured[0].big, 1, 'ăn liền tới ô quan');
  assert.throws(() => OQ.apply(OQ.setup(), 0, { pit: 7, dir: 1 }), /ô dân bên bạn/);
});

test('ô ăn quan: máy tự đấu 150 ván đều kết thúc và bảo toàn quân', () => {
  for (let g = 0; g < 150; g++) {
    const rng = seeded(5000 + g);
    let s = OQ.setup(2, rng), steps = 0;
    while (!s.result && steps < 600) {
      const total = s.small.reduce((a, b) => a + b, 0) + s.captured[0].small + s.captured[1].small;
      const bigs = s.big.reduce((a, b) => a + b, 0) + s.captured[0].big + s.captured[1].big;
      s = OQ.apply(s, s.turn, OQ.bot(s, s.turn, rng, g % 3 === 0 ? 'de' : 'vua')).state; steps++;
      assert.equal(s.small.reduce((a, b) => a + b, 0) + s.captured[0].small + s.captured[1].small, total);
      assert.equal(s.big.reduce((a, b) => a + b, 0) + s.captured[0].big + s.captured[1].big, bigs);
    }
    assert.ok(s.result, `ván ${g} phải kết thúc`);
    assert.equal(s.result.points[0] + s.result.points[1], 50 + 2 * OQ.QUAN_VALUE);
  }
});
