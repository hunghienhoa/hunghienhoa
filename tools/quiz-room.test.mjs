import assert from 'node:assert/strict';
import test from 'node:test';
import { GameRoom, MAX_PLAYERS } from '../worker/game-room.mjs';

function makeCtx() {
  const data = new Map(), sockets = [];
  return {
    sockets, data,
    storage: { async get(k) { return data.has(k) ? structuredClone(data.get(k)) : undefined; }, async put(k, v) { data.set(k, structuredClone(v)); }, async deleteAll() { data.clear(); }, async setAlarm(t) { this.alarm = t; } },
    acceptWebSocket(ws) { sockets.push(ws); }, getWebSockets() { return sockets.filter(ws => !ws.closed); }
  };
}
class FakeSocket {
  constructor() { this.sent = []; this.closed = false; this.att = null; }
  send(m) { this.sent.push(JSON.parse(m)); } close() { this.closed = true; }
  serializeAttachment(v) { this.att = structuredClone(v); } deserializeAttachment() { return this.att; }
  last(t) { return this.sent.filter(m => m.t === t).at(-1); }
}
const connect = room => { const ws = new FakeSocket(); room.ctx.acceptWebSocket(ws); ws.serializeAttachment({ seat: null }); return ws; };
const say = (room, ws, msg) => { room.rate.clear(); return room.webSocketMessage(ws, JSON.stringify(msg)); };
async function create() {
  const room = new GameRoom(makeCtx(), {});
  const res = await room.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ code: 'ABC234', name: 'An' }) }));
  return { room, created: await res.json() };
}
async function joined(room, token, name) { const ws = connect(room); await say(room, ws, { t: 'hello', token, name }); return ws; }

test('phòng đố vui: nhiều người vào, chủ phòng bắt đầu, đề gửi đi không kèm đáp án', async () => {
  const { room, created } = await create();
  const a = await joined(room, created.token, 'An'), b = await joined(room, null, 'Bình'), c = await joined(room, null, 'Chi');
  assert.equal(a.last('state').players.length, 3);
  await say(room, b, { t: 'start' });
  assert.equal(b.last('error').message, 'Chỉ chủ phòng mới bắt đầu được.');
  await say(room, a, { t: 'start' });
  const s = b.last('state');
  assert.equal(s.status, 'asking'); assert.equal(s.round, 1);
  assert.ok(!('a' in s.q) && !('e' in s.q) && s.q.o.length === 4);
  assert.equal(s.reveal, null);
});

test('phòng đố vui: mọi người đã trả lời thì lộ đáp án, đúng được điểm và chuỗi, sai mất chuỗi', async () => {
  const { room, created } = await create();
  const a = await joined(room, created.token, 'An'), b = await joined(room, null, 'Bình');
  await say(room, a, { t: 'start' });
  const right = room.room.q.a, wrong = (right + 1) % 4;
  await say(room, a, { t: 'answer', n: 1, i: right });
  assert.equal(a.last('state').status, 'asking', 'chưa đủ người trả lời');
  assert.equal(b.last('state').players[0].answered, true);
  await say(room, b, { t: 'answer', n: 1, i: wrong });
  const s = a.last('state');
  assert.equal(s.status, 'reveal'); assert.equal(s.reveal.a, right);
  assert.equal(s.players[0].streak, 1); assert.ok(s.players[0].score >= 10);
  assert.equal(s.players[1].score, 0); assert.equal(s.players[1].streak, 0);
  // hết giờ xem đáp án thì sang câu mới
  room.room.endsAt = Date.now() - 1; await room.tick();
  assert.equal(a.last('state').status, 'asking'); assert.equal(a.last('state').round, 2);
});

test('phòng đố vui: 50:50, hỏi khán giả, gọi người thân chỉ riêng người dùng thấy và mỗi quyền một lần', async () => {
  const { room, created } = await create();
  const a = await joined(room, created.token, 'An'), b = await joined(room, null, 'Bình');
  await say(room, a, { t: 'start' });
  const right = room.room.q.a;
  await say(room, a, { t: 'life', n: 1, k: 'fifty' });
  const mine = a.last('state').mine;
  assert.equal(mine.removed.length, 2); assert.ok(!mine.removed.includes(right));
  assert.deepEqual(b.last('state').mine.removed, [], 'người khác không thấy');
  assert.equal(a.last('state').life.fifty, 0);
  await say(room, a, { t: 'life', n: 1, k: 'fifty' });
  assert.equal(a.last('error').message, 'Quyền trợ giúp này bạn đã dùng rồi.');
  await say(room, a, { t: 'answer', n: 1, i: mine.removed[0] });
  assert.equal(a.last('error').message, 'Đáp án chưa hợp lệ.');
  await say(room, a, { t: 'life', n: 1, k: 'audience' });
  assert.equal(a.last('state').mine.audience.reduce((x, y) => x + y, 0), 100);
  await say(room, a, { t: 'life', n: 1, k: 'friend' });
  assert.ok(a.last('state').mine.friend.pick >= 0);
  await say(room, a, { t: 'life', n: 1, k: 'hint' });
  assert.ok(a.last('state').mine.hint.length > 5);
});

test('phòng đố vui: đổi câu hỏi chỉ khi chưa ai trả lời và đổi cho cả phòng', async () => {
  const { room, created } = await create();
  const a = await joined(room, created.token, 'An'), b = await joined(room, null, 'Bình');
  await say(room, a, { t: 'start' });
  const before = room.room.q.id;
  await say(room, b, { t: 'answer', n: 1, i: 0 });
  await say(room, a, { t: 'life', n: 1, k: 'swap' });
  assert.equal(a.last('error').message, 'Đã có người trả lời nên không đổi câu được.');
  const two = await create(); const c = await joined(two.room, two.created.token, 'Chi'), d = await joined(two.room, null, 'Dũng');
  await say(two.room, c, { t: 'start' });
  const old = two.room.room.q.id;
  await say(two.room, c, { t: 'life', n: 1, k: 'swap' });
  assert.notEqual(two.room.room.q.id, old); assert.equal(d.last('state').swapped, 'An');
  assert.equal(c.last('state').life.swap, 0);
  assert.ok(before);
});

test('phòng đố vui: hết giờ thì chấm, rớt mạng không mất chuỗi, giới hạn số người', async () => {
  const { room, created } = await create();
  const a = await joined(room, created.token, 'An'), b = await joined(room, null, 'Bình');
  await say(room, a, { t: 'start' });
  const right = room.room.q.a;
  await say(room, a, { t: 'answer', n: 1, i: right });
  b.closed = true; await room.webSocketClose(b);
  assert.equal(a.last('state').status, 'reveal', 'người rớt mạng không giữ cả phòng');
  assert.equal(room.room.seats[1].streak, 0);
  const full = await create();
  for (let i = 0; i < MAX_PLAYERS + 2; i++) await joined(full.room, i ? null : full.created.token, 'P' + i);
  assert.equal(full.room.room.seats.length, MAX_PLAYERS);
  const idle = await create(); const x = await joined(idle.room, idle.created.token, 'X');
  await say(idle.room, x, { t: 'start' }); idle.room.room.endsAt = Date.now() - 1; await idle.room.alarm();
  assert.equal(x.last('state').status, 'reveal');
});
