import {usageEntry,utcDay} from '../server/usage.mjs';

async function readJson(url,options={}) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error('Dịch vụ trả HTTP '+response.status);
  return response.json();
}
function nonnegative(value) {
  if((typeof value!=='number' && typeof value!=='string') || value==='') throw new Error('Số liệu chưa hợp lệ');
  const number=Number(value);
  if(!Number.isFinite(number) || number<0) throw new Error('Số liệu chưa hợp lệ');
  return number;
}
export async function providerUsage(env,token,now=Date.now()) {
  const entries=[],connections={};
  const entry=(id,used)=>entries.push({...usageEntry({id,used},now),source:'api'});
  await Promise.all([
    (async()=>{
      try {
        const bytes=await readJson(new URL('/rest/v1/rpc/admin_database_usage',env.SUPABASE_URL),{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
        entry('sb_database',nonnegative(bytes)/1024/1024);
        connections.supabase='Đã kết nối: database dự án đo tự động. Storage, băng thông và MAU cấp tổ chức đối chiếu dashboard. MB database = 1.024² byte.';
      } catch {connections.supabase='Chưa đọc được database tự động; kiểm tra phiên admin và migration. Các số nhập từ dashboard vẫn được giữ.';}
    })(),
    (async()=>{
      const headers={'User-Agent':'hunghienhoa-admin-usage',Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
      let count=0;
      const results=await Promise.allSettled([
        readJson('https://api.github.com/repos/hunghienhoa/hunghienhoa',{headers}).then(data=>{entry('gh_repo',nonnegative(data.size)/1024);count++;}),
        readJson('https://api.github.com/repos/hunghienhoa/hunghienhoa/actions/artifacts?per_page=100',{headers}).then(data=>{
          // shortcut: aggregate at most 100 artifacts; use dashboard when the repository grows beyond one page.
          if(!Array.isArray(data.artifacts) || !Number.isSafeInteger(data.total_count) || data.total_count!==data.artifacts.length) throw new Error('Danh sách artifacts chưa đầy đủ');
          entry('gh_repo_artifacts',data.artifacts.filter(row=>!row.expired).reduce((sum,row)=>sum+nonnegative(row.size_in_bytes),0)/1024/1024);count++;
        })
      ]);
      connections.github=`Tự động ${count}/2 chỉ số của repo công khai. ${results.some(result=>result.status==='rejected')?'API chưa trả đủ dữ liệu hoặc đã giới hạn truy cập. ':''}Quota billing toàn tài khoản nhập từ dashboard; số liệu riêng repo không được coi là tổng toàn tài khoản.`;
    })(),
    (async()=>{
      if(!env.CLOUDFLARE_USAGE_TOKEN) {connections.cloudflare='Chưa cấu hình token analytics; có thể cập nhật từ dashboard.';return;}
      try {
        const query='query($account: string!, $start: Time!, $end: Time!){viewer{accounts(filter:{accountTag:$account}){workersInvocationsAdaptive(limit:1,filter:{datetime_geq:$start,datetime_leq:$end}){sum{requests}}}}}';
        const data=await readJson('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:`Bearer ${env.CLOUDFLARE_USAGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{account:'78e6131404ce4500b92bc2362e8ebbe5',start:utcDay(now)+'T00:00:00Z',end:new Date(now).toISOString()}})});
        const account=data?.data?.viewer?.accounts?.[0];
        if(data.errors?.length || !Array.isArray(account?.workersInvocationsAdaptive)) throw new Error('Analytics chưa đầy đủ');
        entry('cf_requests',account.workersInvocationsAdaptive.reduce((total,row)=>total+nonnegative(row?.sum?.requests),0));
        connections.cloudflare='Đã kết nối: request Worker toàn tài khoản hôm nay (UTC), theo GraphQL Analytics; có thể trễ hoặc lấy mẫu. Tổng tháng và Durable Objects đối chiếu dashboard.';
      } catch {connections.cloudflare='Chưa đọc được analytics; kiểm tra token chỉ đọc, thời hạn hoặc giới hạn API. Số nhập từ dashboard vẫn được giữ.';}
    })()
  ]);
  return {entries,connections};
}
