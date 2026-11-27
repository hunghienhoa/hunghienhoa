// Bộ khung dùng chung cho các game pixel: âm thanh chiptune, vẽ pixel, khung thông báo, danh sách người chơi
// và toàn bộ phần chơi online (tạo phòng, ghép trận, link mời, vào lại khi rớt mạng, đếm giờ lượt).
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const store = {
  get(k) { try { return localStorage.getItem('game:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('game:' + k, v); } catch { /* chỉ là tiện ích */ } }
};

// ---------- Âm thanh ----------
let audio = null, soundOn = store.get('sound') !== 'off';
function tone(freq, start, dur, type = 'square', vol = 0.05) {
  const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.02);
}
const SOUNDS = {
  pick: [[660, 0, 0.05]], move: [[392, 0, 0.05], [523, 0.05, 0.07]], drop: [[880, 0, 0.03, 'triangle', 0.06]],
  capture: [[220, 0, 0.06, 'sawtooth', 0.06], [165, 0.06, 0.12]], card: [[1200, 0, 0.025, 'triangle', 0.05], [700, 0.025, 0.04, 'triangle', 0.04]],
  dice: [[300, 0, 0.03, 'square', 0.04], [420, 0.05, 0.03, 'square', 0.04], [360, 0.1, 0.03, 'square', 0.04], [520, 0.16, 0.05, 'square', 0.05]],
  pass: [[330, 0, 0.08, 'triangle', 0.05]], bad: [[110, 0, 0.12, 'sawtooth', 0.05]], ping: [[988, 0, 0.06, 'triangle', 0.07]],
  bomb: [[110, 0, 0.18, 'sawtooth', 0.08], [82, 0.12, 0.25, 'square', 0.07]],
  win: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.25]], lose: [[392, 0, 0.14], [330, 0.15, 0.14], [262, 0.3, 0.3]]
};
export function sfx(name) {
  if (!soundOn) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch { return; }
  for (const [f, s, d, t, v] of SOUNDS[name] || []) tone(f, s, d, t, v);
}
export function soundButton(button) {
  const label = () => { button.textContent = soundOn ? 'Âm thanh: bật' : 'Âm thanh: tắt'; button.setAttribute('aria-pressed', String(soundOn)); };
  button.addEventListener('click', () => { soundOn = !soundOn; store.set('sound', soundOn ? 'on' : 'off'); label(); if (soundOn) sfx('ping'); });
  label();
  setupFullscreen();
}

// ---------- Toàn màn hình & xoay ngang tự động ----------
export function setupFullscreen() {
  const arcade = $('.arcade');
  if (!arcade || arcade.dataset.fsReady) return;
  arcade.dataset.fsReady = '1';
  const landscape = arcade.dataset.fs === 'landscape' || /\/(tien-len|phom|ba-cay)(\/|$)/.test(location.pathname);
  if (landscape) arcade.dataset.fs = 'landscape';
  const wrap = arcade.closest('.arcade-wrap') || document.documentElement;
  let active = false, wasNative = false;

  const syncButtons = () => {
    for (const [el, fullTxt, shortTxt] of [[$('#fullscreen'), 'Toàn màn hình', 'Thu nhỏ'], [$('.fs-corner'), 'Phóng to', 'Thu nhỏ']]) {
      if (!el) continue;
      el.setAttribute('aria-pressed', String(active));
      el.setAttribute('aria-label', active ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình');
      el.title = active ? 'Thu nhỏ' : 'Toàn màn hình';
      const ic = el.querySelector('.ic'), tx = el.querySelector('span:not(.ic)');
      if (ic) ic.className = 'ic ' + (active ? 'ic-collapse' : 'ic-expand');
      if (tx) tx.textContent = active ? shortTxt : fullTxt;
    }
  };

  const syncViewport = () => {
    if (!active) {
      arcade.classList.remove('is-fs', 'is-fs-rot', 'is-fs-compact');
      arcade.style.removeProperty('--fs-w');
      arcade.style.removeProperty('--fs-h');
      document.body.classList.remove('has-game-fs');
      return;
    }
    document.body.classList.add('has-game-fs');
    arcade.classList.add('is-fs');
    const vw = window.innerWidth, vh = window.innerHeight;
    const rot = landscape && vw < vh;
    const w = rot ? vh : vw, h = rot ? vw : vh;
    arcade.classList.toggle('is-fs-rot', rot);
    arcade.classList.toggle('is-fs-compact', h < 540);
    arcade.style.setProperty('--fs-w', w + 'px');
    arcade.style.setProperty('--fs-h', h + 'px');
  };

  const toggle = async force => {
    const next = typeof force === 'boolean' ? force : !active;
    if (next === active) return;
    active = next;
    syncViewport();
    syncButtons();
    if (active) {
      try {
        const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
        if (req && !document.fullscreenElement && !document.webkitFullscreenElement) await req.call(wrap);
      } catch { /* Trình duyệt không hỗ trợ Fullscreen API: dùng khung cố định toàn màn hình */ }
      if (landscape) {
        try { await screen.orientation?.lock?.('landscape'); } catch { /* Tự xoay ngang bằng CSS .is-fs-rot khi màn hình dọc */ }
      }
      syncViewport();
    } else {
      wasNative = false;
      try { screen.orientation?.unlock?.(); } catch {}
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          await (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        }
      } catch {}
      syncViewport();
    }
  };

  $('#fullscreen')?.addEventListener('click', () => toggle());
  $('.fs-corner')?.addEventListener('click', () => toggle());
  $('#fs-hint')?.addEventListener('click', () => $('#hint')?.click());
  $('#fs-new')?.addEventListener('click', () => { const st = $('#start-room'); if (st && !st.hidden) { st.click(); return; } const ag = $('#again'); if (ag && !ag.disabled) { ag.click(); return; } const nl = $('#new-local'); if (nl && !$('#panel-local')?.hidden) { nl.click(); return; } $('#new-ai')?.click(); });
  window.addEventListener('resize', () => { if (active) syncViewport(); });
  window.addEventListener('orientationchange', () => { if (active) setTimeout(syncViewport, 60); });
  const onFsChange = () => {
    const nativeEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (nativeEl) { wasNative = true; if (active) syncViewport(); }
    else if (wasNative && active) { wasNative = false; toggle(false); }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && active && !document.fullscreenElement && !document.webkitFullscreenElement) toggle(false);
  });
  syncButtons();
}

// ---------- Vẽ vector (canvas độ phân giải gấp K lần cho nét mượt) ----------
export const K = 3;
export const UI_FONT = '"Be Vietnam Pro",system-ui,sans-serif';
export function setup(canvas, W, H, opts) { canvas.width = W * K; canvas.height = H * K; const g = canvas.getContext('2d', opts); g.setTransform(K, 0, 0, K, 0, 0); return g; }
export const off = (w, h) => { const c = document.createElement('canvas'); c.width = w * K; c.height = h * K; return c; };
export const ctxOf = c => { const g = c.getContext('2d'); g.scale(K, K); return g; };
export const hash = (x, y) => { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export function digits(g, value, x, y, color, scale = 1) {
  const text = String(value), size = 6.5 * scale;
  g.font = `800 ${size}px ${UI_FONT}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = color;
  g.fillText(text, x, y - 0.5 * scale);
  return g.measureText(text).width;
}
export function disc(g, cx, cy, r, tones, outline = '#2a1a0e') { // viên tròn có chiếm sáng từ góc trên trái
  const gr = g.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r);
  gr.addColorStop(0, tones[0]); gr.addColorStop(0.45, tones[1]); gr.addColorStop(0.8, tones[2]); gr.addColorStop(1, tones[3]);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.lineWidth = 0.7; g.strokeStyle = outline; g.stroke();
}
export function brackets(g, x, y, w, h, color) {
  g.strokeStyle = color; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 6); g.stroke();
}
export function pointer(canvas, W, H, e) {
  const r = canvas.getBoundingClientRect();
  if (canvas.closest('.is-fs-rot')) {
    return [((e.clientY - r.top) * W) / r.height, ((r.right - e.clientX) * H) / r.width];
  }
  return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
}

// ---------- Thông báo ----------
let bannerTimer = 0;
export function banner(title, sub = '', flash = false) {
  const el = $('#banner');
  $('#banner-title').textContent = title; $('#banner-sub').textContent = sub;
  el.classList.toggle('check', !!flash); el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(bannerTimer);
  if (flash) bannerTimer = setTimeout(() => { el.hidden = true; }, 1000);
}
export const hideBanner = () => { $('#banner').hidden = true; };
export function say(text) { $('#status').textContent = text; const bs = $('#board-status'); if (bs) bs.textContent = text; }
let armed = null;
export function confirmTwice(key, button, label) {
  if (armed?.key === key && Date.now() - armed.at < 3500) { clearTimeout(armed.timer); button.textContent = armed.text; armed = null; return true; }
  if (armed) { clearTimeout(armed.timer); armed.button.textContent = armed.text; }
  const text = button.textContent;
  armed = { key, at: Date.now(), text, button, timer: setTimeout(() => { button.textContent = text; armed = null; }, 3500) };
  button.textContent = label;
  return false;
}
export function tabs(modes, onChange) {
  let current = modes[0];
  const set = m => {
    current = m;
    for (const x of modes) { $('#tab-' + x).setAttribute('aria-selected', String(x === m)); $('#panel-' + x).hidden = x !== m; }
    onChange(m);
  };
  for (const m of modes) $('#tab-' + m).addEventListener('click', () => { if (m !== current) set(m); });
  $('.mode-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = modes.indexOf(current), m = modes[(i + (e.key === 'ArrowRight' ? 1 : modes.length - 1)) % modes.length];
    set(m); $('#tab-' + m).focus();
  });
  return { set, get: () => current };
}
export const choice = name => document.querySelector(`input[name="${name}"]:checked`)?.value;

// ---------- Danh sách người chơi ----------
// players: [{name, tag, color, score, extra, turn, done, offline}], deadline (ms còn lại của người đang tới lượt)
export function renderPlayers(players, deadline = 0) {
  const list = $('#players');
  list.replaceChildren(...players.map((p, i) => {
    const li = document.createElement('li');
    li.className = 'player' + (p.turn ? ' turn' : '') + (p.offline ? ' offline' : '') + (p.done ? ' done' : '');
    const dot = document.createElement('span'); dot.className = 'pawn-dot'; dot.style.background = p.color || 'var(--blue)';
    const name = document.createElement('span'); name.className = 'player-name'; name.textContent = p.name;
    const tag = document.createElement('span'); tag.className = 'player-tag'; tag.textContent = p.tag || '';
    const extra = document.createElement('span'); extra.className = 'player-extra'; extra.textContent = p.extra ?? '';
    const score = document.createElement('span'); score.className = 'player-score'; score.textContent = p.score ?? '';
    const bubble = document.createElement('span'); bubble.className = 'emote-bubble'; bubble.dataset.seat = i; bubble.setAttribute('aria-hidden', 'true');
    li.append(dot, name, tag, extra, score, bubble);
    if (p.turn && deadline > 0) { const t = document.createElement('span'); t.className = 'turn-timer'; t.dataset.until = String(performance.now() + deadline); li.append(t); }
    return li;
  }));
  tickTimers();
}
function tickTimers() {
  for (const t of $$('.turn-timer')) { const left = Math.max(0, Math.ceil((+t.dataset.until - performance.now()) / 1000)); t.textContent = left + 's'; t.classList.toggle('low', left <= 5); }
}
setInterval(tickTimers, 250);
export function emote(seat, e) {
  const el = document.querySelector(`.emote-bubble[data-seat="${seat}"]`);
  if (!el) return;
  el.textContent = e; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  sfx('ping');
}

// ---------- Online ----------
export class Online {
  constructor(game, handlers) {
    this.game = game; this.h = handlers; this.room = null;
    const name = $('#player-name');
    if (name) name.value = store.get('name') || '';
    $('#create-room')?.addEventListener('click', () => this.guard(async () => { say('Đang tạo phòng…'); const d = await this.api('/rooms', { game, name: this.name(), seats: this.seats() }); this.saveSeat(d.room, d.token); this.enter(d.room); }));
    $('#quick-match')?.addEventListener('click', () => this.guard(async () => { say('Đang tìm phòng…'); const d = await this.api('/match', { game, name: this.name(), seats: this.seats() }); if (d.token) this.saveSeat(d.room, d.token); this.enter(d.room); }));
    $('#join-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const code = $('#join-code').value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) { say('Mã phòng gồm 6 chữ cái hoặc số.'); return; }
      this.guard(async () => { await this.api(`/rooms/${game}/${code}`); this.enter(code); });
    });
    $('#copy-link')?.addEventListener('click', async () => {
      const input = $('#invite-link');
      try { await navigator.clipboard.writeText(input.value); say('Đã sao chép link mời. Gửi cho bạn qua Zalo hay Messenger nhé.'); } catch { input.select(); say('Hãy chọn và sao chép link trong ô.'); }
    });
    $('#start-room')?.addEventListener('click', () => this.send({ t: 'start' }));
    $('#leave-room')?.addEventListener('click', () => {
      if (this.room?.state?.status === 'playing' && this.room.state.you !== null && !confirmTwice('leave', $('#leave-room'), 'Bấm lần nữa để rời')) return;
      this.leave(true);
    });
    for (const b of $$('[data-emote]')) b.addEventListener('click', () => this.send({ t: 'emote', e: b.dataset.emote }));
  }
  name() { const v = ($('#player-name')?.value || '').trim(); store.set('name', v); return v; }
  seats() { return Number(choice('online-seats') || 0) || undefined; }
  async guard(job) { const buttons = $$('#lobby button'); buttons.forEach(b => { b.disabled = true; }); try { await job(); } catch (e) { say(e.message); } finally { buttons.forEach(b => { b.disabled = false; }); } }
  async api(path, body) {
    const res = await fetch('/api/game' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(res.status === 404 && body ? 'Chế độ online chưa sẵn sàng ở đây.' : data.error || 'Chưa kết nối được máy chủ. Hãy thử lại sau.');
    return data;
  }
  token(code) { try { const v = JSON.parse(store.get(`seat:${this.game}:${code}`) || 'null'); return v && Date.now() - v.at < 3 * 3600_000 ? v.token : null; } catch { return null; } }
  saveSeat(code, token) { store.set(`seat:${this.game}:${code}`, JSON.stringify({ token, at: Date.now() })); }
  enter(code) {
    this.leave(false);
    this.room = { code, socket: null, state: null, retry: 0, alive: true };
    const url = new URL(location.href); url.searchParams.set('phong', code); url.hash = 'choi'; history.replaceState(null, '', url);
    $('#lobby').hidden = true; $('#room').hidden = false;
    $('#room-code').textContent = code;
    $('#invite-link').value = `${location.origin}${location.pathname}?phong=${code}`;
    this.h.onEnter?.();
    this.connect();
  }
  connect() {
    const room = this.room;
    if (!room?.alive) return;
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/game/ws?game=${this.game}&room=${room.code}`);
    room.socket = ws;
    say('Đang vào phòng…');
    ws.onopen = () => { room.retry = 0; ws.send(JSON.stringify({ t: 'hello', token: this.token(room.code), name: this.name() })); clearInterval(this.ping); this.ping = setInterval(() => this.send({ t: 'ping' }), 15000); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } this.message(m); };
    ws.onclose = ev => {
      if (room !== this.room || !room.alive) return;
      if (ev.code === 4404 || ev.code === 4410) { say('Phòng không tồn tại hoặc đã hết hạn.'); room.alive = false; return; }
      room.retry++; say('Mất kết nối. Đang nối lại…');
      setTimeout(() => this.connect(), Math.min(10000, 800 * 2 ** Math.min(room.retry, 4)));
    };
  }
  message(m) {
    const room = this.room;
    if (!room) return;
    if (m.t === 'joined') { this.saveSeat(room.code, m.token); return; }
    if (m.t === 'emote') { emote(m.seat, m.e); return; }
    if (m.t === 'error') { say(m.message); sfx('bad'); this.h.onError?.(m.message); return; }
    if (m.t !== 'state') return;
    const before = room.state;
    room.state = m;
    const status = m.status;
    $('#start-room').hidden = !(m.you !== null && (status === 'waiting' || status === 'ended'));
    $('#start-room').textContent = status === 'ended' ? 'Ván mới' : 'Bắt đầu (máy lấp chỗ trống)';
    $('#invite').hidden = status !== 'waiting';
    $('#room-info').textContent = status === 'waiting' ? `${m.seats.filter(Boolean).length}/${m.capacity} người` : `Ván ${m.round}`;
    if (before?.status === 'waiting' && status === 'playing') { sfx('win'); banner('BẮT ĐẦU!', '', true); }
    this.h.onState(m, before);
  }
  send(msg) { const ws = this.room?.socket; if (ws?.readyState === 1) { ws.send(JSON.stringify(msg)); return true; } return false; }
  act(action) { const st = this.room?.state; if (!st?.view) return; this.send({ t: 'act', action, n: st.view.moves }); }
  leave(reset) {
    const room = this.room;
    if (room) { room.alive = false; try { room.socket?.close(1000); } catch { /* bỏ qua */ } }
    this.room = null; clearInterval(this.ping);
    if (reset) {
      const url = new URL(location.href); url.searchParams.delete('phong'); history.replaceState(null, '', url);
      $('#lobby').hidden = false; $('#room').hidden = true;
      say('Đã rời phòng.');
      this.h.onLeave?.();
    }
  }
  fromLink() {
    const code = new URLSearchParams(location.search).get('phong');
    if (!code || !/^[A-Z0-9]{6}$/i.test(code)) return false;
    this.api(`/rooms/${this.game}/${code.toUpperCase()}`).then(() => this.enter(code.toUpperCase())).catch(e => say(e.message));
    return true;
  }
}
export const COLORS = { red: '#c8323c', blue: '#2f6fd0', yellow: '#f0b400', green: '#2e9e5b', ink: '#1d1f55', cream: '#fbf2e3', sun: '#ffdc38', indigo: '#303487' };
export const LEVEL_NAMES = { de: 'Dễ', vua: 'Vừa', kho: 'Khó' };
