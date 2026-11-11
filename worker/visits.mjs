import { initVisits, recordVisit, visitSummary } from '../server/visits.mjs';
import {initContributionLimit,claimContribution} from '../server/contribution-limit.mjs';
import {initUsage,readUsage,saveUsage} from '../server/usage.mjs';
export class VisitCounter {
  constructor(ctx) {
    this.sql = (query, ...params) => [...ctx.storage.sql.exec(query, ...params)];
    initVisits(this.sql);
    initContributionLimit(this.sql);
    initUsage(this.sql);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname==='/usage') {
      const headers={'Cache-Control':'no-store'};
      if (request.method==='GET') return Response.json(readUsage(this.sql),{headers});
      if (request.method==='PUT') {
        try { return Response.json(saveUsage(this.sql,await request.json()),{headers}); }
        catch(error) { return Response.json({error:error.status===400?error.message:'Chưa lưu được số liệu.'},{status:error.status===400?400:500,headers}); }
      }
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
