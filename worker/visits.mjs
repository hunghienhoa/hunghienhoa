import { initVisits, recordVisit, visitSummary } from '../server/visits.mjs';
export class VisitCounter {
  constructor(ctx) {
    this.sql = (query, ...params) => [...ctx.storage.sql.exec(query, ...params)];
    initVisits(this.sql);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/record') {
      recordVisit(this.sql, url.searchParams.get('page'));
      return Response.json({ok:true});
    }
    if (request.method === 'GET' && url.pathname === '/summary') return Response.json(visitSummary(this.sql), {headers:{'Cache-Control':'no-store'}});
    return new Response(null,{status:404});
  }
}
