import assert from 'node:assert/strict';
import test from 'node:test';
import { Game, START_FEN, parseFen, toFen, legalMoves, makeMove, unmakeMove, other, inCheck, notation, sq } from '../dist/cotuong/core.mjs';
import { search, LEVELS } from '../dist/cotuong/ai.mjs';

const perft = (b, color, d) => { if (!d) return 1; let n = 0; for (const [f, t] of legalMoves(b, color)) { const c = makeMove(b, f, t); n += perft(b, other(color), d - 1); unmakeMove(b, f, t, c); } return n; };
const at = (name) => { const c = name.charCodeAt(0) - 97, r = +name.slice(1); return sq(r, c); }; // a0 = góc trên trái (phía Đen)

test('cờ tướng: số nước đi chuẩn (perft) từ thế đầu và thế giữa ván', () => {
  const s = parseFen(START_FEN);
  assert.deepEqual([1, 2, 3].map(d => perft(s.board, s.turn, d)), [44, 1920, 79666]);
  const mid = parseFen('r1ba1a3/4kn3/2n1b4/pNp1p1p1p/4c4/6P2/P1P2R2P/1CcC5/9/2BAKAB2 w - - 0 1');
  assert.deepEqual([1, 2].map(d => perft(mid.board, mid.turn, d)), [38, 1128]);
  assert.equal(toFen(s), START_FEN);
});

test('cờ tướng: luật từng quân (lộ mặt tướng, tượng không qua sông, cản mã, pháo ăn qua ngòi, tốt qua sông)', () => {
  // Hai tướng cùng cột, xe Đen chắn giữa: xe không được rời cột (lộ mặt tướng).
  let g = new Game('4k4/9/9/9/4r4/9/9/9/9/4K4 b - - 0 1');
  assert.ok(g.legalMoves(at('e4')).every(([, to]) => to % 9 === 4));
  // Tượng Đỏ không qua sông, bị chặn mắt thì không đi.
  g = new Game('3k5/9/9/9/9/2B6/9/9/9/4K4 w - - 0 1');
  assert.deepEqual(g.legalMoves(at('c5')).map(m => m[1]).sort((a, b) => a - b), [at('a7'), at('e7')].sort((a, b) => a - b));
  g = new Game('3k5/9/9/9/9/9/9/9/3P5/2B1K4 w - - 0 1');
  assert.ok(!g.isLegal(at('c9'), at('e7')), 'mắt tượng bị chặn');
  // Cản mã.
  g = new Game('3k5/9/9/9/9/9/9/9/1P7/1N2K4 w - - 0 1');
  assert.ok(!g.isLegal(at('b9'), at('a7')) && !g.isLegal(at('b9'), at('c7')) && g.isLegal(at('b9'), at('d8')));
  // Pháo phải có đúng một ngòi mới ăn được.
  g = new Game('3k5/9/9/1r7/9/1p7/9/1C7/9/4K4 w - - 0 1');
  assert.ok(g.isLegal(at('b7'), at('b3')), 'ăn qua một ngòi');
  assert.ok(!g.isLegal(at('b7'), at('b5')), 'không ăn trực tiếp');
  // Tốt chưa qua sông chỉ tiến; qua sông được đi ngang, không bao giờ lùi.
  g = new Game('4k4/9/9/9/9/9/4P4/9/9/3K5 w - - 0 1');
  assert.deepEqual(g.legalMoves(at('e6')).map(m => m[1]), [at('e5')]);
  g = new Game('4k4/9/9/9/4P4/9/9/9/9/3K5 w - - 0 1');
  assert.deepEqual(g.legalMoves(at('e4')).map(m => m[1]).sort((a, b) => a - b), [at('e3'), at('d4'), at('f4')].sort((a, b) => a - b));
});

test('cờ tướng: chiếu, chiếu bí, hết nước đi đều thua, đi lại', () => {
  const g = new Game('3k5/R8/9/9/9/9/9/9/9/4K4 w - - 0 1');
  const rec = g.move(at('a1'), at('e1'));
  assert.ok(rec && g.result && g.result.winner === 'r', 'Đen hết nước đi là thua');
  g.undo();
  assert.equal(g.result, null);
  assert.equal(g.turn, 'r');
  const mate = new Game('4k4/4P4/4P4/9/9/9/9/9/9/3K5 w - - 0 1');
  assert.ok(!mate.result);
  assert.equal(mate.move(at('e2'), at('d2')) && null, null);
  const check = new Game('3k5/9/9/9/9/9/9/9/9/4K3R w - - 0 1');
  const r2 = check.move(at('i9'), at('i0'));
  assert.ok(r2.check && inCheck(check.board, 'b'));
  assert.ok(!check.move(at('a0'), at('a1')), 'không có quân ở ô đó');
});

test('cờ tướng: chiếu dai bị xử thua, lặp thế không chiếu là hòa, 60 nước không ăn quân là hòa', () => {
  // Xe Đỏ chiếu qua lại, tướng Đen né qua lại: lần lặp thứ ba Đỏ thua vì chiếu dai.
  const g = new Game('4k4/9/9/9/9/9/9/9/9/R2K5 w - - 0 1');
  const seq = [['a9', 'a0'], ['e0', 'e1'], ['a0', 'a1'], ['e1', 'e0'], ['a1', 'a0'], ['e0', 'e1'], ['a0', 'a1'], ['e1', 'e0'], ['a1', 'a0']];
  for (const [f, t] of seq) { if (g.result) break; assert.ok(g.move(at(f), at(t)), `${f}-${t}`); }
  assert.deepEqual(g.result, { winner: 'b', reason: 'perpetual' });
  // Đi qua lại không chiếu: hòa.
  const d = new Game('3k5/9/9/9/9/9/9/9/9/R3K4 w - - 0 1');
  for (const [f, t] of [['a9', 'b9'], ['d0', 'd1'], ['b9', 'a9'], ['d1', 'd0'], ['a9', 'b9'], ['d0', 'd1'], ['b9', 'a9'], ['d1', 'd0'], ['a9', 'b9']]) { if (d.result) break; assert.ok(d.move(at(f), at(t))); }
  assert.deepEqual(d.result, { winner: null, reason: 'repetition' });
  const s = new Game('3k5/9/9/9/9/9/9/9/9/R3K4 w - - 119 70');
  s.move(at('a9'), at('b9'));
  assert.deepEqual(s.result, { winner: null, reason: 'sixty' });
});

test('cờ tướng: ký hiệu nước đi kiểu Việt', () => {
  const g = new Game();
  assert.equal(notation(g.board, at('h7'), at('e7')), 'P2-5');
  assert.equal(notation(g.board, at('b9'), at('c7')), 'M8.7');
  assert.equal(notation(g.board, at('a9'), at('a8')), 'X9.1');
  assert.equal(notation(g.board, at('h2'), at('e2')), 'P8-5'); // phía Đen đếm cột từ phải của Đen
  assert.equal(notation(g.board, at('c0'), at('e2')), 'T3.5');
  const twins = new Game('4k4/9/9/9/9/9/R8/9/R8/4K4 w - - 0 1');
  assert.equal(notation(twins.board, at('a6'), at('a5')), 'Xt.1');
  assert.equal(notation(twins.board, at('a8'), at('b8')), 'Xs-8');
});

test('máy chơi cờ: luôn trả nước hợp lệ, tìm ra nước thắng ngay, khai cuộc đa dạng', () => {
  const win = new Game('3k5/R8/9/9/9/9/9/9/9/4K4 w - - 0 1');
  const m = search(win.fen, LEVELS.vua);
  win.move(m.from, m.to);
  assert.equal(win.result?.winner, 'r');
  const g = new Game();
  for (let i = 0; i < 24 && !g.result; i++) {
    const mv = search(g.fen, { ...LEVELS.de, timeMs: 80, history: g.keys });
    assert.ok(mv && g.isLegal(mv.from, mv.to), 'nước của máy phải hợp lệ');
    g.move(mv.from, mv.to);
  }
  const first = new Set(Array.from({ length: 12 }, () => { const s = search(START_FEN, { ...LEVELS.de, history: [new Game().keys[0]] }); return s.from * 100 + s.to; }));
  assert.ok(first.size >= 2, 'nước mở đầu không lặp một kiểu');
});
