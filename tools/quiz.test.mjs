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
