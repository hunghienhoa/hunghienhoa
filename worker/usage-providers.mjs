import {usageEntry,utcDay} from '../server/usage.mjs';

async function readJson(url,options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error('Dịch vụ trả HTTP '+response.status);
  return response.json();
}
function nonnegative(value) {
  if((typeof value!=='number' && typeof value!=='string') || (typeof value==='string' && !value.trim())) throw new Error('Số liệu chưa hợp lệ');
  const number=Number(value);
  if(!Number.isFinite(number) || number<0) throw new Error('Số liệu chưa hợp lệ');
  return number;
}
export const dailyQuery='query($account:string!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$account}){workersInvocationsAdaptive(limit:1,filter:{datetime_geq:$start,datetime_leq:$end}){sum{requests}} durableObjectsInvocationsAdaptiveGroups(limit:1,filter:{datetime_geq:$start,datetime_leq:$end}){sum{requests}} durableObjectsPeriodicGroups(limit:1,filter:{datetime_geq:$start,datetime_leq:$end}){sum{rowsRead rowsWritten}} durableObjectsSqlStorageGroups(limit:1000,filter:{datetime_geq:$start,datetime_leq:$end}){dimensions{namespaceId} max{storedBytes}}}}}';
const monthQuery='query($account:string!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$account}){workersInvocationsAdaptive(limit:1,filter:{datetime_geq:$start,datetime_leq:$end}){sum{requests}}}}}';
export async function providerUsage(env,token,now=Date.now()) {
  const entries=[],connections={};
  const entry=(id,used)=>entries.push(usageEntry({id,used},now));
  await Promise.all([
    (async()=>{
      const results=await Promise.allSettled([
        ['admin_database_usage','sb_database',1024**2],['admin_storage_usage','sb_project_storage',1024**3]
      ].map(async([rpc,id,divisor])=>{
        const bytes=await readJson(new URL('/rest/v1/rpc/'+rpc,env.SUPABASE_URL),{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
        entry(id,nonnegative(bytes)/divisor);
      }));
      connections.supabase=`${results.filter(row=>row.status==='fulfilled').length}/2 chỉ số dự án đã kết nối. API usage tổ chức hiện từ chối token chỉ đọc (Unsupported access token); API công khai không có Storage tổ chức, egress và MAU. Ba chỉ số này cần xem tại Dashboard Supabase. MB = 1.024² byte; GB = 1.024³ byte. Không thay số thiếu bằng 0.`;
    })(),
    (async()=>{
      const headers={'User-Agent':'hunghienhoa-admin-usage',Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
      if(env.GITHUB_USAGE_TOKEN) headers.Authorization=`Bearer ${env.GITHUB_USAGE_TOKEN}`;
      const results=await Promise.allSettled([
        readJson('https://api.github.com/repos/hunghienhoa/hunghienhoa',{headers}).then(data=>entry('gh_repo',nonnegative(data.size)/1024)),
        readJson('https://api.github.com/repos/hunghienhoa/hunghienhoa/actions/cache/usage',{headers}).then(data=>entry('gh_cache',nonnegative(data.active_caches_size_in_bytes)/1024**2)),
        (async()=>{
          let total=0,expectedCount;
          // shortcut: bound pagination to 10 pages; report unavailable rather than a partial total beyond 1,000 artifacts.
          for(let page=1;page<=10;page++) {
            const data=await readJson(`https://api.github.com/repos/hunghienhoa/hunghienhoa/actions/artifacts?per_page=100&page=${page}`,{headers});
            if(!Array.isArray(data.artifacts) || !Number.isSafeInteger(data.total_count) || data.total_count>1000) throw new Error('Danh sách artifacts chưa đầy đủ');
            if(expectedCount===undefined) expectedCount=data.total_count;
            if(expectedCount!==data.total_count || data.artifacts.length!==Math.min(100,Math.max(0,expectedCount-(page-1)*100))) throw new Error('Danh sách artifacts thay đổi hoặc thiếu trang');
            total+=data.artifacts.filter(row=>!row.expired).reduce((sum,row)=>sum+nonnegative(row.size_in_bytes),0);
            if(page*100>=data.total_count) {entry('gh_repo_artifacts',total/1024**2);return;}
          }
          throw new Error('Danh sách artifacts chưa đầy đủ');
        })()
      ]);
      let billing='Chưa kết nối quyền đọc billing tài khoản.';
      if(env.GITHUB_USAGE_TOKEN) {
        try {
          const date=new Date(now),year=date.getUTCFullYear(),month=date.getUTCMonth()+1;
          const data=await readJson(`https://api.github.com/users/hunghienhoa/settings/billing/usage/summary?year=${year}&month=${month}`,{headers});
          if(data?.timePeriod?.year!==year || data?.timePeriod?.month!==month || !Array.isArray(data.usageItems)) throw new Error('Kỳ billing chưa hợp lệ');
          const rows=data.usageItems.filter(row=>typeof row.product==='string' && row.product.toLowerCase()==='actions');
          const total=key=>rows.reduce((sum,row)=>sum+nonnegative(row[key]),0);
          const net=total('netAmount'),gross=total('grossAmount'),discount=total('discountAmount');
          const minutes=rows.filter(row=>typeof row.unitType==='string' && row.unitType.toLowerCase()==='minutes').reduce((sum,row)=>sum+nonnegative(row.grossQuantity),0);
          entry('gh_compute',net);entry('gh_actions_gross',gross);entry('gh_actions_discount',discount);entry('gh_actions_minutes',minutes);
          billing='Billing Actions toàn tài khoản đã kết nối. Phút gồm cả lượt chạy được miễn phí; số trước miễn giảm không phải quota đã tiêu hao. Billing có thể cập nhật trễ.';
        } catch {billing='API billing chưa trả báo cáo tháng hợp lệ; hệ thống sẽ tự thử lại.';}
      }
      connections.github=`${results.filter(row=>row.status==='fulfilled').length}/3 chỉ số repo đã kết nối. ${billing} Lưu trữ toàn tài khoản và LFS hiện chưa có số liệu dung lượng hợp lệ; không quy tổng billing theo giờ thành dung lượng hiện tại.`;
    })(),
    (async()=>{
      if(!env.CLOUDFLARE_USAGE_TOKEN) {connections.cloudflare='Chưa kết nối token analytics chỉ đọc.';return;}
      const query=async(text,start)=>{
        const data=await readJson('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:`Bearer ${env.CLOUDFLARE_USAGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:text,variables:{account:'78e6131404ce4500b92bc2362e8ebbe5',start,end:new Date(now).toISOString()}})});
        const account=data?.data?.viewer?.accounts?.[0];
        if(data.errors?.length || !account) throw new Error('Analytics chưa đầy đủ');
        return account;
      };
      const sum=(account,dataset,key)=>{
        if(!Array.isArray(account[dataset])) throw new Error('Thiếu dataset');
        return account[dataset].reduce((total,row)=>total+nonnegative(row?.sum?.[key]),0);
      };
      const results=await Promise.allSettled([
        (async()=>{
          const account=await query(dailyQuery,utcDay(now)+'T00:00:00Z');
          entry('cf_requests',sum(account,'workersInvocationsAdaptive','requests'));
          entry('cf_do_requests',sum(account,'durableObjectsInvocationsAdaptiveGroups','requests'));
          entry('cf_do_reads',sum(account,'durableObjectsPeriodicGroups','rowsRead'));
          entry('cf_do_writes',sum(account,'durableObjectsPeriodicGroups','rowsWritten'));
          const storage=account.durableObjectsSqlStorageGroups;
          if(Array.isArray(storage) && storage.length>0 && storage.length<1000) entry('cf_do_storage',storage.reduce((total,row)=>total+nonnegative(row?.max?.storedBytes),0)/1024**3);
        })(),
        (async()=>{const account=await query(monthQuery,utcDay(now).slice(0,7)+'-01T00:00:00Z');entry('cf_month',sum(account,'workersInvocationsAdaptive','requests'));})()
      ]);
      connections.cloudflare=`${results.filter(row=>row.status==='fulfilled').length}/2 nhóm analytics đã kết nối. Toàn tài khoản, theo UTC; tháng dương lịch. SQLite là tổng đỉnh từng namespace trong ngày, không phải billing chính xác từng thời điểm. Analytics có thể trễ/lấy mẫu.`;
    })()
  ]);
  return {entries,connections};
}
