import assert from 'node:assert/strict';
import test from 'node:test';
import { XiangqiRoom, cleanName, isRoomCode, roomCode } from '../worker/xiangqi.mjs';
import { sq } from '../dist/cotuong/core.mjs';
import worker from '../worker/index.mjs';

const at = n => sq(+n.slice(1), n.charCodeAt(0) - 97);
function makeCtx() {
  const data = new Map(), sockets = [];
  return {
    sockets, data, alarm: 0,
    storage: {
      async get(k) { return data.has(k) ? structuredClone(data.get(k)) : undefined; },
      async put(k, v) { data.set(k, structuredClone(v)); },
      async deleteAll() { data.clear(); },
      async setAlarm(t) { this.alarm = t; }
    },
    acceptWebSocket(ws) { sockets.push(ws); },
    getWebSockets() { return sockets.filter(ws => !ws.closed); }
  };
}
class FakeSocket {
  constructor() { this.sent = []; this.closed = false; this.att = null; }
  send(m) { this.sent.push(JSON.parse(m)); }
  close() { this.closed = true; }
  serializeAttachment(v) { this.att = structuredClone(v); }
  deserializeAttachment() { return this.att; }
  last(t) { return this.sent.filter(m => m.t === t).at(-1); }
}
function connect(room) { const ws = new FakeSocket(); room.ctx.acceptWebSocket(ws); ws.serializeAttachment({ seat: null }); return ws; }
const say = (room, ws, msg) => room.webSocketMessage(ws, JSON.stringify(msg));
async function newRoom(env = {}) {
  const room = new XiangqiRoom(makeCtx(), env);
  const res = await room.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ code: 'ABC234', minutes: 10, name: 'An', color: 'r' }) }));
  return { room, created: await res.json() };
}

test('phòng cờ: mã phòng, tên người chơi được làm sạch', () => {
  assert.ok(isRoomCode(roomCode()) && !isRoomCode('abc234') && !isRoomCode('ABC10O'));
  assert.equal(cleanName('  <b>Hùng</b>\n  vui  '), 'bHùng/b vui');
  assert.match(cleanName(''), /^Kỳ thủ \d{3}$/);
  assert.equal(cleanName('x'.repeat(50)).length, 20);
});

test('phòng cờ: vào phòng, đi cờ, người xem, vào lại khi rớt mạng, kiểm tra lượt và nước sai', async () => {
  const { room, created } = await newRoom();
  assert.equal(created.color, 'r');
  assert.ok(created.token && created.token.length >= 20);
  assert.equal((await room.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ code: 'ABC234' }) }))).status, 409);
  const red = connect(room);
  await say(room, red, { t: 'hello', token: created.token });
  assert.equal(red.last('state').you, 'r');
  assert.equal(red.last('state').status, 'waiting');
  const black = connect(room);
  await say(room, black, { t: 'hello', name: 'Bình' });
  const joined = black.last('joined');
  assert.equal(joined.color, 'b');
  assert.equal(red.last('state').status, 'playing');
  assert.equal(red.last('state').players.b.name, 'Bình');
  await say(room, black, { t: 'move', from: at('h2'), to: at('e2'), n: 0 });
  assert.equal(black.last('error').message, 'Chưa tới lượt bạn.');
  await say(room, red, { t: 'move', from: at('h7'), to: at('e7'), n: 0 });
  assert.deepEqual(black.last('state').moves, [[at('h7'), at('e7')]]);
  await say(room, black, { t: 'move', from: at('a0'), to: at('a5'), n: 1 });
  assert.equal(black.last('error').message, 'Nước đi không hợp lệ.');
  const before = black.sent.length;
  await say(room, black, { t: 'move', from: at('h0'), to: at('g2'), n: 0 });
  assert.equal(black.sent.length, before + 1, 'nước gửi theo trạng thái cũ chỉ nhận lại trạng thái mới');
  const watcher = connect(room);
  await say(room, watcher, { t: 'hello', name: 'Khách' });
  assert.equal(watcher.last('state').you, null);
  assert.equal(red.last('state').spectators, 1);
  await say(room, watcher, { t: 'move', from: at('h0'), to: at('g2'), n: 1 });
  assert.match(watcher.last('error').message, /đang xem/);
  black.close();
  const again = connect(room);
  await say(room, again, { t: 'hello', token: joined.token });
  assert.equal(again.last('state').you, 'b');
  await say(room, again, { t: 'move', from: at('h0'), to: at('g2'), n: 1 });
  assert.equal(red.last('state').moves.length, 2);
  await say(room, again, { t: 'emote', e: '🔥' });
  assert.deepEqual(red.last('emote'), { t: 'emote', color: 'b', e: '🔥' });
  await say(room, again, { t: 'emote', e: '<script>' });
  assert.equal(red.sent.filter(m => m.t === 'emote').length, 1);
});

test('phòng cờ: xin hòa, đấu lại đổi màu, xin thua, hết giờ, dọn phòng', async () => {
  const { room, created } = await newRoom();
  const red = connect(room), black = connect(room);
  await say(room, red, { t: 'hello', token: created.token });
  await say(room, black, { t: 'hello', name: 'Bình' });
  await say(room, red, { t: 'draw' });
  assert.equal(black.last('state').drawOffer, 'r');
  await say(room, black, { t: 'draw' });
  assert.deepEqual(red.last('state').result, { winner: null, reason: 'agreement' });
  await say(room, red, { t: 'rematch' });
  assert.equal(black.last('state').rematch.r, true);
  await say(room, black, { t: 'rematch' });
  const fresh = red.last('state');
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.you, 'b', 'đấu lại thì đổi màu');
  assert.equal(black.last('state').you, 'r');
  await say(room, black, { t: 'resign' });
  assert.deepEqual(red.last('state').result, { winner: 'b', reason: 'resign' });
  await say(room, red, { t: 'rematch' }); await say(room, black, { t: 'rematch' });
  room.state.clock.r = 5; room.state.turnStartedAt = Date.now() - 1000;
  await room.alarm();
  assert.deepEqual(red.last('state').result, { winner: 'b', reason: 'timeout' });
  room.state.updatedAt = Date.now() - 3 * 3600_000;
  await room.alarm();
  assert.equal(room.ctx.data.size, 0, 'phòng bỏ trống quá 2 giờ thì xóa');
  assert.ok(red.closed);
});

test('phòng cờ: ghép trận nhanh nối hai người cùng thời lượng', async () => {
  const objects = new Map();
  const env = {};
  env.XIANGQI = {
    idFromName: name => name,
    get: name => {
      if (!objects.has(name)) objects.set(name, new XiangqiRoom(makeCtx(), env));
      const obj = objects.get(name);
      return { fetch: (url, init) => obj.fetch(new Request(url, init)) };
    }
  };
  const lobby = env.XIANGQI.get('lobby');
  const first = await (await lobby.fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ minutes: 5, name: 'An' }) })).json();
  assert.equal(first.matched, false);
  const room = objects.get('room:' + first.room);
  const host = connect(room);
  await room.webSocketMessage(host, JSON.stringify({ t: 'hello', token: first.token }));
  const other = await (await lobby.fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ minutes: 10 }) })).json();
  assert.equal(other.matched, false, 'khác thời lượng thì không ghép');
  const second = await (await lobby.fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ minutes: 5 }) })).json();
  assert.deepEqual(second, { room: first.room, matched: true });
});

test('Worker: API cờ tướng tạo phòng, chặn WebSocket sai nguồn hoặc sai mã', async () => {
  const calls = [];
  const env = { SUPABASE_URL: 'https://db.example.test', XIANGQI: { idFromName: n => n, get: n => ({ fetch: async (url, init) => { calls.push([n, String(url)]); return Response.json({ room: 'ABC234', token: 't'.repeat(24), color: 'r', minutes: 5 }); } }) } };
  const res = await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://hunghienhoa.com' }, body: JSON.stringify({ minutes: 5, color: 'r' }) }), env);
  assert.equal(res.status, 201);
  assert.match(calls[0][0], /^room:[A-Z2-9]{6}$/);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' }), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/ws?room=ABC234'), env)).status, 426);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/ws?room=ABC234', { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } }), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/ws?room=abc', { headers: { Upgrade: 'websocket', Origin: 'https://hunghienhoa.com' } }), env)).status, 400);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/cotuong/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), {})).status, 503);
});
