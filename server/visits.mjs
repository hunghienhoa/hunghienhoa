export const VISIT_PAGES = ['main', 'blog', 'photobooth'];
export const visitDay = now => new Date(now + 7 * 3600000).toISOString().slice(0, 10);
export function initVisits(sql) {
  sql('CREATE TABLE IF NOT EXISTS visit_days(day TEXT,page TEXT,count INTEGER NOT NULL,PRIMARY KEY(day,page))');
  sql('CREATE TABLE IF NOT EXISTS visit_totals(page TEXT PRIMARY KEY,count INTEGER NOT NULL)');
}
export function recordVisit(sql, page, now = Date.now()) {
  if (!VISIT_PAGES.includes(page)) throw new Error('Trang thống kê không hợp lệ.');
  sql('INSERT INTO visit_days VALUES(?,?,1) ON CONFLICT(day,page) DO UPDATE SET count=count+1', visitDay(now), page);
  sql('INSERT INTO visit_totals VALUES(?,1) ON CONFLICT(page) DO UPDATE SET count=count+1', page);
  sql('DELETE FROM visit_days WHERE day<?', visitDay(now - 90 * 86400000));
}
export function visitSummary(sql, now = Date.now()) {
  const daily = sql('SELECT day,SUM(count) AS count FROM visit_days WHERE day>=? GROUP BY day ORDER BY day', visitDay(now - 29 * 86400000));
  const pages = sql('SELECT page,count FROM visit_totals ORDER BY page');
  const sum = since => daily.filter(row => row.day >= since).reduce((total,row) => total + row.count, 0);
  return { total: pages.reduce((total,row) => total + row.count,0), today: sum(visitDay(now)), last7: sum(visitDay(now - 6 * 86400000)), last30: sum(visitDay(now - 29 * 86400000)), pages, daily };
}
export function pageForVisit(path) {
  if (path === '/' || path === '/index.html') return 'main';
  if (/^\/blog\/(?:index.html)?$/.test(path)) return 'blog';
  if (/^\/photobooth\/(?:index\.html|shoot(?:\.html)?)?$/.test(path)) return 'photobooth';
  return null;
}
