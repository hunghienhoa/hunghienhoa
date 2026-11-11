import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initUsage,readUsage,saveUsage,usageEntry,usageReport} from '../server/usage.mjs';
import {VisitCounter} from '../worker/visits.mjs';
import worker from '../worker/index.mjs';
import {providerUsage} from '../worker/usage-providers.mjs';
const now=Date.UTC(2026,10,11,16,59);

test('snapshots persist independently; missing, warning, exceeded and rollover stay distinct',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const sql=(q,...args)=>db.prepare(q).all(...args);initUsage(sql);
    assert.equal(usageReport([],now).metrics[0].used,null);
    saveUsage(sql,{id:'cf_requests',used:80000},now);
    saveUsage(sql,{id:'sb_database',used:510},now);
    saveUsage(sql,{id:'gh_compute',used:0,start:'2026-11-01',end:'2026-11-30'},now);
    let report=usageReport(readUsage(sql),now), metric=id=>report.metrics.find(row=>row.id===id);
    assert.equal(metric('cf_requests').status,'warning');assert.equal(metric('cf_requests').remaining,20000);
    assert.equal(metric('sb_database').status,'exceeded');assert.equal(metric('sb_database').remaining,0);
    assert.equal(metric('gh_compute').used,0);assert.equal(metric('gh_compute').status,'ok');
    report=usageReport(readUsage(sql),Date.UTC(2026,10,12));
    assert.equal(metric('cf_requests').used,null);assert.equal(metric('cf_requests').expired,true);
    assert.equal(metric('sb_database').used,510);
    report=usageReport(readUsage(sql),Date.UTC(2026,11,1));
    assert.equal(metric('gh_compute').used,null);assert.equal(metric('gh_compute').expired,true);
    saveUsage(sql,{id:'cf_month',used:9999999,start:'2026-11-01',end:'2026-11-30'},now);
    report=usageReport(readUsage(sql),now);assert.equal(metric('cf_month').percent,null);assert.equal(metric('cf_month').limit,null);
    assert.equal(readUsage(sql).length,4);
  } finally {db.close();}
});
test('reject malformed values, injected fields, impossible dates and invalid billing periods',()=>{
  for(const value of [null,[],{id:'unknown',used:0},{id:'sb_storage',used:-1},{id:'sb_storage',used:'1'},{id:'sb_storage',used:Infinity},{id:'sb_storage',used:NaN},{id:'cf_requests',used:.5},{id:'sb_storage',used:1,token:'secret'},{id:'gh_compute',used:1},{id:'gh_compute',used:1,start:'2026-02-30',end:'2026-11-30'},{id:'gh_compute',used:1,start:'2026-12-01',end:'2026-12-31'}]) assert.throws(()=>usageEntry(value,now),{status:400});
  assert.equal(usageEntry({id:'gh_compute',used:1,start:'2026-10-20',end:'2026-11-19'},now).end,'2026-11-19');
});
test('live providers keep account and repo scope separate; API failures never become false zero',async t=>{
  const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public',CLOUDFLARE_USAGE_TOKEN:'secret-test'};
  let broken=false;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(broken) return Response.json({error:'provider error'},{status:403});
    const target=String(url);
    if(target.includes('/rpc/')) {assert.equal(options.headers.Authorization,'Bearer admin-test');return Response.json(524288000);}
    if(target.includes('/actions/artifacts')) return Response.json({total_count:1,artifacts:[{size_in_bytes:1048576,expired:false}]});
    if(target.includes('api.github.com')) return Response.json({size:10240});
    assert.equal(options.headers.Authorization,'Bearer secret-test');
    const body=JSON.parse(options.body);assert.equal(body.variables.start,'2026-11-11T00:00:00Z');
    return Response.json({data:{viewer:{accounts:[{workersInvocationsAdaptive:[{sum:{requests:80000}}]}]}}});
  });
  let result=await providerUsage(env,'admin-test',now);
  const find=id=>result.entries.find(row=>row.id===id);
  assert.equal(find('sb_database').used,500);assert.equal(find('gh_repo').used,10);
  assert.equal(find('gh_repo_artifacts').used,1);assert.equal(find('gh_artifacts'),undefined);
  assert.equal(find('cf_requests').used,80000);assert.equal(find('cf_month'),undefined);
  assert.ok(result.entries.every(row=>row.source==='api'));assert.ok(!JSON.stringify(result).includes('secret-test'));
  broken=true;result=await providerUsage(env,'admin-test',now);assert.equal(result.entries.length,0);assert.equal(Object.keys(result.connections).length,3);
});
test('Worker usage endpoint enforces admin and origin, and persists through private counter',async t=>{
  const db=new DatabaseSync(':memory:');
  try {
    const counter=new VisitCounter({storage:{sql:{exec:(q,...args)=>db.prepare(q).all(...args)}}});
    const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public',ADMIN_EMAIL:'owner@example.test',VISITS:{idFromName:()=>'',get:()=>({fetch:request=>counter.fetch(typeof request==='string'?new Request(request):request)})}};
    let email=env.ADMIN_EMAIL;
    t.mock.method(globalThis,'fetch',async()=>Response.json({email}));
    const url='https://admin.hunghienhoa.com/api/admin/usage';
    assert.equal((await worker.fetch(new Request(url),env)).status,401);
    const request=(method='GET',body,origin)=>new Request(url,{method,headers:{Authorization:'Bearer test','Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});
    email='outsider@example.test';assert.equal((await worker.fetch(request(),env)).status,403);email=env.ADMIN_EMAIL;
    assert.equal((await worker.fetch(request('PUT',{id:'sb_storage',used:1},'https://other.test'),env)).status,403);
    assert.equal((await worker.fetch(request('PUT',{id:'sb_storage',used:-1}),env)).status,400);
    assert.equal((await worker.fetch(request('PUT',{id:'sb_storage',used:.8}),env)).status,200);
    const response=await worker.fetch(request(),env);assert.equal(response.headers.get('Cache-Control'),'no-store');
    const report=await response.json();assert.equal(report.metrics.find(row=>row.id==='sb_storage').percent,80);
    assert.equal((await worker.fetch(new Request('https://hunghienhoa.com/api/usage'),env)).status,404);
  } finally {db.close();}
});
