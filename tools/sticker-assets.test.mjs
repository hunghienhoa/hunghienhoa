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
assert.ok(!css.includes('.motion-illustration .illustration-wing'),'Do not override the original unfurl animation');

for(const marker of ['sticker-09 about-star','sticker-33 contact-art','sticker-38 completed-star'])assert.ok(main.includes(marker));
assert.ok(fs.readFileSync('dist/blog/index.html','utf8').includes('sticker-43 contact-card-art'));
assert.ok(fs.readFileSync('dist/photobooth/index.html','utf8').includes('sticker-36 contact-card-art'));
assert.ok(fs.readFileSync('dist/photobooth/shoot.html','utf8').includes('sticker-07 camera-empty-art'));

const originalWork=main.slice(main.indexOf('<section class="work section"'),main.indexOf('<section class="about section"'));
assert.ok(!originalWork.includes('art-sticker')&&!originalWork.includes('scene-props'));
assert.equal((originalWork.match(/class="project-art material-scene scene-\d{2}"/g)||[]).length,6);
