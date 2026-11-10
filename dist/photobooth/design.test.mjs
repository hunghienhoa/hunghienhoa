import assert from 'node:assert/strict';
import { DEFAULT_DESIGN, PHOTO_SESSION_MS, normalizeDesign, photoSessionExpired, drawFrameTemplate } from './design.mjs';
import { design as validateSubmissionDesign } from '../../server/validation.mjs';

assert.deepEqual(normalizeDesign({}), DEFAULT_DESIGN);
assert.equal(normalizeDesign({ background: '#ABCDEF', title: '  Kỷ niệm  ' }).background, '#abcdef');
assert.equal(normalizeDesign({ title: '  Kỷ niệm  ' }).title, 'Kỷ niệm');
for (const input of [null, [], { photo: 'private' }, { background: 'red' }, { pattern: 'url(secret)' }, { sticker: '__proto__' }, { title: 'x'.repeat(61) }]) assert.throws(() => normalizeDesign(input));
assert.equal(PHOTO_SESSION_MS, 3600000);
assert.equal(photoSessionExpired(1000, 999), false);
assert.equal(photoSessionExpired(1000, 1000), true);
assert.equal(photoSessionExpired(0, 9999999), false);

const calls = [];
const fonts = [];
const ctx = new Proxy({}, { get: (_, method) => method === 'measureText' ? () => ({ width: 100 }) : (...args) => calls.push([method, ...args]), set: (_, name, value) => { if (name === 'font') fonts.push(value); return true; } });
drawFrameTemplate(ctx, DEFAULT_DESIGN);
assert.equal(calls.filter(call => call[0] === 'drawImage').length, 0);
assert.deepEqual(calls.filter(call => call[0] === 'fillRect' && call[3] === 640 && call[4] === 450).map(call => call[2]), [100, 570, 1040, 1510]);
assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === '04'));
assert.ok(calls.every(call => !call.includes('private')));
assert.ok(fonts.some(font => font.includes('"Be Vietnam Pro"')));
assert.ok(fonts.some(font => /^italic 600 \d+px "Playfair Display"/.test(font)));
assert.ok(fonts.every(font => !/Gilroy|600 italic/.test(font)));
for (const pattern of ['film', 'checker', 'stripes', 'confetti', 'hearts', 'waves', 'sparkles', 'lace', 'doodles']) {
  assert.equal(validateSubmissionDesign(normalizeDesign({ pattern })).pattern, pattern);
  calls.length = 0;
  drawFrameTemplate(ctx, normalizeDesign({ pattern }));
  assert.ok(calls.some(call => call[0] === 'fillRect'));
  assert.equal(calls.filter(call => call[0] === 'drawImage').length, 0);
}
console.log('PASS: strict frame design, exact photo expiry and frame-only renderer without photo inputs.');

for (const sticker of ['bow','cat','cherry','cloud','butterfly','smile']) {
  const sample = normalizeDesign({sticker});
  assert.equal(validateSubmissionDesign(sample).sticker,sticker);
  calls.length = 0; drawFrameTemplate(ctx, sample, {[sticker]: {id:sticker}});
  assert.equal(calls.filter(call => call[0] === 'drawImage').length,8);
}
