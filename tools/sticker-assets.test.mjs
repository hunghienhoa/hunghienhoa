import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
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
}
const owners=new Map();
const pages=['dist/index.html','dist/blog/index.html','dist/photobooth/index.html','dist/photobooth/shoot.html',...['chinh-sach-rieng-tu','dieu-khoan-su-dung','bao-cao-ban-quyen','cookie-va-quang-cao'].map(name=>`dist/${name}.html`)];
for(const page of pages){
 const html=fs.readFileSync(page,'utf8');assert.ok(html.includes('decorative-stickers.css?v=4'));
 for(const id of new Set([...html.matchAll(/\bsticker-(\d{2})\b/g)].map(m=>m[1]))){assert.ok(!owners.has(id),`Motif ${id} is repeated across ${page} and ${owners.get(id)}`);owners.set(id,page);}
 for(const tag of html.matchAll(/<span\b[^>]*class="[^"]*art-sticker[^>]*>/g))assert.ok(tag[0].includes('aria-hidden="true"'));
 for(const match of html.matchAll(/\bsticker-(\d{2})\b/g))used.add(match[1]);
}
for(let i=1;i<=48;i++)assert.ok(css.includes(`.sticker-${String(i).padStart(2,'0')}{`),'Keep all48 motifs available without forcing them into original cards');
for(const id of used)assert.ok(css.includes(`.sticker-${id}{`),`Sprite ${id} has a cell mapping`);
assert.ok(css.includes('pointer-events:none')&&css.includes('prefers-reduced-motion:reduce'));
for(const file of ['dist/admin/index.html'])assert.ok(!fs.readFileSync(file,'utf8').includes('decorative-stickers.css'));
console.log('PASS: 48 transparent atlas cells, bounded payload, synced assets, decorative semantics and reduced-motion support.');

const main=fs.readFileSync('dist/index.html','utf8');
for(const side of ['left','right'])assert.ok(main.includes(`class="illustration-wing illustration-wing-${side}" src="assets/illustration-wing.svg"`));
assert.ok(!css.includes('.motion-illustration .illustration-wing'),'Do not override the original unfurl animation');

for(const marker of ['sticker-09 about-star','sticker-33 contact-art','sticker-38 completed-star'])assert.ok(main.includes(marker));
assert.ok(fs.readFileSync('dist/blog/index.html','utf8').includes('sticker-43 contact-card-art'));
assert.ok(fs.readFileSync('dist/photobooth/index.html','utf8').includes('sticker-36 contact-card-art'));
assert.ok(fs.readFileSync('dist/photobooth/shoot.html','utf8').includes('sticker-07 camera-empty-art'));

const originalWork=main.slice(main.indexOf('<section class="work section"'),main.indexOf('<section class="about section"')).replace(/\r\n/g,'\n');
assert.equal(createHash('sha256').update(originalWork).digest('hex'),'78874d4c421e884932d4bac7612835496ec65a32c90bf75e6b717e7497cdd12a','Six-card section stays identical to the original before sticker changes');
assert.ok(!originalWork.includes('art-sticker'));

const firstMotion=fs.readFileSync('dist/motion-123.css','utf8'),lastMotion=fs.readFileSync('dist/motion-456.css','utf8');
assert.match(firstMotion,/brand-left-emerge 4\.96s/);
for(const name of ['media-badge-drop','event-star-cross'])assert.ok(firstMotion.includes(name+' 3.6s'));
for(const name of ['layout-disc','illustration-wing-left','illustration-book-tag'])assert.ok(lastMotion.includes(name+' 3.6s'));
assert.ok(lastMotion.includes('pack-ribbon-top 1.8s')&&lastMotion.includes('rotate:90deg')&&lastMotion.includes('scale:-.45 1'));
