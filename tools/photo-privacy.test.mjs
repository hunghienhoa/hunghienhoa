import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { coverCrop, applyFilterPixels } from '../dist/photobooth/core.mjs';
import { DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate, drawFrameFooter } from '../dist/photobooth/design.mjs';

// Exercise the real handlers with synthetic photos; no browser, camera or user data.
const events = {}, requests = [], elements = new Map(), timers = new Map();
let timerId = 0, clock = 1000000, requestedCamera = 0;
class Element {
  constructor() { this.value = ''; this.checked = false; this.dataset = {}; this.style = {}; this.listeners = {}; this.attributes = {}; this.children = []; this.textContent = ''; this.firstChild = { textContent: '' }; this.width = 720; this.height = 2180; this.classList = { add() {}, remove() {}, toggle() {} }; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; if (key === 'src') this.src = ''; }
  querySelector() { return this.child ||= new Element(); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  reportValidity() { return true; }
  reset() {}
  pause() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}
class Canvas extends Element {
  constructor() {
    super(); this.containsPhoto = false;
    this.context = new Proxy({
      filter: 'none',
      drawImage: source => { if (source?.containsPhoto) this.containsPhoto = true; },
      clearRect: () => { this.containsPhoto = false; },
      measureText: () => ({ width: 100 })
    }, { get: (target, key) => key in target ? target[key] : () => {} });
  }
  getContext() { return this.context; }
  toDataURL() { return 'data:image/webp;base64,' + Buffer.from(this.containsPhoto ? 'PRIVATE-PHOTO' : 'FRAME-ONLY').toString('base64'); }
}
class TestImage extends Element {
  constructor() { super(); this.complete = true; this.naturalWidth = this.width = 640; this.naturalHeight = this.height = 480; }
  set src(value) { this._src = value; this.containsPhoto = value.startsWith('blob:qa-photo'); if (value) queueMicrotask(() => this.onload?.()); }
  get src() { return this._src; }
}
const html = fs.readFileSync(new URL('../dist/photobooth/index.html', import.meta.url), 'utf8');
for (const [, id] of html.matchAll(/id="([^"]+)"/g)) elements.set('#' + id, ['strip', 'design-preview'].includes(id) ? new Canvas() : new Element());
for (const selector of ['.upload-button', '.print-preview']) elements.set(selector, new Element());
for (const [key, value] of Object.entries(DEFAULT_DESIGN)) elements.get('#design-' + key).value = value;
const slotButtons = Array.from({ length: 4 }, (_, slot) => Object.assign(new Element(), { dataset: { slot: String(slot) } }));
const removeButtons = Array.from({ length: 4 }, (_, slot) => Object.assign(new Element(), { dataset: { remove: String(slot) } }));
const frameButtons = [...html.matchAll(/data-frame="([^"]+)"/g)].map(([,frame]) => Object.assign(new Element(), { dataset: { frame }, textContent: frame }));
const filterButtons = ['original', 'mono', 'warm', 'nostalgia', 'clear', 'peach', 'soft'].map(filter => Object.assign(new Element(), { dataset: { filter } }));
const document = {
  querySelector(selector) {
    if (selector.startsWith('[data-remove=')) return removeButtons[Number(selector.match(/"(\d)"/)[1])];
    return elements.get(selector) || null;
  },
  querySelectorAll(selector) { return ({ '[data-slot]': slotButtons, '[data-remove]': removeButtons, '[data-frame]': frameButtons, '[data-filter]': filterButtons })[selector] || []; },
  createElement: tag => tag === 'canvas' ? new Canvas() : new Element(),
  fonts: { ready: Promise.resolve(), load: async () => [] },
  addEventListener: (type, callback) => { events['document:' + type] = callback; },
  hidden: false,
  body: new Element()
};
class TestURL extends URL { static createObjectURL() { return 'blob:qa-photo'; } static revokeObjectURL() {} }
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
const context = vm.createContext({
  console, document, Image: TestImage, URL: TestURL, Date: TestDate, AbortController, queueMicrotask,
  window: { HUNG_API_BASE: '', addEventListener: (type, callback) => { events['window:' + type] = callback; } },
  location: { origin: 'http://localhost' }, navigator: { mediaDevices: { getUserMedia() { requestedCamera++; throw new Error('Camera must not start in this test'); } } },
  matchMedia: () => ({ matches: true }), requestAnimationFrame: callback => callback(),
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout: id => timers.delete(id),
  fetch: async (url, options = {}) => {
    if (options.method === 'POST') { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ id: 'qa', status: 'pending', expiresAt: clock + PHOTO_SESSION_MS }) }; }
    return { ok: true, json: async () => ({ frames: [] }) };
  },
  coverCrop, applyFilterPixels, DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate, drawFrameFooter
});
const script = fs.readFileSync(new URL('../dist/photobooth/app.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
new vm.Script(script).runInContext(context);
await new Promise(resolve => setImmediate(resolve));
assert.equal(requestedCamera, 0);
assert.equal(requests.length, 0);
assert.ok(html.indexOf('class="camera-filters"') < html.indexOf('id="capture-one"'));
for (const button of filterButtons) {
  button.listeners.click();
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.ok(elements.get('#camera').style.filter);
}
const originalEncode = Canvas.prototype.toDataURL;
Canvas.prototype.toDataURL = function(type) { return type === 'image/webp' ? 'data:image/png;base64,fallback' : 'data:image/jpeg;base64,synthetic'; };
assert.equal(vm.runInContext('photoFromImage({width:640,height:480}).url',context),'data:image/jpeg;base64,synthetic');
Canvas.prototype.toDataURL = () => 'data:,';
assert.throws(()=>vm.runInContext('photoFromImage({width:640,height:480})',context),/Chưa xử lý được ảnh/);
Canvas.prototype.toDataURL = originalEncode;
assert.equal(frameButtons.length, 16);
for (const button of frameButtons) {
  button.listeners.click();
  assert.equal(button.attributes['aria-pressed'], 'true');
}
const upload = elements.get('#upload');
vm.runInContext('startingCamera = true; updateUI();', context);
assert.equal(upload.disabled, false);
await upload.listeners.change({ target: { files: Array.from({ length: 4 }, (_, i) => ({ name: `synthetic-${i}.png`, type: 'image/png', size: 100 })), value: '' } });
assert.equal(vm.runInContext('startingCamera', context), false);
assert.equal(elements.get('#photo-count').textContent, '4 / 4');
assert.equal(elements.get('#strip').containsPhoto, true);
assert.equal(timers.size, 1);
assert.equal([...timers.values()][0].delay, PHOTO_SESSION_MS);
elements.get('#frame-name').value = 'Khung thử'; elements.get('#author-name').value = 'Tác giả thử';
elements.get('#author-contact').value = 'private@example.test'; elements.get('#author-link').value = ''; elements.get('#contribution-consent').checked = true;
await elements.get('#contribution-form').listeners.submit({ preventDefault() {}, currentTarget: elements.get('#contribution-form') });
assert.equal(requests.length, 1);
assert.equal(Buffer.from(requests[0].imageDataUrl.split(',')[1], 'base64').toString(), 'FRAME-ONLY');
assert.equal(JSON.stringify(requests[0]).includes('PRIVATE-PHOTO'), false);
assert.equal(elements.get('#photo-count').textContent, '4 / 4');
clock += PHOTO_SESSION_MS;
events['document:visibilitychange']();
assert.equal(elements.get('#photo-count').textContent, '0 / 4');
assert.equal(elements.get('#strip').containsPhoto, false);
assert.ok(slotButtons.every(button => button.child.src === ''));
assert.equal(elements.get('#download').disabled, true);
await upload.listeners.change({ target: { files: [{ name: 'synthetic.png', type: 'image/png', size: 100 }], value: '' } });
assert.equal(elements.get('#photo-count').textContent, '1 / 4');
events['window:pagehide']();
assert.equal(elements.get('#photo-count').textContent, '0 / 4');
assert.equal(elements.get('#strip').containsPhoto, false);
assert.equal(requestedCamera, 0);
console.log('PASS: real photo handlers keep images in memory, submit frame-only with four photos present, clear at 1h and pagehide, never auto-start camera.');
assert.equal(await vm.runInContext(`jpegBlob({toBlob(callback, type) { callback({type}); }}).then(blob => blob.type)`, context), 'image/jpeg');
await assert.rejects(vm.runInContext(`jpegBlob({toBlob(callback) { callback({type: 'image/webp'}); }})`, context));
