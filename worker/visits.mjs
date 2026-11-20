import { initVisits, recordVisit, visitSummary } from '../server/visits.mjs';
import {initContributionLimit,claimContribution} from '../server/contribution-limit.mjs';
import {initAiQuota,claimAi,aiStatus} from '../server/lamnet-ai.mjs';
export class VisitCounter {
  constructor(ctx) {
    this.sql = (query, ...params) => [...ctx.storage.sql.exec(query, ...params)];
    initVisits(this.sql);
    initContributionLimit(this.sql);
    initAiQuota(this.sql);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if(['/ai','/ai-release','/ai-status'].includes(url.pathname)) {
      const key=url.searchParams.get('key');
      if(!/^[a-f0-9]{64}$/.test(key||'')) return new Response(null,{status:400});
      if(url.pathname==='/ai-status') return Response.json(aiStatus(this.sql,key));
      if(request.method!=='POST') return new Response(null,{status:405});
      const result=claimAi(this.sql,key,Date.now(),url.pathname==='/ai-release');
      return Response.json(result,{status:result.reason?429:200});
    }
    if(request.method==='POST' && ['/contribution','/contribution-release'].includes(url.pathname)) {
      const key=url.searchParams.get('key');
      if(!/^[a-f0-9]{64}$/.test(key||'')) return new Response(null,{status:400});
      const remaining=claimContribution(this.sql,key,Date.now(),url.pathname.endsWith('release'));
      return Response.json({remaining},{status:remaining===null?429:200});
    }
    if (request.method === 'POST' && url.pathname === '/record') {
      const key=url.searchParams.get('key');
      if(!/^[a-f0-9]{64}$/.test(key||'')) return new Response(null,{status:400});
      recordVisit(this.sql, url.searchParams.get('page'), Date.now(), key);
      return Response.json({ok:true});
    }
    if (request.method === 'GET' && url.pathname === '/summary') return Response.json(visitSummary(this.sql), {headers:{'Cache-Control':'no-store'}});
    return new Response(null,{status:404});
  }
}
