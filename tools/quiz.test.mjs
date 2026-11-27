import assert from 'node:assert/strict';
import test from 'node:test';
import { QUESTIONS, GROUPS } from '../dist/game/do-vui/questions.mjs';

test('đố vui: mỗi câu có 4 đáp án khác nhau, một đáp án đúng, có mẹo và lời giải', () => {
  assert.ok(QUESTIONS.length >= 30, 'cần đủ câu để mỗi lượt 10 câu ít lặp');
  const seen = new Set();
  for (const q of QUESTIONS) {
    assert.ok(GROUPS[q.c], `nhóm không hợp lệ: ${q.q}`);
    assert.equal(q.o.length, 4, q.q);
    assert.equal(new Set(q.o).size, 4, `đáp án trùng nhau: ${q.q}`);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, q.q);
    assert.ok(q.h.length > 8 && q.e.length > 8, `thiếu mẹo hoặc lời giải: ${q.q}`);
    assert.ok(!seen.has(q.q), `câu hỏi trùng: ${q.q}`); seen.add(q.q);
  }
});

test('đố vui: mỗi nhóm có đủ câu cho một lượt 10 câu', () => {
  for (const g of Object.keys(GROUPS)) assert.ok(QUESTIONS.filter(q => q.c === g).length >= 8, `nhóm ${g} quá ít câu`);
});

test('đố vui: các bài toán có đáp án đúng khi tính lại', () => {
  const pick = text => { const q = QUESTIONS.find(x => x.q.includes(text)); return q.o[q.a]; };
  assert.equal(pick('Cha 36 tuổi'), '9 năm');
  assert.equal(pick('35 cái đầu'), '12');
  assert.equal(pick('Số tiếp theo của dãy: 1, 1, 2, 3, 5, 8'), '13');
  assert.equal(pick('đong đúng 4 lít'), '6');
  assert.equal(pick('qua cầu vào ban đêm'), '17 phút');
});

import { mulberry32, pickQuestion, fifty, audience, friend, points, publicQuestion, levelForStreak, levelForRound } from '../dist/game/do-vui/engine.mjs';

test('đố vui: câu hỏi sinh tự động không bao giờ hết và luôn hợp lệ ở cả 3 mức', () => {
  for (let seed = 1; seed <= 600; seed++) {
    const r = mulberry32(seed);
    for (const lv of [1, 2, 3]) {
      const q = pickQuestion(r, lv, new Set(), seed);
      assert.equal(q.o.length, 4); assert.equal(new Set(q.o).size, 4, q.q);
      assert.ok(q.a >= 0 && q.a < 4 && q.h && q.e && q.q);
    }
  }
  const used = new Set(), r = mulberry32(7);
  for (let i = 0; i < 400; i++) { const q = pickQuestion(r, 1 + (i % 3), used, i); used.add(q.id); }
  assert.ok(used.size > 300, 'phải có thật nhiều câu khác nhau');
});

test('đố vui: câu tính nhẩm và gà thỏ có đáp án đúng khi tính lại', () => {
  let mental = 0, chicken = 0;
  for (let seed = 1; seed <= 2000 && (mental < 20 || chicken < 20); seed++) {
    const q = pickQuestion(mulberry32(seed), 1 + (seed % 3), new Set(), seed);
    const m = q.q.match(/^Tính nhẩm: (\d+) × (\d+) \+ (\d+)/);
    if (m) { mental++; assert.equal(q.o[q.a], String(m[1] * m[2] + Number(m[3]))); }
    const c = q.q.match(/có (\d+) cái đầu và (\d+) cái chân/);
    if (c) { chicken++; assert.equal(Number(q.o[q.a]), (Number(c[2]) - 2 * Number(c[1])) / 2); }
  }
  assert.ok(mental >= 20 && chicken >= 20);
});

test('đố vui: quyền trợ giúp 50:50, hỏi khán giả, gọi người thân', () => {
  let rightAudience = 0, rightFriend = 0, n = 0;
  for (let seed = 1; seed <= 800; seed++) {
    const r = mulberry32(seed), q = pickQuestion(r, 1, new Set(), seed);
    const f = fifty(r, q); assert.equal(f.length, 2); assert.ok(!f.includes(q.a));
    const au = audience(r, q, f); assert.equal(au.reduce((a, b) => a + b, 0), 100); assert.ok(f.every(i => au[i] === 0));
    const fr = friend(r, q, f); assert.ok(!f.includes(fr.pick));
    n++; if (au.indexOf(Math.max(...au)) === q.a) rightAudience++; if (fr.pick === q.a) rightFriend++;
  }
  assert.ok(rightAudience / n > 0.8 && rightFriend / n > 0.8, 'ở mức dễ, trợ giúp thường chỉ đúng');
});

test('đố vui: điểm tăng theo mức khó, Mẹo còn nửa, chuỗi đúng được thưởng, mức khó tăng theo chuỗi', () => {
  assert.equal(points({ lv: 1 }), 10); assert.equal(points({ lv: 3 }), 20);
  assert.equal(points({ lv: 1, hint: true }), 5);
  assert.ok(points({ lv: 1, streak: 5 }) > points({ lv: 1, streak: 2 }));
  assert.equal(points({ lv: 1, hint: true, streak: 9 }), 5);
  assert.ok(points({ lv: 1, msLeft: 25000, limit: 25000 }) > points({ lv: 1, msLeft: 1000, limit: 25000 }));
  assert.deepEqual([0, 3, 7].map(levelForStreak), [1, 2, 3]); assert.deepEqual([1, 5, 10].map(levelForRound), [1, 2, 3]);
  assert.ok(!('a' in publicQuestion(pickQuestion(mulberry32(1), 1, new Set(), 1))), 'đề gửi cho người chơi không kèm đáp án');
});
