import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync('dist/photobooth/index.html', 'utf8');
const app = fs.readFileSync('dist/photobooth/app.js', 'utf8');
assert.ok(!/face-effects|face-overlay|face-picker/.test(html));
assert.ok(!app.includes('hungFaceEffects'));
assert.ok(html.includes('id="capture-one"') && html.includes('id="camera"'));
assert.ok(!fs.existsSync('dist/photobooth/vendor/mediapipe/face.tflite'));
console.log('PASS: face effects removed; camera capture controls retained.');
