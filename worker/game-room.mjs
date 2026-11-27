// Phòng Đố Vui nhiều người — Durable Object `GameRoom`, WebSocket ngủ đông.
// Máy chủ giữ đáp án và chỉ gửi đề (không kèm đáp án) cho tới khi hết giờ hoặc mọi người đã trả lời.
// Câu hỏi không giới hạn (xem dist/game/do-vui/engine.mjs), mỗi người có chuỗi đúng và 4 quyền trợ giúp riêng.
import { pickQuestion, publicQuestion, fifty, audience, friend, points, levelForRound, LIFELINES } from '../dist/game/do-vui/engine.mjs';
import { isRoomCode, roomCode, cleanName, EMOTES } from './xiangqi.mjs';

export { isRoomCode, roomCode };
export const MAX_PLAYERS = 8;
const ASK_MS = 25_000, REVEAL_MS = 7_000, IDLE_MS = 2 * 3600_000, MAX_MESSAGE = 1024;
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const newToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18)))).replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c]));
async function digest(text) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const freshLife = () => Object.fromEntries(LIFELINES.map(k => [k, 1]));
const freshPlayer = (token, name) => ({ token, name, score: 0, streak: 0, best: 0, right: 0, life: freshLife() });

export class GameRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.room = null; this.rate = new Map(); }
  async load() { if (!this.room) this.room = (await this.ctx.storage.get('room')) || null; return this.room; }
  async save() { this.room.updatedAt = Date.now(); await this.ctx.storage.put('room', this.room); await this.schedule(); }
  async schedule() {
    const r = this.room;
    let next = r.updatedAt + IDLE_MS;
    if (r.status === 'asking') next = Math.min(next, r.endsAt + 50);
    if (r.status === 'reveal') next = Math.min(next, r.endsAt + 50);
    await this.ctx.storage.setAlarm(next);
  }

  async fetch(request) {
    const url = new URL(request.url);
    await this.load();
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.room?.code) return json({ error: 'exists' }, 409);
      const body = await request.json().catch(() => ({}));
      if (!isRoomCode(body.code)) return json({ error: 'bad request' }, 400);
      const token = newToken();
      this.room = { code: body.code, createdAt: Date.now(), updatedAt: Date.now(), status: 'waiting', seats: [freshPlayer(await digest(token), cleanName(body.name))], round: 0, used: [], q: null, answers: {}, priv: {}, endsAt: 0, reveal: null, swapped: null, seq: 0 };
      await this.save();
      return json({ room: body.code, token, seat: 0 });
    }
    if (url.pathname === '/peek') {
      const r = this.room;
      if (!r?.code) return json({ status: 'missing' });
      return json({ status: r.status, players: r.seats.length, open: MAX_PLAYERS - r.seats.length, online: this.online() });
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

  sockets() { return this.ctx.getWebSockets(); }
  seatOf(ws) { try { const s = ws.deserializeAttachment()?.seat; return Number.isInteger(s) ? s : null; } catch { return null; } }
  onlineSet() { return new Set(this.sockets().map(ws => this.seatOf(ws)).filter(s => s !== null)); }
  online() { return this.onlineSet().size; }
  send(ws, value) { try { ws.send(JSON.stringify(value)); } catch { /* đã đóng */ } }
  allowed(ws) { const now = Date.now(), list = (this.rate.get(ws) || []).filter(t => now - t < 5000); list.push(now); this.rate.set(ws, list); return list.length <= 20; }

  view(seat) {
    const r = this.room, online = this.onlineSet(), now = Date.now(), q = r.q, mine = seat !== null ? r.priv[seat] : null;
    const revealing = r.status === 'reveal';
    return {
      t: 'state', code: r.code, status: r.status, you: seat, host: 0, round: r.round, serverTime: now,
      players: r.seats.map((p, i) => ({ name: p.name, online: online.has(i), score: p.score, streak: p.streak, best: p.best, right: p.right, answered: i in r.answers })),
      q: q ? publicQuestion(q) : null,
      msLeft: r.status === 'asking' || revealing ? Math.max(0, r.endsAt - now) : 0, limit: r.status === 'asking' ? ASK_MS : REVEAL_MS,
      reveal: revealing ? { a: q.a, e: q.e, results: r.reveal } : null,
      life: seat !== null ? r.seats[seat].life : null,
      mine: seat !== null && q ? { removed: mine?.removed || [], audience: mine?.audience || null, friend: mine?.friend || null, hint: mine?.hint ? q.h : null, pick: r.answers[seat]?.pick ?? null } : null,
      swapped: r.swapped, spectators: this.sockets().filter(ws => this.seatOf(ws) === null).length
    };
  }
  broadcast() { for (const ws of this.sockets()) this.send(ws, this.view(this.seatOf(ws))); }

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
    if (msg.t === 'start') return this.start(ws, seat);
    if (msg.t === 'stop') return this.stop(ws, seat);
    if (msg.t === 'answer') return this.answer(ws, seat, msg);
    if (msg.t === 'life') return this.life(ws, seat, msg);
    if (msg.t === 'emote' && seat !== null && EMOTES.includes(msg.e)) { for (const peer of this.sockets()) this.send(peer, { t: 'emote', seat, e: msg.e }); }
  }

  async hello(ws, msg) {
    const r = this.room;
    let seat = null, token = null;
    if (typeof msg.token === 'string' && msg.token.length <= 64) {
      const hash = await digest(msg.token);
      const i = r.seats.findIndex(x => x.token === hash);
      if (i >= 0) seat = i;
    }
    if (seat === null && r.seats.length < MAX_PLAYERS) {
      token = newToken(); r.seats.push(freshPlayer(await digest(token), cleanName(msg.name))); seat = r.seats.length - 1;
    }
    ws.serializeAttachment({ seat });
    await this.save();
    if (token) this.send(ws, { t: 'joined', token, seat });
    this.broadcast();
  }
  async start(ws, seat) {
    const r = this.room;
    if (seat !== 0) return this.send(ws, { t: 'error', message: 'Chỉ chủ phòng mới bắt đầu được.' });
    if (r.status !== 'waiting') return;
    for (const p of r.seats) Object.assign(p, { score: 0, streak: 0, best: 0, right: 0, life: freshLife() });
    r.round = 0; r.used = []; r.seq = 0;
    await this.nextQuestion();
    this.broadcast();
  }
  async stop(ws, seat) {
    const r = this.room;
    if (seat !== 0) return this.send(ws, { t: 'error', message: 'Chỉ chủ phòng mới kết thúc được.' });
    if (r.status === 'waiting') return;
    r.status = 'waiting'; r.q = null; r.answers = {}; r.priv = {}; r.reveal = null; r.swapped = null;
    await this.save(); this.broadcast();
  }
  async nextQuestion() {
    const r = this.room;
    r.round++; r.seq++;
    r.q = pickQuestion(rng, levelForRound(r.round), new Set(r.used), r.seq);
    r.used = [...r.used, r.q.id].slice(-200);
    r.status = 'asking'; r.answers = {}; r.priv = {}; r.reveal = null; r.swapped = null;
    r.endsAt = Date.now() + ASK_MS; r.startedAt = Date.now();
    await this.save();
  }
  async answer(ws, seat, msg) {
    const r = this.room;
    if (seat === null) return this.send(ws, { t: 'error', message: 'Bạn đang xem, chưa có ghế để trả lời.' });
    if (r.status !== 'asking' || msg.n !== r.round) return this.send(ws, this.view(seat));
    if (seat in r.answers) return;
    const i = Number(msg.i);
    if (!Number.isInteger(i) || i < 0 || i > 3 || (r.priv[seat]?.removed || []).includes(i)) return this.send(ws, { t: 'error', message: 'Đáp án chưa hợp lệ.' });
    r.answers[seat] = { pick: i, at: Date.now() };
    await this.save();
    if (!(await this.tick())) this.broadcast();
  }
  async life(ws, seat, msg) {
    const r = this.room, k = msg.k;
    if (seat === null) return this.send(ws, { t: 'error', message: 'Bạn đang xem, chưa có quyền trợ giúp.' });
    if (r.status !== 'asking' || msg.n !== r.round) return this.send(ws, this.view(seat));
    if (seat in r.answers) return this.send(ws, { t: 'error', message: 'Bạn đã trả lời câu này rồi.' });
    const p = (r.priv[seat] ||= { removed: [], audience: null, friend: null, hint: false });
    if (k === 'hint') { p.hint = true; await this.save(); return this.broadcastTo(seat); }
    if (!LIFELINES.includes(k)) return;
    if (!r.seats[seat].life[k]) return this.send(ws, { t: 'error', message: 'Quyền trợ giúp này bạn đã dùng rồi.' });
    if (k === 'swap' && Object.keys(r.answers).length) return this.send(ws, { t: 'error', message: 'Đã có người trả lời nên không đổi câu được.' });
    r.seats[seat].life[k]--;
    if (k === 'fifty') p.removed = fifty(rng, r.q);
    else if (k === 'audience') p.audience = audience(rng, r.q, p.removed);
    else if (k === 'friend') p.friend = friend(rng, r.q, p.removed);
    else {
      const name = r.seats[seat].name;
      r.seq++; r.q = pickQuestion(rng, r.q.lv, new Set(r.used), r.seq); r.used = [...r.used, r.q.id].slice(-200);
      r.priv = {}; r.endsAt = Date.now() + ASK_MS; r.swapped = name;
      await this.save(); return this.broadcast();
    }
    await this.save(); this.broadcastTo(seat);
  }
  broadcastTo(seat) { for (const ws of this.sockets()) if (this.seatOf(ws) === seat) this.send(ws, this.view(seat)); }

  // Chấm điểm khi hết giờ hoặc mọi người đang trực tuyến đã trả lời.
  async reveal() {
    const r = this.room, online = this.onlineSet();
    r.reveal = [];
    r.seats.forEach((p, i) => {
      const a = r.answers[i];
      if (!a && !online.has(i)) return; // người rớt mạng không bị mất chuỗi
      const ok = !!a && a.pick === r.q.a;
      let gain = 0;
      if (ok) { p.streak++; p.best = Math.max(p.best, p.streak); p.right++; gain = points({ lv: r.q.lv, hint: !!r.priv[i]?.hint, streak: p.streak, msLeft: r.endsAt - a.at, limit: ASK_MS }); p.score += gain; }
      else p.streak = 0;
      r.reveal.push({ seat: i, pick: a ? a.pick : null, ok, gain });
    });
    r.status = 'reveal'; r.endsAt = Date.now() + REVEAL_MS;
    await this.save();
  }
  // Chuyển pha: hết giờ hoặc đủ câu trả lời thì chấm; hết giờ xem đáp án thì sang câu mới.
  async tick() {
    const r = this.room, now = Date.now();
    if (!r || !r.code) return false;
    if (r.status === 'asking') {
      const online = this.onlineSet(), waiting = [...online].filter(i => !(i in r.answers));
      if (now >= r.endsAt || (online.size && !waiting.length)) { await this.reveal(); this.broadcast(); return true; }
    } else if (r.status === 'reveal' && now >= r.endsAt) {
      if (this.online() === 0) { r.status = 'waiting'; r.q = null; await this.save(); return true; }
      await this.nextQuestion(); this.broadcast(); return true;
    }
    return false;
  }
  async webSocketClose(ws) { this.rate.delete(ws); await this.load(); if (this.room?.code) { await this.tick(); this.broadcast(); } }
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
