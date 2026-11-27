import assert from 'node:assert/strict';
import test from 'node:test';
import { GameRoom, GAMES, capacityFor } from '../worker/game-room.mjs';
import worker from '../worker/index.mjs';

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
const say = (room, ws, msg) => room.webSocketMessage(ws, JSON.stringify(msg));
const quick = (room, ws, msg) => { room.rate.clear(); return say(room, ws, msg); }; // bỏ qua giới hạn chống spam khi máy thử gửi dồn dập
async function create(game, seats) {
  const room = new GameRoom(makeCtx(), {});
  const res = await room.fetch(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ code: 'ABC234', game, name: 'An', seats }) }));
  return { room, created: await res.json() };
}
const ago = (room, ms) => { room.room.turnStart = Date.now() - ms; };

test('phòng game: số ghế theo từng game', () => {
  assert.equal(capacityFor('tien-len', 3), 3);
  assert.equal(capacityFor('tien-len', 9), 4);
  assert.equal(capacityFor('o-an-quan', 4), 2);
  assert.equal(capacityFor('ca-ngua', 2), 2);
  assert.deepEqual(Object.keys(GAMES).sort(), ['ba-cay', 'ca-ngua', 'o-an-quan', 'phom', 'tien-len']);
});

test('phòng tiến lên: 2 người + 2 máy chơi hết ván, bài người khác bị ẩn, hết giờ thì máy đi hộ', async () => {
  const { room, created } = await create('tien-len', 4);
  const a = connect(room), b = connect(room);
  await say(room, a, { t: 'hello', token: created.token });
  await say(room, b, { t: 'hello', name: 'Bình' });
  assert.equal(b.last('joined').seat, 1);
  assert.equal(a.last('state').status, 'waiting');
  await say(room, b, { t: 'start' });
  const watcher = connect(room);
  await say(room, watcher, { t: 'hello', name: 'Khách' });
  assert.equal(watcher.last('state').you, null, 'vào sau khi đã bắt đầu thì là người xem');
  await say(room, watcher, { t: 'start' });
  const st = a.last('state');
  assert.equal(st.status, 'playing');
  assert.deepEqual(st.seats.map(x => x.bot), [false, false, true, true]);
  assert.equal(st.view.hand.length, 13);
  assert.equal(st.view.hands, undefined, 'không lộ bài người khác');
  assert.equal(watcher.last('state').view.hand, null);
  assert.ok(!JSON.stringify(watcher.last('state')).includes('"hands"'));
  const players = [a, b];
  const rules = GAMES['tien-len'];
  let guard = 0;
  while (room.room.status === 'playing' && guard++ < 500) {
    const seat = room.turnSeat();
    if (seat < 2) {
      if (guard % 7 === 0) { ago(room, 31000); await room.alarm(); continue; } // thỉnh thoảng để hết giờ
      const action = rules.bot(room.room.match, seat, Math.random, 'vua');
      await quick(room, players[seat], { t: 'act', action, n: room.room.match.moves });
    } else { ago(room, 2000); await room.alarm(); }
  }
  const end = a.last('state');
  assert.equal(end.status, 'ended');
  assert.equal(end.totals.reduce((x, y) => x + y, 0), 0);
  assert.ok(end.view.hands, 'hết ván thì lật bài');
  await say(room, a, { t: 'start' });
  assert.equal(a.last('state').round, 2);
});

test('phòng ô ăn quan: đủ 2 người tự bắt đầu, sai lượt bị từ chối, nước cũ chỉ nhận lại trạng thái', async () => {
  const { room, created } = await create('o-an-quan');
  const a = connect(room), b = connect(room);
  await say(room, a, { t: 'hello', token: created.token });
  await say(room, b, { t: 'hello', name: 'Bình' });
  const st = a.last('state');
  assert.equal(st.status, 'playing');
  const turn = st.turn, mover = turn === 0 ? a : b, other = turn === 0 ? b : a;
  await say(room, other, { t: 'act', action: { pit: 1, dir: 1 }, n: 0 });
  assert.equal(other.last('error').message, 'Chưa tới lượt bạn.');
  const pit = turn === 0 ? 3 : 9;
  await say(room, mover, { t: 'act', action: { pit, dir: 1 }, n: 0 });
  assert.equal(a.last('state').view.moves, 1);
  assert.ok(a.last('state').view.last.steps.length > 3);
  const count = mover.sent.length;
  await say(room, mover, { t: 'act', action: { pit, dir: 1 }, n: 0 });
  assert.ok(mover.sent.length === count + 1);
  await say(room, a, { t: 'emote', e: '😂' });
  assert.deepEqual(b.last('emote'), { t: 'emote', seat: 0, e: '😂' });
});

test('phòng cá ngựa: xúc xắc do máy chủ đổ, chơi một mình với 3 máy tới hết ván', async () => {
  const { room, created } = await create('ca-ngua', 4);
  const a = connect(room);
  await say(room, a, { t: 'hello', token: created.token });
  await say(room, a, { t: 'start' });
  const rules = GAMES['ca-ngua'];
  let guard = 0;
  while (room.room.status === 'playing' && guard++ < 6000) {
    if (room.turnSeat() === 0) await quick(room, a, { t: 'act', action: rules.bot(room.room.match, 0, Math.random), n: room.room.match.moves });
    else { ago(room, 1000); await room.alarm(); }
  }
  assert.equal(room.room.status, 'ended');
  assert.equal(a.last('state').totals.reduce((x, y) => x + y, 0), 0);
});

test('phòng game: ghép trận nhanh theo từng game', async () => {
  const objects = new Map(), env = {};
  env.GAMEROOM = { idFromName: n => n, get: n => { if (!objects.has(n)) objects.set(n, new GameRoom(makeCtx(), env)); const o = objects.get(n); return { fetch: (url, init) => o.fetch(new Request(url, init)) }; } };
  const lobby = env.GAMEROOM.get('lobby:tien-len');
  const first = await (await lobby.fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ game: 'tien-len', name: 'An' }) })).json();
  assert.equal(first.matched, false);
  const room = objects.get('tien-len:' + first.room);
  const host = connect(room); await say(room, host, { t: 'hello', token: first.token });
  const second = await (await lobby.fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ game: 'tien-len' }) })).json();
  assert.deepEqual(second, { room: first.room, game: 'tien-len', matched: true });
  const other = await (await env.GAMEROOM.get('lobby:o-an-quan').fetch('https://lobby/match', { method: 'POST', body: JSON.stringify({ game: 'o-an-quan' }) })).json();
  assert.equal(other.matched, false, 'game khác không ghép chung');
});

test('Worker: API phòng game kiểm tra game, nguồn và mã phòng', async () => {
  const calls = [];
  const env = { SUPABASE_URL: 'https://db.example.test', GAMEROOM: { idFromName: n => n, get: n => ({ fetch: async url => { calls.push(n); return Response.json({ room: 'ABC234', token: 't'.repeat(24), seat: 0, game: 'tien-len', capacity: 4 }); } }) } };
  const post = (body, origin = 'https://hunghienhoa.com') => worker.fetch(new Request('https://hunghienhoa.com/api/game/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) }), env);
  assert.equal((await post({ game: 'tien-len', seats: 4 })).status, 201);
  assert.match(calls[0], /^tien-len:[A-Z2-9]{6}$/);
  assert.equal((await post({ game: 'poker' })).status, 400);
  assert.equal((await post({ game: 'tien-len' }, 'https://evil.example')).status, 403);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/game/ws?game=tien-len&room=ABC234', { headers: { Upgrade: 'websocket', Origin: 'https://evil.example' } }), env)).status, 403);
  assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/game/ws?game=poker&room=ABC234', { headers: { Upgrade: 'websocket', Origin: 'https://hunghienhoa.com' } }), env)).status, 400);
});

test('phòng phỏm và ba cây: chơi với máy tới hết ván, bài người khác bị ẩn', async () => {
  for (const game of ['phom', 'ba-cay']) {
    const { room, created } = await create(game, 3);
    const a = connect(room);
    await say(room, a, { t: 'hello', token: created.token });
    await say(room, a, { t: 'start' });
    const first = a.last('state');
    assert.equal(first.status, 'playing');
    if (game === 'phom') { assert.ok(first.view.hand.length >= 9); assert.equal(first.view.hands, undefined); }
    else assert.ok(first.view.cards.every(h => h.every(x => x === null)));
    const rules = GAMES[game];
    let guard = 0;
    while (room.room.status === 'playing' && guard++ < 400) {
      if (room.turnSeat() === 0) await quick(room, a, { t: 'act', action: rules.bot(room.room.match, 0, Math.random), n: room.room.match.moves });
      else { ago(room, 2000); await room.alarm(); }
    }
    assert.equal(room.room.status, 'ended', game);
    assert.equal(a.last('state').totals.reduce((x, y) => x + y, 0), 0);
  }
});
