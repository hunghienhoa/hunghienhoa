import assert from 'node:assert/strict';
import { coverCrop, applyFilterPixels } from './core.mjs';

for (const [dimensions, expected] of [
  [[1920, 1080, 400, 300], { sx: 240, sy: 0, sw: 1440, sh: 1080 }],
  [[100, 200, 400, 300], { sx: 0, sy: 62.5, sw: 100, sh: 75 }],
  [[900, 900, 300, 400], { sx: 112.5, sy: 0, sw: 675, sh: 900 }],
  [[800, 600, 400, 300], { sx: 0, sy: 0, sw: 800, sh: 600 }],
  [[100, 100, 500, 500], { sx: 0, sy: 0, sw: 100, sh: 100 }]
]) {
  assert.deepEqual(coverCrop(...dimensions), expected);
}

for (const invalid of [0, -1, NaN, Infinity, -Infinity, '100', null, undefined]) {
  for (let position = 0; position < 4; position++) {
    const dimensions = [800, 600, 400, 300];
    dimensions[position] = invalid;
    assert.throws(() => coverCrop(...dimensions), RangeError);
  }
}
assert.throws(() => coverCrop(), RangeError);
console.log('PASS: centered cover crop for landscape, portrait, square and invalid dimensions.');

const source = new Uint8ClampedArray([120, 80, 40, 137, 255, 0, 0, 0]);
const original = applyFilterPixels(source, 'original');
assert.notEqual(original, source);
assert.deepEqual(original, source);
assert.deepEqual([...applyFilterPixels(source, 'warm')].slice(0, 4), [125, 83, 38, 137]);
const monochrome = applyFilterPixels(source, 'mono');
for (let i = 0; i < monochrome.length; i += 4) {
  assert.equal(monochrome[i], monochrome[i + 1]);
  assert.equal(monochrome[i], monochrome[i + 2]);
  assert.equal(monochrome[i + 3], source[i + 3]);
}
assert.deepEqual([...monochrome].slice(4), [48, 48, 48, 0]);
assert.deepEqual([...applyFilterPixels([0, 0, 0, 93], 'nostalgia')], [8, 8, 8, 93]);
assert.deepEqual([...source], [120, 80, 40, 137, 255, 0, 0, 0]);
assert.deepEqual(applyFilterPixels([], 'original'), new Uint8ClampedArray());
assert.deepEqual([...applyFilterPixels({ 0: 8, 1: 9, 2: 10, 3: 11, length: 4 }, 'original')], [8, 9, 10, 11]);
for (const invalid of [null, {}, [1, 2, 3], { length: -4 }]) assert.throws(() => applyFilterPixels(invalid, 'original'), TypeError);
for (const invalid of [[0, 0, 0, NaN], [256, 0, 0, 255], [-1, 0, 0, 255], [0, 0, 0, '255']]) {
  assert.throws(() => applyFilterPixels(invalid, 'original'), RangeError);
}
for (const invalid of ['unknown', '__proto__', null]) assert.throws(() => applyFilterPixels(source, invalid), RangeError);
console.log('PASS: pixel-filter colors, alpha, immutable input, array-like input and validation.');

for(const filter of ['clear','peach','soft']) {
 const input=Uint8ClampedArray.from([110,80,60,255,0,0,0,120]);
 const output=applyFilterPixels(input,filter);
 assert.equal(output.length,input.length);assert.equal(output[3],255);assert.equal(output[7],120);
 assert.notDeepEqual(output,input);assert.deepEqual([...input],[110,80,60,255,0,0,0,120]);
}
