// Phòng chơi online dùng chung cho các game pixel (Tiến Lên, Phỏm, Ba Cây) — Durable Object, WebSocket ngủ đông.
// Luật mỗi game nằm trong dist/game/<game>/rules.mjs (dùng chung với trình duyệt): setup, apply, view, turn, bot.
// Máy chủ giữ toàn bộ trạng thái (bài trên tay, xúc xắc), chỉ gửi cho mỗi người phần họ được thấy.
// Ghế trống được máy lấp khi bắt đầu; người chơi hết giờ lượt (hoặc rớt mạng) thì máy đi hộ để ván không bị treo.
import * as tienLen from '../dist/game/tien-len/rules.mjs';
import * as phom from '../dist/game/phom/rules.mjs';
import * as baCay from '../dist/game/ba-cay/rules.mjs';
import { ROOM_ALPHABET, isRoomCode, roomCode, cleanName, EMOTES } from './xiangqi.mjs';

export const GAMES = { 'tien-len': tienLen, phom, 'ba-cay': baCay };
export const isGame = g => typeof g === 'string' && Object.prototype.hasOwnProperty.call(GAMES, g);
export { ROOM_ALPHABET, isRoomCode, roomCode };
const BOT_DELAY = { 'tien-len': 1100, phom: 1100, 'ba-cay': 750 };
const IDLE_MS = 2 * 3600_000, MATCH_WAIT_MS = 5 * 60_000, MAX_MESSAGE = 4096;
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const newToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
async function digest(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export function capacityFor(game, seats) {
  const meta = GAMES[game].meta;
  const n = Number(seats);
  return Number.isInteger(n) && n >= meta.minSeats && n <= meta.seats ? n : meta.seats;
}

export class GameRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.room = null; this.rate = new Map(); }
  async load() { if (!this.room) this.room = (await this.ctx.storage.get('room')) || null; return this.room; }
  rules() { return GAMES[this.room.game]; }
  async save() { this.room.updatedAt = Date.now(); await this.ctx.storage.put('room', this.room); await this.schedule(); }
  turnSeat() { const r = this.room; return r.status === 'playing' && r.match ? this.rules().turn(r.match) : -1; }
  async schedule() {
    const r = this.room;
    let next = r.updatedAt + IDLE_MS;
    const seat = this.turnSeat();
    if (seat >= 0) next = Math.min(next, r.seats[seat]?.bot ? r.turnStart + BOT_DELAY[r.game] : r.turnStart + this.rules().meta.turnMs + 300);
    await this.ctx.storage.setAlarm(next);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/match') return this.match(request);
    await this.load();
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.room?.code) return json({ error: 'exists' }, 409);
      const body = await request.json().catch(() => ({}));
      if (!isRoomCode(body.code) || !isGame(body.game)) return json({ error: 'bad request' }, 400);
      const capacity = capacityFor(body.game, body.seats), token = newToken();
      this.room = { game: body.game, code: body.code, capacity, createdAt: Date.now(), updatedAt: Date.now(), status: 'waiting',
        seats: Array(capacity).fill(null), match: null, round: 0, totals: Array(capacity).fill(0), turnStart: 0 };
      this.room.seats[0] = { token: await digest(token), name: cleanName(body.name), bot: false };
      await this.save();
      return json({ room: body.code, token, seat: 0, game: body.game, capacity });
    }
    if (url.pathname === '/peek') {
      const r = this.room;
      if (!r?.code) return json({ status: 'missing' });
      return json({ status: r.status, game: r.game, capacity: r.capacity, open: r.seats.filter(x => !x).length, online: this.online() });
    }
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!this.room?.code) return new Response('Phòng không tồn tại hoặc đã hết hạn.', { status: 404 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ seat: null });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response(null, { status: 404 });
  }

  // Ghép trận nhanh (đối tượng "lobby:<game>"): vào phòng đang chờ còn ghế của cùng game, không có thì tạo phòng mới.
  async match(request) {
    const body = await request.json().catch(() => ({}));
    if (!isGame(body.game)) return json({ error: 'bad game' }, 400);
    const list = ((await this.ctx.storage.get('waiting')) || []).filter(e => Date.now() - e.at < MATCH_WAIT_MS);
    const stub = code => this.env.GAMEROOM.get(this.env.GAMEROOM.idFromName(body.game + ':' + code));
    for (const entry of [...list]) {
      const peek = await stub(entry.room).fetch('https://room/peek').then(r => r.json()).catch(() => null);
      if (peek?.status === 'waiting' && peek.open > 0 && peek.online >= 1) {
        if (peek.open === 1) list.splice(list.indexOf(entry), 1);
        await this.ctx.storage.put('waiting', list);
        return json({ room: entry.room, game: body.game, matched: true });
      }
      list.splice(list.indexOf(entry), 1);
    }
    for (let i = 0; i < 4; i++) {
      const code = roomCode();
      const res = await stub(code).fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, game: body.game, name: body.name, seats: body.seats }) });
      if (res.status === 409) continue;
      const data = await res.json();
      list.push({ room: code, at: Date.now() });
      await this.ctx.storage.put('waiting', list.slice(-20));
      return json({ ...data, matched: false });
    }
    return json({ error: 'Chưa tạo được phòng.' }, 503);
  }

  sockets() { return this.ctx.getWebSockets(); }
  seatOf(ws) { try { const s = ws.deserializeAttachment()?.seat; return Number.isInteger(s) ? s : null; } catch { return null; } }
  online() { return new Set(this.sockets().map(ws => this.seatOf(ws)).filter(s => s !== null)).size; }
  send(ws, value) { try { ws.send(JSON.stringify(value)); } catch { /* đã đóng */ } }
  view(seat) {
    const r = this.room, online = new Set(this.sockets().map(ws => this.seatOf(ws)));
    const turn = this.turnSeat();
    return {
      t: 'state', game: r.game, code: r.code, status: r.status, capacity: r.capacity, you: seat, round: r.round, totals: r.totals,
      seats: r.seats.map((x, i) => (x ? { name: x.name, bot: !!x.bot, online: x.bot || online.has(i) } : null)),
      view: r.match ? this.rules().view(r.match, seat ?? -1) : null, turn,
      deadline: turn >= 0 && !r.seats[turn]?.bot ? Math.max(0, r.turnStart + this.rules().meta.turnMs - Date.now()) : 0,
      spectators: this.sockets().filter(ws => this.seatOf(ws) === null).length, serverTime: Date.now()
    };
  }
  broadcast() { for (const ws of this.sockets()) this.send(ws, this.view(this.seatOf(ws))); }
  allowed(ws) { const now = Date.now(), list = (this.rate.get(ws) || []).filter(t => now - t < 5000); list.push(now); this.rate.set(ws, list); return list.length <= 30; }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE) { ws.close(1009, 'Tin nhắn quá lớn'); return; }
    if (!this.allowed(ws)) { this.send(ws, { t: 'error', message: 'Bạn thao tác hơi nhanh, chờ một chút nhé.' }); return; }
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    await this.load();
    if (!this.room?.code) { this.send(ws, { t: 'error', message: 'Phòng không tồn tại hoặc đã hết hạn.' }); ws.close(4404, 'missing'); return; }
    const seat = this.seatOf(ws);
    if (msg.t === 'ping') { await this.tick(); this.send(ws, { t: 'pong', serverTime: Date.now() }); return; }
    if (msg.t === 'hello') return this.hello(ws, msg);
    if (msg.t === 'start') return this.start(seat);
    if (msg.t === 'act') return this.act(ws, seat, msg);
    if (msg.t === 'emote' && seat !== null && EMOTES.includes(msg.e)) { for (const peer of this.sockets()) this.send(peer, { t: 'emote', seat, e: msg.e }); }
  }

  async hello(ws, msg) {
    const r = this.room;
    let seat = null, token = null;
    if (typeof msg.token === 'string' && msg.token.length <= 64) {
      const hash = await digest(msg.token);
      const i = r.seats.findIndex(x => x && !x.bot && x.token === hash);
      if (i >= 0) seat = i;
    }
    if (seat === null && r.status === 'waiting') {
      const i = r.seats.findIndex(x => !x);
      if (i >= 0) { token = newToken(); r.seats[i] = { token: await digest(token), name: cleanName(msg.name), bot: false }; seat = i; }
    }
    ws.serializeAttachment({ seat });
    if (r.status === 'waiting' && r.seats.every(x => x && !x.bot)) await this.begin();
    else await this.save();
    if (token) this.send(ws, { t: 'joined', token, seat });
    this.broadcast();
  }
  async begin() {
    const r = this.room;
    let k = 1;
    r.seats = r.seats.map(x => x || { name: 'Máy ' + k++, bot: true });
    r.match = this.rules().setup(r.capacity, rng, r.match);
    r.status = r.match.result ? 'ended' : 'playing';
    r.round++; r.turnStart = Date.now();
    if (r.match.result) this.score(r.match.result);
    await this.save();
  }
  async start(seat) {
    const r = this.room;
    if (seat === null || r.seats[seat]?.bot || !['waiting', 'ended'].includes(r.status)) return;
    await this.begin();
    this.broadcast();
  }
  score(result) { for (const { seat, delta } of result.scores || []) this.room.totals[seat] += delta; }
  async perform(seat, action, auto = false) {
    const r = this.room, rules = this.rules();
    const { state } = rules.apply(r.match, seat, action, rng);
    r.match = state;
    if (auto && state.last) state.last.auto = true;
    r.turnStart = Date.now();
    if (state.result) { r.status = 'ended'; this.score(state.result); }
  }
  async act(ws, seat, msg) {
    const r = this.room;
    if (seat === null || r.status !== 'playing') return this.send(ws, { t: 'error', message: 'Ván chưa bắt đầu hoặc bạn đang xem.' });
    if (this.turnSeat() !== seat) return this.send(ws, { t: 'error', message: 'Chưa tới lượt bạn.' });
    if (msg.n !== r.match.moves) return this.send(ws, this.view(seat));
    try { await this.perform(seat, msg.action); }
    catch (e) { return this.send(ws, { t: 'error', message: e instanceof Error ? e.message : 'Thao tác chưa hợp lệ.' }); }
    await this.save();
    this.broadcast();
  }
  // Đi hộ: máy tới lượt, hoặc người chơi hết giờ.
  async tick() {
    const r = this.room;
    let changed = false;
    for (let guard = 0; guard < 3; guard++) {
      const seat = this.turnSeat();
      if (seat < 0) break;
      const bot = r.seats[seat]?.bot, wait = bot ? BOT_DELAY[r.game] : this.rules().meta.turnMs;
      if (Date.now() - r.turnStart < wait) break;
      const rules = this.rules();
      const action = bot ? rules.bot(r.match, seat, rng, 'vua') : rules.auto(r.match, seat, rng);
      try { await this.perform(seat, action, !bot); changed = true; } catch { break; }
      if (bot) break; // mỗi lần chỉ một nước máy để người xem kịp theo dõi
    }
    if (changed) { await this.save(); this.broadcast(); }
    return changed;
  }
  async webSocketClose(ws) { this.rate.delete(ws); await this.load(); if (this.room?.code) this.broadcast(); }
  async webSocketError(ws) { this.rate.delete(ws); }
  async alarm() {
    await this.load();
    if (!this.room?.code) return;
    if (Date.now() - this.room.updatedAt >= IDLE_MS) {
      for (const ws of this.sockets()) { try { ws.close(4410, 'Phòng đã hết hạn'); } catch { /* bỏ qua */ } }
      await this.ctx.storage.deleteAll(); this.room = null; return;
    }
    if (!(await this.tick())) await this.schedule();
  }
}
