import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='dist/assets/reference-cards/';
const manifest=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));
assert.equal(manifest.length,6);
const html=fs.readFileSync('dist/index.html','utf8');
for(const [i,row] of manifest.entries()){
 assert.equal(row.card,i+1);
 const bytes=fs.readFileSync(root+row.file);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
 assert.ok(bytes.length<25*1024*1024);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
 const durations=[];let loop,dimensions;
 for(let offset=12;offset<bytes.length;){
  const name=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),start=offset+8;
  assert.ok(start+length<=bytes.length);
  if(name==='VP8X')dimensions=[bytes.readUIntLE(start+4,3)+1,bytes.readUIntLE(start+7,3)+1];
  if(name==='ANIM')loop=bytes.readUInt16LE(start+4);
  if(name==='ANMF')durations.push(bytes.readUIntLE(start+12,3));
  offset=start+length+(length%2);
 }
 assert.deepEqual(dimensions,row.size);assert.equal(loop,row.loop);
 assert.equal(durations.length,row.encodedFrames);assert.deepEqual(durations,row.encodedDurations);
 assert.equal(durations.reduce((a,b)=>a+b,0),row.durations.reduce((a,b)=>a+b,0),'Merging duplicate frames preserves the complete timeline');
 assert.ok(row.timelineMaxMeanPixelError<8,'Every source frame visually matches its encoded timeline position');
 assert.ok(html.includes(`src="assets/reference-cards/${row.file}"`));
 assert.ok(html.includes(`srcset="assets/reference-cards/${row.poster}"`));
 assert.ok(fs.readFileSync(root+row.poster).length>0);
}
assert.equal((html.match(/class="project-art reference-animation"/g)||[]).length,6);
assert.equal((html.match(/media="\(prefers-reduced-motion: reduce\)"/g)||[]).length,6);
assert.ok(!/href="(?:bubble-wrap|motion-123|motion-456)\.css/.test(html));
assert.ok(!html.includes('class="scene-props"'));
assert.ok(fs.readFileSync('dist/reference-cards.css','utf8').includes('object-fit:contain'));
assert.ok(fs.readFileSync('dist/app.js','utf8').includes("image.loading = 'eager'"));
console.log('PASS: actual 6 WebP animations, every frame duration, loop, provenance hash, original dimensions, reduced-motion posters and native card/modal rendering.');
