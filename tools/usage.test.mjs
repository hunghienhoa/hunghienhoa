import test from 'node:test';
import assert from 'node:assert/strict';
import {usageEntry,usageReport} from '../server/usage.mjs';
import worker from '../worker/index.mjs';
import {providerUsage} from '../worker/usage-providers.mjs';
const now=Date.UTC(2026,10,11,16,59);

test('only API measurements appear; manual history and missing data never become zero',()=>{
  const entries=[usageEntry({id:'cf_requests',used:80000},now),usageEntry({id:'sb_database',used:510},now),usageEntry({id:'cf_month',used:0},now),{id:'sb_storage',used:.9,source:'manual'}];
  let report=usageReport(entries,now),metric=id=>report.metrics.find(row=>row.id===id);
  assert.equal(metric('cf_requests').status,'warning');assert.equal(metric('cf_requests').remaining,20000);
  assert.equal(metric('sb_database').status,'exceeded');assert.equal(metric('sb_database').remaining,0);
  assert.equal(metric('cf_month').used,0);assert.equal(metric('cf_month').percent,null);
  assert.equal(metric('sb_storage').used,null);assert.equal(metric('sb_storage').entry,null);
  report=usageReport(entries,Date.UTC(2026,10,12));assert.equal(metric('cf_requests').used,null);
  report=usageReport(entries,Date.UTC(2026,11,1));assert.equal(metric('cf_month').used,null);
});
test('API values and periods are validated; callers cannot supply a billing period or token',()=>{
  for(const value of [null,[],{id:'unknown',used:0},{id:'sb_storage',used:-1},{id:'sb_storage',used:'1'},{id:'sb_storage',used:Infinity},{id:'sb_storage',used:NaN},{id:'cf_requests',used:.5},{id:'sb_storage',used:1,token:'secret'},{id:'gh_compute',used:1,start:'2026-11-01'}]) assert.throws(()=>usageEntry(value,now),{status:400});
  const entry=usageEntry({id:'cf_month',used:1},now);assert.equal(entry.start,'2026-11-01');assert.equal(entry.end,'2026-11-30');assert.equal(entry.source,'api');
});
test('all Cloudflare metrics and project/repo aggregates are automatic; failures stay unavailable',async t=>{
  const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public',CLOUDFLARE_USAGE_TOKEN:'secret-test'};
  let broken=false;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(broken) return Response.json({error:'provider error'},{status:403});
    const target=String(url);
    if(target.includes('/rpc/')) {assert.equal(options.headers.Authorization,'Bearer admin-test');return Response.json(target.includes('storage')?0:524288000);}
    if(target.includes('/actions/artifacts')) return Response.json({total_count:1,artifacts:[{size_in_bytes:1048576,expired:false}]});
    if(target.includes('/actions/cache/usage')) return Response.json({active_caches_size_in_bytes:1048576});
    if(target.includes('api.github.com')) return Response.json({size:10240});
    assert.equal(options.headers.Authorization,'Bearer secret-test');
    const body=JSON.parse(options.body);assert.ok(['2026-11-11T00:00:00Z','2026-11-01T00:00:00Z'].includes(body.variables.start));
    return Response.json({data:{viewer:{accounts:[{workersInvocationsAdaptive:[{sum:{requests:80000}}],durableObjectsInvocationsAdaptiveGroups:[{sum:{requests:100}}],durableObjectsPeriodicGroups:[{sum:{rowsRead:200,rowsWritten:50}}],durableObjectsSqlStorageGroups:[{max:{storedBytes:1048576}}]}]}}});
  });
  let result=await providerUsage(env,'admin-test',now);const find=id=>result.entries.find(row=>row.id===id);
  assert.equal(find('sb_database').used,500);assert.equal(find('sb_project_storage').used,0);
  assert.equal(find('gh_repo').used,10);assert.equal(find('gh_cache').used,1);assert.equal(find('gh_repo_artifacts').used,1);
  assert.equal(find('gh_artifacts'),undefined);assert.equal(find('cf_requests').used,80000);assert.equal(find('cf_month').used,80000);
  assert.equal(find('cf_do_reads').used,200);assert.equal(find('cf_do_writes').used,50);assert.ok(find('cf_do_storage').used>0);
  assert.equal(result.entries.length,11);assert.ok(result.entries.every(row=>row.source==='api'));assert.ok(!JSON.stringify(result).includes('secret-test'));
  broken=true;result=await providerUsage(env,'admin-test',now);assert.equal(result.entries.length,0);
});
test('artifact pagination includes every page and rejects partial totals',async t=>{
  let tooMany=false;
  t.mock.method(globalThis,'fetch',async url=>{
    const target=String(url);
    if(!target.includes('/actions/artifacts')) return Response.json({}, {status:403});
    const page=Number(new URL(target).searchParams.get('page'));
    return Response.json({total_count:tooMany?1001:101,artifacts:Array.from({length:page===1?100:1},()=>({size_in_bytes:1048576,expired:false}))});
  });
  let result=await providerUsage({SUPABASE_URL:'https://db.example.test'},'admin',now);
  assert.equal(result.entries.find(row=>row.id==='gh_repo_artifacts').used,101);
  tooMany=true;result=await providerUsage({SUPABASE_URL:'https://db.example.test'},'admin',now);assert.ok(!result.entries.some(row=>row.id==='gh_repo_artifacts'));
});
test('GitHub read-only token is sent only to GitHub and never returned',async t=>{
  let githubCalls=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(new URL(url).hostname==='api.github.com') {
      githubCalls++;
      assert.equal(options.headers.Authorization,'Bearer github-read-test');
      if(String(url).includes('/actions/artifacts')) return Response.json({total_count:0,artifacts:[]});
      if(String(url).includes('/actions/cache/usage')) return Response.json({active_caches_size_in_bytes:0});
      return Response.json({size:1024});
    }
    assert.notEqual(options.headers.Authorization,'Bearer github-read-test');
    return Response.json({}, {status:403});
  });
  const result=await providerUsage({SUPABASE_URL:'https://db.example.test',GITHUB_USAGE_TOKEN:'github-read-test'},'admin',now);
  assert.equal(githubCalls,4);
  assert.equal(result.entries.length,3);
  assert.ok(!JSON.stringify(result).includes('github-read-test'));
});
test('billing reports actual monthly Actions charges and discounts, not free allowance consumed',async t=>{
  let invalid=false;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    if(!String(url).includes('/billing/usage/summary')) return Response.json({}, {status:403});
    assert.equal(options.headers.Authorization,'Bearer billing-read');
    assert.equal(new URL(url).searchParams.get('month'),'11');
    return Response.json({timePeriod:{year:2026,month:invalid?10:11},usageItems:[{product:'Actions',unitType:'minutes',grossQuantity:155,grossAmount:.93,discountAmount:.93,netAmount:0}]});
  });
  const env={SUPABASE_URL:'https://db.example.test',GITHUB_USAGE_TOKEN:'billing-read'};
  let result=await providerUsage(env,'admin',now),report=usageReport(result.entries,now),find=id=>report.metrics.find(row=>row.id===id);
  assert.equal(find('gh_compute').used,0);assert.equal(find('gh_compute').limit,null);
  assert.equal(find('gh_actions_gross').used,.93);assert.equal(find('gh_actions_discount').used,.93);assert.equal(find('gh_actions_minutes').used,155);
  assert.equal(find('gh_lfs').used,null);assert.equal(find('gh_artifacts').used,null);
  invalid=true;result=await providerUsage(env,'admin',now);assert.equal(result.entries.length,0);
});
test('usage endpoint is admin-only and read-only; old counter storage is never accessed',async t=>{
  const env={SUPABASE_URL:'https://db.example.test',SUPABASE_PUBLISHABLE_KEY:'public',ADMIN_EMAIL:'owner@example.test',VISITS:{get:()=>{throw new Error('Manual snapshot storage must not be read');}}};
  let email=env.ADMIN_EMAIL;
  t.mock.method(globalThis,'fetch',async url=>String(url).includes('/auth/v1/user')?Response.json({email}):Response.json({}, {status:403}));
  const url='https://admin.hunghienhoa.com/api/admin/usage',request=(method='GET')=>new Request(url,{method,headers:{Authorization:'Bearer test'}});
  assert.equal((await worker.fetch(new Request(url),env)).status,401);
  email='outsider@example.test';assert.equal((await worker.fetch(request(),env)).status,403);email=env.ADMIN_EMAIL;
  const write=await worker.fetch(request('PUT'),env);assert.equal(write.status,405);assert.equal(write.headers.get('Allow'),'GET');
  const response=await worker.fetch(request(),env);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.ok((await response.json()).metrics.every(row=>row.used===null));
});
