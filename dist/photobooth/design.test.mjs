import assert from 'node:assert/strict';
import { DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate } from './design.mjs';

assert.deepEqual(normalizeDesign({}), DEFAULT_DESIGN);
assert.equal(normalizeDesign({ background: '#ABCDEF', title: '  Kỷ niệm  ' }).background, '#abcdef');
assert.equal(normalizeDesign({ title: '  Kỷ niệm  ' }).title, 'Kỷ niệm');
for (const input of [null, [], { photo: 'private' }, { background: 'red' }, { pattern: 'url(secret)' }, { sticker: '__proto__' }, { title: 'x'.repeat(61) }]) assert.throws(() => normalizeDesign(input));
assert.equal(PHOTO_SESSION_MS, 3600000);
assert.equal(photoSessionExpired(1000, 999), false);
assert.equal(photoSessionExpired(1000, 1000), true);
assert.equal(photoSessionExpired(0, 9999999), false);

const calls = [];
const ctx = new Proxy({}, { get: (_, method) => method === 'measureText' ? () => ({ width: 100 }) : (...args) => calls.push([method, ...args]), set: () => true });
drawFrameTemplate(ctx, DEFAULT_DESIGN);
assert.equal(calls.filter(call => call[0] === 'drawImage').length, 0);
assert.deepEqual(calls.filter(call => call[0] === 'fillRect' && call[3] === 640 && call[4] === 450).map(call => call[2]), [100, 570, 1040, 1510]);
assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === '04'));
assert.ok(calls.every(call => !call.includes('private')));
console.log('PASS: strict frame design, exact photo expiry and frame-only renderer without photo inputs.');
