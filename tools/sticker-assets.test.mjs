import assert from 'node:assert/strict';
import fs from 'node:fs';
const folders=['dist','dist/blog','dist/photobooth'];
for(const name of ['sticker-atlas','sticker-atlas-2','sticker-atlas-3']){
const reference=fs.readFileSync(`dist/assets/${name}.webp`);
assert.equal(reference.toString('ascii',0,4),'RIFF');assert.equal(reference.toString('ascii',8,12),'WEBP');
assert.ok(reference.length<600000,'Each sticker atlas stays below 600KB');
const vp8x=reference.indexOf(Buffer.from('VP8X'));assert.ok(vp8x>0);assert.ok(reference[vp8x+8]&16,'Preserve alpha transparency');
const width=reference.readUIntLE(vp8x+12,3)+1,height=reference.readUIntLE(vp8x+15,3)+1;assert.equal(width,height);assert.ok(width>=1024);
for(const folder of folders)assert.deepEqual(fs.readFileSync(`${folder}/assets/${name}.webp`),reference);
}
const css=fs.readFileSync('dist/decorative-stickers.css','utf8');
const used=new Set();
for(const folder of folders){
 assert.equal(fs.readFileSync(folder+'/decorative-stickers.css','utf8'),css);
 const html=fs.readFileSync(folder+'/index.html','utf8');assert.ok(html.includes('decorative-stickers.css?v=1'));
 for(const tag of html.matchAll(/<span\b[^>]*class="[^"]*art-sticker[^>]*>/g))assert.ok(tag[0].includes('aria-hidden="true"'));
 for(const match of html.matchAll(/\bsticker-(\d{2})\b/g))used.add(match[1]);
}
assert.deepEqual([...used].sort(),Array.from({length:48},(_,i)=>String(i+1).padStart(2,'0')),'All 48 motifs appear across public artwork');
for(const id of used)assert.ok(css.includes(`.sticker-${id}{`),`Sprite ${id} has a cell mapping`);
assert.ok(css.includes('pointer-events:none')&&css.includes('prefers-reduced-motion:reduce'));
for(const file of ['dist/admin/index.html','dist/photobooth/shoot.html'])assert.ok(!fs.readFileSync(file,'utf8').includes('decorative-stickers.css'));
console.log('PASS: 48 transparent atlas cells, bounded payload, synced assets, decorative semantics and reduced-motion support.');
