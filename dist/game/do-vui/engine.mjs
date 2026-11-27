// Bộ máy Đố Vui dùng chung cho trình duyệt (chơi một mình) và máy chủ (phòng nhiều người).
// Câu hỏi lấy từ ngân hàng questions.mjs rồi tới các câu sinh tự động (dãy số, tính nhẩm, tuổi, gà thỏ...),
// nên không bao giờ hết câu. Mức khó 1-3 tăng dần theo chuỗi thắng hoặc số câu đã qua.
import { QUESTIONS } from './questions.mjs';

export const LIFELINES = ['fifty', 'audience', 'friend', 'swap'];
export const mulberry32 = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
export function shuffle(r, list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const money = n => n.toLocaleString('en-US').replace(/,/g, '.') + 'đ';
const HARD = /qua cầu|đong đúng|nhân đôi|5 máy|Cha 36|35 cái đầu|gõ 3 tiếng/;
export const levelOf = q => q.lv ?? (q.c === 'logic' ? (HARD.test(q.q) ? 3 : 2) : 1);

// Ghép đề từ đáp án đúng và các đáp án sai gợi ý; luôn đủ 4 đáp án khác nhau.
function pack(r, { q, ans, wrong, h, e, lv, fmt = String }) {
  const picks = [];
  for (const w of wrong) if (w !== ans && !picks.includes(w) && picks.length < 3) picks.push(w);
  let k = 1;
  while (picks.length < 3 && typeof ans === 'number') { const w = ans + k * (picks.length % 2 ? -1 : 1) * int(r, 1, 3); if (w !== ans && !picks.includes(w) && w > 0) picks.push(w); k++; if (k > 40) break; }
  const opts = shuffle(r, [ans, ...picks]);
  return { c: 'logic', q, o: opts.map(fmt), a: opts.indexOf(ans), h, e, lv };
}
const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const GEN = [
  { lv: 1, make(r) { const a = int(r, 1, 20), d = int(r, 2, 9), t = Array.from({ length: 5 }, (_, i) => a + i * d), ans = a + 5 * d;
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans + d, ans - d, ans + 1, ans - 1, ans + 2 * d], h: 'Tìm hiệu giữa hai số liên tiếp.', e: `Mỗi số hơn số trước ${d} đơn vị, nên số tiếp theo là ${ans}.`, lv: 1 }); } },
  { lv: 1, make(r) { const a = int(r, 3, 9), b = int(r, 3, 9), c = int(r, 1, 9), ans = a * b + c;
    return pack(r, { q: `Tính nhẩm: ${a} × ${b} + ${c} = ?`, ans, wrong: [a * b, ans + 10, ans - 10, a * (b + c), ans + 1], h: 'Nhân trước, cộng sau.', e: `${a} × ${b} = ${a * b}, cộng ${c} được ${ans}.`, lv: 1 }); } },
  { lv: 1, make(r) { const x = int(r, 0, 6), ans = DAYS[(x + 3) % 7];
    return pack(r, { q: `Hôm kia là ${DAYS[x]}. Vậy ngày mai là thứ mấy?`, ans, wrong: shuffle(r, DAYS.filter(d => d !== ans)), h: 'Đếm tiến từng ngày: hôm kia, hôm qua, hôm nay, ngày mai.', e: `Hôm kia ${DAYS[x]} thì hôm nay ${DAYS[(x + 2) % 7]}, ngày mai là ${ans}.`, lv: 1 }); } },
  { lv: 2, make(r) { const a = int(r, 1, 5), k = int(r, 2, 3), t = [a, a * k, a * k ** 2, a * k ** 3], ans = a * k ** 4;
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans + a, a * k ** 3 + k, ans - k, ans * 2, ans + k], h: 'Mỗi số gấp mấy lần số đứng trước?', e: `Mỗi số gấp ${k} lần số trước, nên số tiếp theo là ${ans}.`, lv: 2 }); } },
  { lv: 2, make(r) { const n = int(r, 2, 7), t = [0, 1, 2, 3].map(i => (n + i) ** 2), ans = (n + 4) ** 2;
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans + 2, ans - 2, ans + n, (n + 4) * 2 + t[3], ans - 1], h: 'Mỗi số là một số nhân với chính nó.', e: `Đó là các bình phương ${n}², ${n + 1}², ${n + 2}², ${n + 3}², nên số tiếp theo là ${n + 4}² = ${ans}.`, lv: 2 }); } },
  { lv: 2, make(r) { const s = int(r, 10, 30), a = int(r, 4, 9), b = int(r, 1, a - 1), t = [s, s + a, s + a - b, s + 2 * a - b, s + 2 * a - 2 * b], ans = s + 3 * a - 2 * b;
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans - a - b, ans + b, ans - 1, ans + 1, ans - a], h: 'Các bước đi lần lượt cộng rồi trừ, lặp lại.', e: `Dãy lần lượt cộng ${a} rồi trừ ${b}. Bước tiếp theo là cộng ${a}: ${ans}.`, lv: 2 }); } },
  { lv: 2, make(r) { const c = int(r, 4, 12), k = int(r, 3, 4), x = int(r, 2, 9), f = k * (c + x) - x;
    return pack(r, { q: `Cha ${f} tuổi, con ${c} tuổi. Sau mấy năm nữa tuổi cha gấp đúng ${k} lần tuổi con?`, ans: x, wrong: [x + 1, x - 1, x + 3, x + 2, x * 2], h: `Gọi số năm là x và lập phương trình ${f} + x = ${k} × (${c} + x).`, e: `${f} + x = ${k * c} + ${k}x nên x = ${x}. Khi đó cha ${f + x} tuổi, con ${c + x} tuổi.`, lv: 2, fmt: n => `${n} năm` }); } },
  { lv: 2, make(r) { const pct = [10, 20, 25, 30, 40, 50][int(r, 0, 5)], p = int(r, 4, 20) * 10000, ans = p - p * pct / 100;
    return pack(r, { q: `Một món hàng giá ${money(p)} được giảm ${pct}%. Giá sau khi giảm là bao nhiêu?`, ans, wrong: [p - pct * 100, p + p * pct / 100, p - p * pct / 50, p * pct / 100], h: `Tính số tiền được giảm trước: ${pct}% của ${money(p)}.`, e: `Giảm ${money(p * pct / 100)} nên giá còn ${money(ans)}.`, lv: 2, fmt: money }); } },
  { lv: 3, make(r) { const k = int(r, 1, 6), T = n => n * (n + 1) / 2, t = [0, 1, 2, 3, 4].map(i => T(k + i)), ans = T(k + 5);
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans + 1, ans - 1, ans + k, t[4] + 2 * (k + 4), ans + 2], h: 'Nhìn hiệu giữa các số liên tiếp: chúng tăng dần đều.', e: `Hiệu tăng lên 1 mỗi lần (${k + 1}, ${k + 2}, ${k + 3}, ${k + 4}, ${k + 5}), nên số tiếp theo là ${ans}.`, lv: 3 }); } },
  { lv: 3, make(r) { const s2 = int(r, 1, 3), d = int(r, 1, 5), a = int(r, 1, 9), t = [a]; let cur = a, step = d; for (let i = 0; i < 4; i++) { cur += step; t.push(cur); step += s2; } cur += step;
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans: cur, wrong: [cur + s2, cur - s2, cur + 1, cur - 1, cur + 2 * s2], h: 'Tìm hiệu, rồi tìm hiệu của các hiệu.', e: `Các hiệu là ${d}, ${d + s2}, ${d + 2 * s2}, ${d + 3 * s2}; hiệu tiếp theo ${d + 4 * s2}, nên số tiếp theo là ${cur}.`, lv: 3 }); } },
  { lv: 3, make(r) { const x1 = int(r, 1, 4), x2 = int(r, 1, 6), t = [x1, x2]; for (let i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]); const ans = t[5] + t[4];
    return pack(r, { q: `Số tiếp theo của dãy: ${t.join(', ')}, ...?`, ans, wrong: [ans + 1, ans - 1, t[5] * 2, ans + 2, ans - 2], h: 'Thử cộng hai số đứng ngay trước.', e: `Mỗi số bằng tổng hai số liền trước: ${t[4]} + ${t[5]} = ${ans}.`, lv: 3 }); } },
  { lv: 3, make(r) { const rb = int(r, 5, 20), ck = int(r, 8, 25), heads = rb + ck, legs = 2 * ck + 4 * rb;
    return pack(r, { q: `Vừa gà vừa thỏ nhốt chung có ${heads} cái đầu và ${legs} cái chân. Có bao nhiêu con thỏ?`, ans: rb, wrong: [ck, rb + 2, rb - 2, rb + 1, heads - rb - 1], h: 'Giả sử toàn bộ là gà, xem còn thừa bao nhiêu chân.', e: `Nếu cả ${heads} con là gà thì có ${heads * 2} chân, thừa ${legs - heads * 2}. Mỗi con thỏ hơn gà 2 chân nên có ${rb} con thỏ.`, lv: 3 }); } }
];

export function generate(r, level) {
  const pool = GEN.filter(g => g.lv === level);
  return (pool.length ? pool : GEN)[int(r, 0, (pool.length || GEN.length) - 1)].make(r);
}
// Chọn câu tiếp theo: ưu tiên ngân hàng (chưa dùng) đúng mức khó, hết thì sinh tự động. used là Set các id đã dùng.
export function pickQuestion(r, level, used = new Set(), seq = 0) {
  const lv = Math.max(1, Math.min(3, level));
  const fresh = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q, i }) => levelOf(q) === lv && !used.has('b' + i));
  if (fresh.length && r() < 0.55) {
    const { q, i } = fresh[int(r, 0, fresh.length - 1)];
    const order = shuffle(r, q.o.map((text, idx) => ({ text, ok: idx === q.a })));
    return { id: 'b' + i, c: q.c, lv, q: q.q, o: order.map(x => x.text), a: order.findIndex(x => x.ok), h: q.h, e: q.e };
  }
  return { ...generate(r, lv), id: 'g' + seq };
}
export const publicQuestion = q => ({ id: q.id, c: q.c, lv: q.lv, q: q.q, o: q.o });

// Quyền trợ giúp kiểu "Ai là triệu phú".
export function fifty(r, q) { return shuffle(r, [0, 1, 2, 3].filter(i => i !== q.a)).slice(0, 2).sort(); }
export function audience(r, q, removed = []) {
  const alive = [0, 1, 2, 3].filter(i => !removed.includes(i)), right = Math.max(35, Math.round(80 - 16 * (q.lv - 1) + int(r, -6, 6)));
  const rest = alive.filter(i => i !== q.a), out = [0, 0, 0, 0];
  let left = 100 - right;
  rest.forEach((i, k) => { const v = k === rest.length - 1 ? left : Math.min(left, int(r, 0, Math.ceil(left * (rest.length === 1 ? 1 : 0.7)))); out[i] = v; left -= v; });
  out[q.a] = 100 - out.reduce((a, b) => a + b, 0) + out[q.a];
  return out;
}
export function friend(r, q, removed = []) {
  const alive = [0, 1, 2, 3].filter(i => !removed.includes(i)), sureRight = [0.9, 0.75, 0.55][q.lv - 1] ?? 0.6;
  const ok = r() < sureRight, wrong = alive.filter(i => i !== q.a);
  return { pick: ok || !wrong.length ? q.a : wrong[int(r, 0, wrong.length - 1)], sure: ok ? int(r, 70, 95) : int(r, 40, 65) };
}
// Điểm một câu: gốc tăng theo mức khó, dùng Mẹo còn nửa, chuỗi đúng từ câu thứ ba được cộng, nhanh tay được thưởng thêm (nhiều người).
export function points({ lv = 1, hint = false, streak = 1, msLeft = 0, limit = 0 }) {
  let base = 10 + 5 * (lv - 1);
  if (hint) base = Math.ceil(base / 2);
  let bonus = !hint && streak >= 3 ? Math.min(streak - 2, 6) * 2 : 0;
  if (limit > 0 && msLeft > 0) bonus += Math.round((5 * msLeft) / limit);
  return base + bonus;
}
export const levelForStreak = streak => (streak < 3 ? 1 : streak < 7 ? 2 : 3);
export const levelForRound = round => (round <= 4 ? 1 : round <= 9 ? 2 : 3);
