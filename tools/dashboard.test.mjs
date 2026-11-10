import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {initVisits,recordVisit,visitSummary,pageForVisit} from '../server/visits.mjs';
import {VisitCounter} from '../worker/visits.mjs';
import {defaultSite,siteSettings} from '../server/validation.mjs';
const db=new DatabaseSync(':memory:');
const sql=(query,...args)=>db.prepare(query).all(...args);
initVisits(sql);
const now=Date.UTC(2026,10,10,3);
recordVisit(sql,'main',now);recordVisit(sql,'blog',now);recordVisit(sql,'photobooth',now-7*86400000);
let stats=visitSummary(sql,now);
assert.equal(stats.today,2);assert.equal(stats.last7,2);assert.equal(stats.last30,3);assert.equal(stats.total,3);
recordVisit(sql,'main',now+100*86400000);
stats=visitSummary(sql,now+100*86400000);assert.equal(stats.total,4);assert.equal(stats.last30,1);
assert.throws(()=>recordVisit(sql,'admin',now));assert.equal(pageForVisit('/admin/'),null);assert.equal(pageForVisit('/photobooth/app.js'),null);
const counter=new VisitCounter({storage:{sql:{exec:sql}}});
assert.equal((await counter.fetch(new Request('https://counter/summary'))).status,200);
assert.equal((await counter.fetch(new Request('https://counter/record?page=blog&key=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',{method:'POST'}))).status,200);
assert.equal((await counter.fetch(new Request('https://counter/unknown'))).status,404);
const fields=JSON.parse(readFileSync('dist/content-fields.json','utf8'));
assert.ok(fields.length>200);
assert.throws(()=>siteSettings({...defaultSite,pageTexts:{'unknown-key':'x'}}));
assert.throws(()=>siteSettings({...defaultSite,theme:{blue:'url(secret)'}}));
assert.throws(()=>siteSettings({...defaultSite,socials:{facebook:'javascript:alert(1)'}}));
const key=fields[0].key;
const edited=siteSettings({...defaultSite,pageTexts:{[key]:'<img src=x onerror=alert(1)>'}});
const node={nodeType:3,textContent:'Original'},element={dataset:{edit:key},childNodes:[node]};
const colors={},events={};
await vm.runInNewContext(readFileSync('dist/page-customization.js','utf8'),{
  fetch:async()=>Response.json(edited),window:{addEventListener:(key,fn)=>events[key]=fn},
  document:{documentElement:{style:{setProperty:(key,value)=>colors[key]=value}},querySelectorAll:selector=>selector==='[data-edit]'?[element]:[],querySelector:()=>null},
});
assert.equal(node.textContent,'<img src=x onerror=alert(1)>');assert.equal(colors['--blue'],'#303487');
node.textContent='Changed by older content loader';events['hung-content-ready']();assert.equal(node.textContent,edited.pageTexts[key]);
for(const folder of ['blog','photobooth','admin'])assert.equal(readFileSync(`dist/${folder}/page-customization.js`,'utf8'),readFileSync('dist/page-customization.js','utf8'));
const before=visitSummary(sql,now).total;
recordVisit(sql,'main',now,'visitor-a');recordVisit(sql,'main',now,'visitor-a');
assert.equal(visitSummary(sql,now).total,before+1);
recordVisit(sql,'blog',now,'visitor-a');recordVisit(sql,'main',now,'visitor-b');
assert.equal(visitSummary(sql,now).total,before+3);
recordVisit(sql,'main',now+86400000,'visitor-a');
assert.equal(visitSummary(sql,now+86400000).total,before+4);
assert.equal((await counter.fetch(new Request('https://counter/record?page=main',{method:'POST'}))).status,400);
db.close();
console.log('PASS: aggregate-only analytics, time windows, retention, safe text customization and strict settings validation.');

assert.equal(pageForVisit('/photobooth/shoot'),'photobooth');
assert.equal(pageForVisit('/photobooth/shoot.html'),'photobooth');
assert.equal(pageForVisit('/photobooth/shootxhtml'),null);

const {initContributionLimit,claimContribution,contributionDay}=await import('../server/contribution-limit.mjs');
const quotaDb=new DatabaseSync(':memory:');
const limitSql=(query,...args)=>quotaDb.prepare(query).all(...args);
initContributionLimit(limitSql);
assert.deepEqual([claimContribution(limitSql,'qa',now),claimContribution(limitSql,'qa',now),claimContribution(limitSql,'qa',now)],[2,1,0]);
assert.equal(claimContribution(limitSql,'qa',now),null);
claimContribution(limitSql,'qa',now,true);
assert.equal(claimContribution(limitSql,'qa',now),0);
assert.equal(claimContribution(limitSql,'other',now),2);
assert.equal(claimContribution(limitSql,'qa',now+86400000),2);
assert.equal(contributionDay(Date.UTC(2026,10,10,17)),'2026-11-11');

quotaDb.close();
