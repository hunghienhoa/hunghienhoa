// Luật cờ tướng dùng chung cho trình duyệt, máy chơi cờ (Web Worker) và phòng online (Durable Object).
// Bàn cờ là mảng 90 ô (10 hàng × 9 cột), ô = hàng*9 + cột; hàng 0 ở phía Đen (trên), hàng 9 ở phía Đỏ (dưới).
// Quân Đỏ viết hoa, quân Đen viết thường: K tướng, A sĩ, B tượng, N mã, R xe, C pháo, P tốt.

export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';
export const RED = 'r', BLACK = 'b';
export const PIECES = 'KABNRCP';
export const NAMES = { K: 'Tướng', A: 'Sĩ', B: 'Tượng', N: 'Mã', R: 'Xe', C: 'Pháo', P: 'Tốt' };
export const LETTERS = { K: 'Tg', A: 'S', B: 'T', N: 'M', R: 'X', C: 'P', P: 'B' };
export const HAN = { K: ['帥', '將'], A: ['仕', '士'], B: ['相', '象'], N: ['傌', '馬'], R: ['俥', '車'], C: ['炮', '砲'], P: ['兵', '卒'] };
export const DRAW_PLIES = 120; // 60 nước mỗi bên không ăn quân thì hòa

export const row = i => (i / 9) | 0;
export const col = i => i % 9;
export const sq = (r, c) => r * 9 + c;
const inside = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
export const colorOf = p => (p ? (p === p.toUpperCase() ? RED : BLACK) : null);
export const other = color => (color === RED ? BLACK : RED);
export const kind = p => (p ? p.toUpperCase() : null);
const inPalace = (r, c, color) => c >= 3 && c <= 5 && (color === RED ? r >= 7 : r <= 2);
const ownSide = (r, color) => (color === RED ? r >= 5 : r <= 4);

export function parseFen(fen = START_FEN) {
  const [placement, side = 'w', , , half = '0', full = '1'] = String(fen).trim().split(/\s+/);
  const rows = placement.split('/');
  if (rows.length !== 10) throw new Error('FEN cần đủ 10 hàng.');
  const board = [];
  for (const line of rows) {
    let count = 0;
    for (const ch of line) {
      if (/[1-9]/.test(ch)) { for (let k = 0; k < +ch; k++) board.push(null); count += +ch; }
      else if (/^[kabnrcp]$/i.test(ch)) { board.push(ch); count++; }
      else throw new Error('FEN có ký tự lạ.');
    }
    if (count !== 9) throw new Error('Mỗi hàng FEN cần đủ 9 ô.');
  }
  return { board, turn: side === 'b' ? BLACK : RED, halfmove: Math.max(0, parseInt(half, 10) || 0), fullmove: Math.max(1, parseInt(full, 10) || 1) };
}

export function toFen({ board, turn, halfmove = 0, fullmove = 1 }) {
  const rows = [];
  for (let r = 0; r < 10; r++) {
    let line = '', empty = 0;
    for (let c = 0; c < 9; c++) {
      const p = board[sq(r, c)];
      if (!p) { empty++; continue; }
      if (empty) { line += empty; empty = 0; }
      line += p;
    }
    rows.push(line + (empty || ''));
  }
  return `${rows.join('/')} ${turn === BLACK ? 'b' : 'w'} - - ${halfmove} ${fullmove}`;
}

export const positionKey = (board, turn) => board.map(p => p || '.').join('') + turn;

export function kingIndex(board, color) {
  const k = color === RED ? 'K' : 'k';
  // Tướng luôn ở trong cung: chỉ cần tìm 18 ô.
  for (const r of color === RED ? [9, 8, 7] : [0, 1, 2]) for (let c = 3; c <= 5; c++) if (board[sq(r, c)] === k) return sq(r, c);
  return board.indexOf(k);
}

const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const HORSE = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]];

// Bên `color` có đang bị chiếu không (gồm cả lộ mặt tướng).
export function inCheck(board, color) {
  const k = kingIndex(board, color);
  if (k < 0) return true;
  const kr = row(k), kc = col(k), enemy = other(color);
  const R = enemy === RED ? 'R' : 'r', C = enemy === RED ? 'C' : 'c', N = enemy === RED ? 'N' : 'n', P = enemy === RED ? 'P' : 'p', K = enemy === RED ? 'K' : 'k';
  for (const [dr, dc] of ORTHO) {
    let r = kr + dr, c = kc + dc, screen = false;
    while (inside(r, c)) {
      const p = board[sq(r, c)];
      if (p) {
        if (!screen) {
          if (p === R || (p === K && dc === 0)) return true;
          screen = true;
        } else { if (p === C) return true; break; }
      }
      r += dr; c += dc;
    }
  }
  for (const [dr, dc] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]]) {
    const r = kr + dr, c = kc + dc;
    if (!inside(r, c) || board[sq(r, c)] !== N) continue;
    // Chân mã tính từ con mã: ô kề con mã theo hướng đi dài về phía tướng.
    const lr = Math.abs(dr) === 2 ? r - dr / 2 : r, lc = Math.abs(dc) === 2 ? c - dc / 2 : c;
    if (!board[sq(lr, lc)]) return true;
  }
  const forward = enemy === RED ? 1 : -1; // tốt địch đứng sau tướng theo hướng nó tiến
  if (inside(kr + forward, kc) && board[sq(kr + forward, kc)] === P) return true;
  for (const dc of [-1, 1]) if (inside(kr, kc + dc) && board[sq(kr, kc + dc)] === P) return true; // tốt đã qua sông mới tới được cung
  return false;
}

// Nước đi giả (chưa xét tự để tướng bị chiếu). Trả về mảng [từ, đến].
export function pseudoMoves(board, color, only = -1) {
  const moves = [];
  const add = (from, r, c) => {
    if (!inside(r, c)) return;
    const t = board[sq(r, c)];
    if (!t || colorOf(t) !== color) moves.push([from, sq(r, c)]);
  };
  for (let i = 0; i < 90; i++) {
    if (only >= 0 && i !== only) continue;
    const p = board[i];
    if (!p || colorOf(p) !== color) continue;
    const r = row(i), c = col(i), k = kind(p);
    if (k === 'K') { for (const [dr, dc] of ORTHO) if (inPalace(r + dr, c + dc, color)) add(i, r + dr, c + dc); }
    else if (k === 'A') { for (const [dr, dc] of DIAG) if (inPalace(r + dr, c + dc, color)) add(i, r + dr, c + dc); }
    else if (k === 'B') {
      for (const [dr, dc] of DIAG) {
        const er = r + dr, ec = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
        if (inside(tr, tc) && ownSide(tr, color) && !board[sq(er, ec)]) add(i, tr, tc);
      }
    } else if (k === 'N') {
      for (const [dr, dc, lr, lc] of HORSE) if (inside(r + lr, c + lc) && !board[sq(r + lr, c + lc)]) add(i, r + dr, c + dc);
    } else if (k === 'R' || k === 'C') {
      for (const [dr, dc] of ORTHO) {
        let tr = r + dr, tc = c + dc, screen = false;
        while (inside(tr, tc)) {
          const t = board[sq(tr, tc)];
          if (k === 'R') { if (t) { if (colorOf(t) !== color) moves.push([i, sq(tr, tc)]); break; } moves.push([i, sq(tr, tc)]); }
          else if (!screen) { if (t) screen = true; else moves.push([i, sq(tr, tc)]); }
          else if (t) { if (colorOf(t) !== color) moves.push([i, sq(tr, tc)]); break; }
          tr += dr; tc += dc;
        }
      }
    } else if (k === 'P') {
      const f = color === RED ? -1 : 1;
      add(i, r + f, c);
      if (!ownSide(r, color)) { add(i, r, c - 1); add(i, r, c + 1); }
    }
  }
  return moves;
}

export function makeMove(board, from, to) { const captured = board[to]; board[to] = board[from]; board[from] = null; return captured; }
export function unmakeMove(board, from, to, captured) { board[from] = board[to]; board[to] = captured; }

export function legalMoves(board, color, only = -1) {
  const out = [];
  for (const [from, to] of pseudoMoves(board, color, only)) {
    const cap = makeMove(board, from, to);
    if (!inCheck(board, color)) out.push([from, to]);
    unmakeMove(board, from, to, cap);
  }
  return out;
}

// Ký hiệu kiểu Việt: chữ quân + cột (đánh số từ phải sang trái theo người đi) + dấu (. tiến, / thoái, - bình) + số.
export function notation(board, from, to) {
  const p = board[from], color = colorOf(p), k = kind(p);
  const file = c => (color === RED ? 9 - c : c + 1);
  const fr = row(from), fc = col(from), tr = row(to), tc = col(to);
  const ahead = color === RED ? fr - tr : tr - fr;
  let head = LETTERS[k] + file(fc);
  const twins = [];
  for (let r = 0; r < 10; r++) if (board[sq(r, fc)] === p) twins.push(r);
  if (twins.length > 1 && k !== 'K' && k !== 'A' && k !== 'B') {
    const order = color === RED ? twins : twins.slice().reverse(); // quân "trước" là quân gần phía địch hơn
    const at = order.indexOf(fr);
    head = LETTERS[k] + (twins.length === 2 ? (at === 0 ? 't' : 's') : (at + 1)) ;
  }
  if (ahead === 0) return `${head}-${file(tc)}`;
  const straight = k === 'K' || k === 'R' || k === 'C' || k === 'P';
  return `${head}${ahead > 0 ? '.' : '/'}${straight ? Math.abs(ahead) : file(tc)}`;
}

export const REASONS = {
  checkmate: 'Chiếu bí',
  stalemate: 'Hết nước đi',
  perpetual: 'Chiếu dai bị xử thua',
  repetition: 'Lặp lại thế cờ',
  sixty: '60 nước không ăn quân',
  resign: 'Một bên xin thua',
  timeout: 'Hết giờ',
  agreement: 'Hai bên đồng ý hòa',
  abandon: 'Rời ván quá lâu'
};

// Một ván cờ: lịch sử, kiểm tra kết thúc. Dùng giống nhau ở trình duyệt và máy chủ.
export class Game {
  constructor(fen = START_FEN) { this.reset(fen); }
  reset(fen = START_FEN) {
    const s = parseFen(fen);
    this.startFen = toFen(s);
    this.board = s.board; this.turn = s.turn; this.halfmove = s.halfmove; this.fullmove = s.fullmove;
    this.history = []; // {from,to,piece,captured,check,san,key,halfmove}
    this.keys = [positionKey(this.board, this.turn)];
    this.result = null;
    this.checkResult();
    return this;
  }
  get fen() { return toFen(this); }
  inCheck(color = this.turn) { return inCheck(this.board, color); }
  legalMoves(from = -1) { return this.result ? [] : legalMoves(this.board, this.turn, from); }
  isLegal(from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 89 || to < 0 || to > 89) return false;
    const p = this.board[from];
    return !this.result && !!p && colorOf(p) === this.turn && this.legalMoves(from).some(m => m[1] === to);
  }
  move(from, to) {
    if (!this.isLegal(from, to)) return null;
    const piece = this.board[from], san = notation(this.board, from, to);
    const captured = makeMove(this.board, from, to);
    const mover = this.turn;
    this.turn = other(this.turn);
    if (mover === BLACK) this.fullmove++;
    const prevHalf = this.halfmove;
    this.halfmove = captured ? 0 : this.halfmove + 1;
    const check = inCheck(this.board, this.turn);
    const key = positionKey(this.board, this.turn);
    const record = { from, to, piece, captured, check, san, color: mover, prevHalf };
    this.history.push(record); this.keys.push(key);
    this.checkResult();
    return record;
  }
  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this.keys.pop();
    unmakeMove(this.board, last.from, last.to, last.captured);
    this.turn = last.color;
    if (last.color === BLACK) this.fullmove--;
    this.halfmove = last.prevHalf;
    this.result = null;
    return last;
  }
  end(winner, reason) { this.result = { winner, reason }; return this.result; }
  checkResult() {
    if (this.result) return this.result;
    if (!legalMoves(this.board, this.turn).length) return this.end(other(this.turn), inCheck(this.board, this.turn) ? 'checkmate' : 'stalemate');
    const key = this.keys[this.keys.length - 1];
    const seen = [];
    this.keys.forEach((k, i) => { if (k === key) seen.push(i); });
    if (seen.length >= 3) {
      // Trong vòng lặp, bên nào nước nào cũng chiếu (bên kia không) thì bị xử thua vì chiếu dai.
      const window = this.history.slice(seen[0]);
      const allChecks = color => { const mine = window.filter(m => m.color === color); return mine.length > 0 && mine.every(m => m.check); };
      const r = allChecks(RED), b = allChecks(BLACK);
      if (r !== b) return this.end(r ? BLACK : RED, 'perpetual');
      return this.end(null, 'repetition');
    }
    if (this.halfmove >= DRAW_PLIES) return this.end(null, 'sixty');
    return null;
  }
}
