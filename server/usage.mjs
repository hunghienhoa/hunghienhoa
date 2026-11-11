import {fail, keys} from './validation.mjs';

// Free allowances verified on 2026-11-11; provider dashboards remain authoritative.
export const usageProviders = {
  supabase: {name:'Supabase', dashboard:'https://supabase.com/dashboard/project/sybdjztpsaffwcvjuimd/settings/billing', source:'https://supabase.com/docs/guides/platform/billing-on-supabase', note:'Database tính theo dự án; quota còn lại dùng chung tổ chức. Ảnh base64 trong bảng tính vào database, không phải Storage.'},
  github: {name:'GitHub', dashboard:'https://github.com/settings/billing/usage', source:'https://docs.github.com/en/billing/reference/product-usage-included', note:'Quota dùng chung tài khoản. Compute cho repo riêng tư tính bằng USD theo loại runner; không quy đổi cố định thành phút.'},
  cloudflare: {name:'Cloudflare', dashboard:'https://dash.cloudflare.com/78e6131404ce4500b92bc2362e8ebbe5/workers-and-pages', source:'https://developers.cloudflare.com/workers/platform/pricing/', note:'Quota dùng chung tài khoản. Ngày reset lúc 00:00 UTC (07:00 giờ Việt Nam). Lượt xem web không tương đương số request Worker.'}
};
export const usageMetrics = [
  {id:'sb_database',provider:'supabase',label:'Database',unit:'MB',limit:500,period:'storage'},
  {id:'sb_project_storage',provider:'supabase',label:'Storage dự án này',unit:'GB',limit:null,period:'storage'},
  {id:'sb_storage',provider:'supabase',label:'Storage',unit:'GB',limit:1,period:'storage'},
  {id:'sb_egress',provider:'supabase',label:'Băng thông ra',unit:'GB',limit:5,period:'month'},
  {id:'sb_mau',provider:'supabase',label:'Người dùng hoạt động',unit:'người',limit:50000,period:'month'},
  {id:'gh_compute',provider:'github',label:'Compute được bao gồm',unit:'USD',limit:12,period:'month'},
  {id:'gh_repo',provider:'github',label:'Mã nguồn repo này',unit:'MB',limit:null,period:'storage'},
  {id:'gh_cache',provider:'github',label:'Cache repo này',unit:'MB',limit:null,period:'storage'},
  {id:'gh_repo_artifacts',provider:'github',label:'Artifacts repo này',unit:'MB',limit:null,period:'storage'},
  {id:'gh_artifacts',provider:'github',label:'Lưu trữ Actions artifacts',unit:'MB',limit:500,period:'storage'},
  {id:'gh_lfs',provider:'github',label:'Git LFS lưu trữ',unit:'GB',limit:10,period:'storage'},
  {id:'gh_bandwidth',provider:'github',label:'Git LFS băng thông',unit:'GB',limit:10,period:'month'},
  {id:'cf_requests',provider:'cloudflare',label:'Worker requests',unit:'request',limit:100000,period:'day'},
  {id:'cf_month',provider:'cloudflare',label:'Worker requests tháng UTC',unit:'request',limit:null,period:'month'},
  {id:'cf_do_requests',provider:'cloudflare',label:'Durable Objects requests',unit:'request',limit:100000,period:'day'},
  {id:'cf_do_reads',provider:'cloudflare',label:'Durable Objects dòng đọc',unit:'dòng',limit:5000000,period:'day'},
  {id:'cf_do_writes',provider:'cloudflare',label:'Durable Objects dòng ghi',unit:'dòng',limit:100000,period:'day'},
  {id:'cf_do_storage',provider:'cloudflare',label:'SQLite đỉnh trong ngày',unit:'GB',limit:5,period:'storage'}
];
export const utcDay = now => new Date(now).toISOString().slice(0,10);


export function usageEntry(value, now = Date.now()) {
  keys(value,['id','used']);
  const metric = usageMetrics.find(item=>item.id===value.id);
  if (!metric || typeof value.used !== 'number' || !Number.isFinite(value.used) || value.used<0 || value.used>Number.MAX_SAFE_INTEGER) fail(400,'Chỉ số hoặc dung lượng chưa hợp lệ.');
  if (['request','dòng','người'].includes(metric.unit) && !Number.isSafeInteger(value.used)) fail(400,'Số lượng cần là số nguyên.');
  const today = utcDay(now);
  let start = today, end = today;
  if (metric.period==='month') {
    start=today.slice(0,7)+'-01';
    end=utcDay(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),0));
  }
  return {id:metric.id,used:value.used,start,end,updatedAt:new Date(now).toISOString(),source:'api'};
}

export function usageReport(entries, now = Date.now()) {
  const today=utcDay(now);
  return {verifiedAt:'2026-11-11',today,providers:usageProviders,metrics:usageMetrics.map(metric=>{
    const entry=entries.find(row=>row.id===metric.id && row.source==='api');
    const expired=!!entry && metric.period!=='storage' && (today<entry.start || today>entry.end);
    const used=entry && !expired ? entry.used : null;
    const percent=used!==null && metric.limit!==null ? used/metric.limit*100 : null;
    return {...metric,used,percent,remaining:percent===null?null:Math.max(0,metric.limit-used),status:used===null?'unknown':percent>=100?'exceeded':percent>=80?'warning':'ok',reason:used===null?(['gh_repo','gh_repo_artifacts','gh_cache','sb_database','sb_project_storage'].includes(metric.id)?'API chưa trả số liệu hợp lệ; hệ thống sẽ tự thử lại.':metric.provider==='github'?'API billing tài khoản chưa có quyền đọc; không dùng số ước đoán.':metric.provider==='supabase'?'API usage cấp tổ chức chưa được kết nối; không dùng số ước đoán.':'API chưa trả số liệu hợp lệ; hệ thống sẽ tự thử lại.' ):null,expired,stale:!!entry && now-Date.parse(entry.updatedAt)>86400000,entry:entry||null};
  })};
}
