// Phòng cờ tướng online (Durable Object, WebSocket ngủ đông để không tốn tài nguyên khi không ai đi).
// Mỗi phòng một đối tượng: giữ hai ghế Đỏ/Đen, mã ghế bí mật để vào lại khi rớt mạng, danh sách nước đi,
// đồng hồ mỗi bên và kết quả. Máy chủ kiểm tra mọi nước bằng chính bộ luật trong dist/cotuong/core.mjs.
// Đối tượng tên "lobby" dùng để ghép trận nhanh. Phòng tự xóa sau 2 giờ không hoạt động.
import { Game, RED, BLACK, other } from '../dist/cotuong/core.mjs';

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MINUTES = [5, 10, 15];
export const EMOTES = ['👍', '😮', '😂', '🔥'];
const IDLE_MS = 2 * 3600_000;
const MATCH_WAIT_MS = 3 * 60_000;
const MAX_MESSAGE = 2048;

export const isRoomCode = code => typeof code === 'string' && new RegExp(`^[${ROOM_ALPHABET}]{6}$`).test(code);
export function roomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}
export function cleanName(value) {
  const name = String(value ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return name.length >= 2 ? name : 'Kỳ thủ ' + String(100 + (crypto.getRandomValues(new Uint16Array(1))[0] % 900));
}
const newToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
async function digest(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export class XiangqiRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    this.state = null; this.game = null; this.rate = new Map();
  }

  async load() {
    if (this.state) return this.state;
    this.state = (await this.ctx.storage.get('state')) || null;
    if (this.state && this.state.code) this.game = this.replay(this.state.moves);
    return this.state;
  }
  replay(moves) {
    const g = new Game();
    for (const [f, t] of moves || []) if (!g.move(f, t)) break;
    return g;
  }
  async save() { this.state.updatedAt = Date.now(); await this.ctx.storage.put('state', this.state); await this.schedule(); }
  async schedule() {
    const s = this.state;
    let next = (s.updatedAt || Date.now()) + IDLE_MS;
    if (s.status === 'playing' && s.turnStartedAt) next = Math.min(next, s.turnStartedAt + Math.max(0, s.clock[this.game.turn]) + 50);
    await this.ctx.storage.setAlarm(next);
  }

  // ---------- HTTP nội bộ (Worker gọi) ----------
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/match') return this.match(request);
    await this.load();
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.state?.code) return json({ error: 'exists' }, 409);
      const body = await request.json().catch(() => ({}));
      if (!isRoomCode(body.code)) return json({ error: 'bad code' }, 400);
      const minutes = MINUTES.includes(Number(body.minutes)) ? Number(body.minutes) : 10;
      const color = body.color === RED || body.color === BLACK ? body.color : (crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? RED : BLACK);
      const token = newToken();
      this.state = {
        code: body.code, minutes, createdAt: Date.now(), updatedAt: Date.now(), status: 'waiting', matchmaking: !!body.matchmaking,
        seats: { [RED]: null, [BLACK]: null }, moves: [], clock: { [RED]: minutes * 60000, [BLACK]: minutes * 60000 },
        turnStartedAt: 0, result: null, drawOffer: null, rematch: { [RED]: false, [BLACK]: false }, games: 1
      };
      this.state.seats[color] = { token: await digest(token), name: cleanName(body.name) };
      this.game = new Game();
      await this.save();
      return json({ room: body.code, token, color, minutes });
    }
    if (url.pathname === '/peek') {
      const s = this.state;
      if (!s?.code) return json({ status: 'missing' });
      return json({ status: s.status, minutes: s.minutes, online: this.online() });
    }
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!this.state?.code) return new Response('Phòng không tồn tại hoặc đã hết hạn.', { status: 404 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ seat: null });
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response(null, { status: 404 });
  }

  // Ghép trận nhanh (chỉ đối tượng "lobby"): người đến sau vào phòng của người đang chờ cùng thời lượng.
  async match(request) {
    const body = await request.json().catch(() => ({}));
    const minutes = MINUTES.includes(Number(body.minutes)) ? Number(body.minutes) : 10;
    const waiting = (await this.ctx.storage.get('waiting')) || {};
    const entry = waiting[minutes];
    delete waiting[minutes];
    await this.ctx.storage.put('waiting', waiting);
    if (entry && Date.now() - entry.at < MATCH_WAIT_MS) {
      const peek = await this.env.XIANGQI.get(this.env.XIANGQI.idFromName('room:' + entry.room)).fetch('https://room/peek').then(r => r.json()).catch(() => null);
      if (peek?.status === 'waiting' && peek.online >= 1) return json({ room: entry.room, matched: true });
    }
    for (let i = 0; i < 4; i++) {
      const code = roomCode();
      const res = await this.env.XIANGQI.get(this.env.XIANGQI.idFromName('room:' + code)).fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, minutes, name: body.name, matchmaking: true }) });
      if (res.status === 409) continue;
      const data = await res.json();
      waiting[minutes] = { room: code, at: Date.now() };
      await this.ctx.storage.put('waiting', waiting);
      return json({ ...data, matched: false });
    }
    return json({ error: 'Chưa tạo được phòng.' }, 503);
  }

  // ---------- WebSocket ----------
  sockets() { return this.ctx.getWebSockets(); }
  seatOf(ws) { try { return ws.deserializeAttachment()?.seat || null; } catch { return null; } }
  online() { const seats = new Set(this.sockets().map(ws => this.seatOf(ws)).filter(Boolean)); return seats.size; }
  send(ws, value) { try { ws.send(JSON.stringify(value)); } catch { /* kết nối đã đóng */ } }
  view(seat) {
    const s = this.state, now = Date.now();
    const clock = { ...s.clock };
    if (s.status === 'playing' && s.turnStartedAt) clock[this.game.turn] = Math.max(0, clock[this.game.turn] - (now - s.turnStartedAt));
    const online = new Set(this.sockets().map(ws => this.seatOf(ws)));
    const player = c => (s.seats[c] ? { name: s.seats[c].name, online: online.has(c) } : null);
    return {
      t: 'state', code: s.code, minutes: s.minutes, status: s.status, you: seat, turn: this.game.turn,
      players: { [RED]: player(RED), [BLACK]: player(BLACK) }, moves: s.moves, clock, running: s.status === 'playing',
      result: s.result, drawOffer: s.drawOffer, rematch: s.rematch, check: s.status === 'playing' && this.game.inCheck(), games: s.games,
      spectators: this.sockets().filter(ws => !this.seatOf(ws)).length, serverTime: now
    };
  }
  broadcast() { for (const ws of this.sockets()) this.send(ws, this.view(this.seatOf(ws))); }
  allowed(ws) {
    const now = Date.now(), list = (this.rate.get(ws) || []).filter(t => now - t < 5000);
    list.push(now); this.rate.set(ws, list);
    return list.length <= 25;
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE) { ws.close(1009, 'Tin nhắn quá lớn'); return; }
    if (!this.allowed(ws)) { this.send(ws, { t: 'error', message: 'Bạn thao tác hơi nhanh, chờ một chút nhé.' }); return; }
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    await this.load();
    const s = this.state;
    if (!s?.code) { this.send(ws, { t: 'error', message: 'Phòng không tồn tại hoặc đã hết hạn.' }); ws.close(4404, 'missing'); return; }
    await this.timeoutCheck();
    const seat = this.seatOf(ws);
    switch (msg.t) {
      case 'ping': this.send(ws, { t: 'pong', serverTime: Date.now() }); return;
      case 'hello': return this.hello(ws, msg);
      case 'move': return this.move(ws, seat, msg);
      case 'resign':
        if (!seat || s.status !== 'playing') return;
        return this.finish(other(seat), 'resign');
      case 'draw':
        if (!seat || s.status !== 'playing') return;
        if (s.drawOffer === other(seat)) return this.finish(null, 'agreement');
        s.drawOffer = seat; await this.save(); this.broadcast(); return;
      case 'decline':
        if (!seat || s.drawOffer !== other(seat)) return;
        s.drawOffer = null; await this.save(); this.broadcast(); return;
      case 'rematch': return this.rematch(seat);
      case 'emote':
        if (!seat || !EMOTES.includes(msg.e)) return;
        for (const peer of this.sockets()) this.send(peer, { t: 'emote', color: seat, e: msg.e });
        return;
      default: return;
    }
  }

  async hello(ws, msg) {
    const s = this.state;
    let seat = null;
    if (typeof msg.token === 'string' && msg.token.length <= 64) {
      const hash = await digest(msg.token);
      seat = [RED, BLACK].find(c => s.seats[c]?.token === hash) || null;
    }
    let token = null;
    if (!seat && s.status === 'waiting') {
      seat = [RED, BLACK].find(c => !s.seats[c]) || null;
      if (seat) { token = newToken(); s.seats[seat] = { token: await digest(token), name: cleanName(msg.name) }; }
    }
    ws.serializeAttachment({ seat });
    if (seat && s.status === 'waiting' && s.seats[RED] && s.seats[BLACK]) { s.status = 'playing'; s.turnStartedAt = Date.now(); }
    await this.save();
    if (token) this.send(ws, { t: 'joined', token, color: seat });
    this.broadcast();
  }

  async move(ws, seat, msg) {
    const s = this.state, g = this.game;
    if (!seat || s.status !== 'playing') return this.send(ws, { t: 'error', message: 'Ván cờ chưa bắt đầu hoặc bạn đang xem.' });
    if (g.turn !== seat) return this.send(ws, { t: 'error', message: 'Chưa tới lượt bạn.' });
    if (msg.n !== s.moves.length) return this.send(ws, this.view(seat)); // trạng thái cũ: gửi lại bản mới nhất
    const from = Number(msg.from), to = Number(msg.to);
    const now = Date.now(), left = s.clock[seat] - (now - s.turnStartedAt);
    if (left <= 0) return this.finish(other(seat), 'timeout');
    const rec = g.move(from, to);
    if (!rec) return this.send(ws, { t: 'error', message: 'Nước đi không hợp lệ.' });
    s.clock[seat] = left;
    s.moves.push([from, to]);
    s.turnStartedAt = now;
    s.drawOffer = null;
    if (g.result) return this.finish(g.result.winner, g.result.reason);
    await this.save();
    this.broadcast();
  }

  async finish(winner, reason) {
    const s = this.state;
    if (s.status === 'playing' && s.turnStartedAt) s.clock[this.game.turn] = Math.max(0, s.clock[this.game.turn] - (Date.now() - s.turnStartedAt));
    s.status = 'ended'; s.result = { winner, reason }; s.drawOffer = null; s.turnStartedAt = 0;
    s.rematch = { [RED]: false, [BLACK]: false };
    await this.save();
    this.broadcast();
  }

  async rematch(seat) {
    const s = this.state;
    if (!seat || s.status !== 'ended' || !s.seats[RED] || !s.seats[BLACK]) return;
    s.rematch[seat] = true;
    if (s.rematch[RED] && s.rematch[BLACK]) {
      // Ván mới đổi màu: người cầm Đen ván trước được đi trước.
      s.seats = { [RED]: s.seats[BLACK], [BLACK]: s.seats[RED] };
      for (const ws of this.sockets()) { const c = this.seatOf(ws); if (c) ws.serializeAttachment({ seat: other(c) }); }
      s.moves = []; s.result = null; s.drawOffer = null; s.status = 'playing'; s.games++;
      s.clock = { [RED]: s.minutes * 60000, [BLACK]: s.minutes * 60000 }; s.turnStartedAt = Date.now();
      s.rematch = { [RED]: false, [BLACK]: false };
      this.game = new Game();
    }
    await this.save();
    this.broadcast();
  }

  async timeoutCheck() {
    const s = this.state;
    if (s?.status === 'playing' && s.turnStartedAt && Date.now() - s.turnStartedAt >= s.clock[this.game.turn]) {
      await this.finish(other(this.game.turn), 'timeout');
      return true;
    }
    return false;
  }

  async webSocketClose(ws) { this.rate.delete(ws); await this.load(); if (this.state?.code) this.broadcast(); }
  async webSocketError(ws) { this.rate.delete(ws); }

  async alarm() {
    await this.load();
    if (!this.state?.code) return;
    if (await this.timeoutCheck()) return;
    if (Date.now() - (this.state.updatedAt || 0) >= IDLE_MS) {
      for (const ws of this.sockets()) { try { ws.close(4410, 'Phòng đã hết hạn'); } catch { /* bỏ qua */ } }
      await this.ctx.storage.deleteAll();
      this.state = null; this.game = null;
      return;
    }
    await this.schedule();
  }
}
