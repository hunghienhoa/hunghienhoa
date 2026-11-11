import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/material-cards.css','utf8');
const preview=fs.readFileSync('dist/preview-card-01.html','utf8');
const inner=text=>text.slice(text.indexOf('<div class="number-band">'),text.indexOf('<div class="wrap-front"></div>')+30).replace(/\s+/g,' ').trim();
assert.equal(inner(html),inner(preview),'Keep the approved card01 artwork unchanged');
for(let i=1;i<=6;i++){
 const id=String(i).padStart(2,'0');
 assert.equal((html.match(new RegExp(`class="project-art material-scene scene-${id}"`,'g'))||[]).length,1);
 assert.ok(html.includes(`scene-${id}" data-duration="${i===1?4960:3600}" role="img" aria-label=`));
}
assert.ok(html.includes('material-cards.css?v=2'));
assert.ok(!html.includes('reference-cards/card-'),'Do not load the large source animations on the homepage');
assert.ok(!html.includes('reference-cards.css'));
for(const name of ['material-left-hand','material-label-drop','m-mail-left','m-mail-label','m-run-left','m-run-right','m-record','m-band-top','m-wing-left','m-wing-right'])assert.ok(css.includes(`@keyframes ${name}{`));
assert.ok(css.includes('prefers-reduced-motion:reduce')&&css.includes('animation:none!important'));
assert.ok(css.includes('.wing-left>img{transform:scaleX(-1)}'),'Mirror only the illustration inside the left flag');
assert.ok(css.includes('#dialog-art .project-art.material-scene{height:auto;aspect-ratio:4/3}'));
assert.ok(css.includes('.project-open:hover .material-scene>div{translate:none}'));
console.log('PASS: six distinct material scenes, approved card01 artwork, source-free homepage, responsive dialogs and reduced-motion flags.');
