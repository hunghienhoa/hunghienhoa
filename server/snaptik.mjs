import {socialURL} from '../dist/snaptik/core.mjs';
const MAX_FILE=200*1024*1024;
const results=new WeakMap();
const roots=['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktok.com','tiktokv.com','tiktokv.us','muscdn.com','byteoversea.com','ibytedtos.com','tikwm.com','fbcdn.net','cdninstagram.com'];
const error=(status,message,retryAfter)=>Object.assign(new Error(message),{status,retryAfter});
// Cache API của Cloudflare dùng chung giữa mọi isolate (Node không có caches nên bỏ qua). Lỗi bộ nhớ đệm không làm hỏng yêu cầu.
const RESULT_TTL=900,BUSY_TTL=5;
const edgeStore=()=>{try{return typeof caches!=='undefined'?caches.default:null;}catch{return null;}};
const edgeKey=name=>new Request('https://snap-cache.invalid/v1/'+encodeURIComponent(name));
async function edgeGet(store,name){try{const hit=await store?.match(edgeKey(name));return hit?await hit.json():null;}catch{return null;}}
async function edgePut(store,name,value,ttl){try{await store?.put(edgeKey(name),new Response(JSON.stringify(value),{headers:{'Cache-Control':'public, max-age='+ttl}}));}catch{}}
export function mediaURL(value) {
 if(typeof value!=='string'||!value||value.length>12000||!/^(?:https:\/\/|\/(?!\/))/.test(value))return null;
 let url;try{url=new URL(value,'https://www.tikwm.com');}catch{return null;}
 return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&roots.some(root=>url.hostname===root||url.hostname.endsWith('.'+root))?url.href:null;
}
async function limitedText(response,max=262144) {
 const reader=response.body?.getReader();if(!reader)throw error(502,'Nguồn video chưa trả kết quả.');
 let length=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)throw error(502,'Kết quả từ nguồn video quá lớn.');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return new TextDecoder().decode(bytes);
}
async function limitedJSON(response){const text=await limitedText(response);try{return JSON.parse(text);}catch{throw error(502,'Nguồn video đang trả kết quả chưa hợp lệ.');}}
const BUSY='Nguồn video đang bận. Trang sẽ tự thử lại, bạn chờ một chút nhé.';
// Lấy trực tiếp từ trang TikTok như yt-dlp: đọc JSON nhúng (__UNIVERSAL_DATA_FOR_REHYDRATION__ hoặc SIGI_STATE),
// giữ cookie phiên mà TikTok cấp cho trang để tải file từ CDN. Không chạy JavaScript của trang, không cần đăng nhập.
const BROWSER='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIKTOK_HOSTS=['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'];
function keepCookies(jar,response){
 const list=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[response.headers.get('set-cookie')].filter(Boolean);
 for(const line of list){const pair=String(line).split(';')[0].trim(),at=pair.indexOf('=');if(at>0&&at<64&&pair.length<4096&&/^[\w.-]+$/.test(pair.slice(0,at))&&!/[\s,;]/.test(pair.slice(at+1)))jar.set(pair.slice(0,at),pair.slice(at+1));if(jar.size>24)break;}
}
const cookieHeader=jar=>[...jar].map(([k,v])=>k+'='+v).join('; ');
export function tiktokItem(html){
 const block=id=>html.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))?.[1];
 let item;
 try{const data=JSON.parse(block('__UNIVERSAL_DATA_FOR_REHYDRATION__')||'null');const detail=data?.__DEFAULT_SCOPE__?.['webapp.video-detail'];
  if(detail?.statusCode&&detail.statusCode!==0)return {unavailable:true};item=detail?.itemInfo?.itemStruct;}catch{}
 if(!item){try{const sigi=JSON.parse(block('SIGI_STATE')||'null');item=Object.values(sigi?.ItemModule||{})[0];}catch{}}
 return item&&/^\d{15,22}$/.test(String(item.id))?item:null;
}
async function tiktokDirect(url,fetcher){
 const jar=new Map();let page=url,html;
 for(let hop=0;hop<5;hop++){
  const r=await fetcher(page,{headers:{'User-Agent':BROWSER,Accept:'text/html,application/xhtml+xml',
   'Accept-Language':'vi-VN,vi;q=0.9,en;q=0.8',...(jar.size?{Cookie:cookieHeader(jar)}:{})},redirect:'manual',signal:AbortSignal.timeout(15000)});
  keepCookies(jar,r);
  if([301,302,303,307,308].includes(r.status)){await r.body?.cancel();const next=new URL(r.headers.get('location')||'',page);
   if(next.protocol!=='https:'||!TIKTOK_HOSTS.includes(next.hostname))throw error(502,'TikTok chuyển hướng tới địa chỉ lạ.');page=next.href;continue;}
  if(!r.ok||!/text\/html/.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw error(502,'Trang TikTok chưa trả nội dung.');}
  html=await limitedText(r,4194304);break;
 }
 const item=html&&tiktokItem(html);
 if(!item||item.unavailable)throw error(404,'TikTok chưa trả dữ liệu cho bài này.');
 const v=item.video||{},formats=[],seen=new Set();
 const add=(kind,label,source,size=0)=>{source=mediaURL(source);if(source&&!seen.has(source)){seen.add(source);formats.push({kind,label,size,source});}};
 const rates=(Array.isArray(v.bitrateInfo)?v.bitrateInfo:[]).filter(b=>b?.PlayAddr?.UrlList?.length).sort((a,b)=>(b.Bitrate||0)-(a.Bitrate||0));
 // Dung lượng chỉ ghi khi chắc chắn thuộc đúng đường dẫn đó (playAddr có thể là bản khác với các mức bitrate).
 const sizeOf=src=>Number(rates.find(b=>b.PlayAddr.UrlList.includes(src))?.PlayAddr?.DataSize)||0;
 const basic=v.playAddr||rates.at(-1)?.PlayAddr?.UrlList?.[0];
 add('video','Video MP4',basic,sizeOf(basic));
 if(rates[0])add('hd','Video chất lượng cao',rates[0].PlayAddr.UrlList[0],Number(rates[0].PlayAddr.DataSize)||0);
 if(!formats.length)add('video','Video MP4',v.downloadAddr);
 add('audio','Âm thanh',item.music?.playUrl);
 const images=(item.imagePost?.images||[]).slice(0,50).map(i=>mediaURL(i?.imageURL?.urlList?.[0])).filter(Boolean);
 if(!formats.some(f=>f.kind!=='audio')&&!images.length)throw error(404,'Bài này chưa có file phù hợp để tải.');
 const author=item.author&&typeof item.author==='object'?item.author.nickname||item.author.uniqueId:item.author;
 return {platform:'tiktok',id:String(item.id),url,title:typeof item.desc==='string'&&item.desc?item.desc.slice(0,2000):'Một video từ TikTok',author:typeof author==='string'?author.slice(0,150):'',
  cover:mediaURL(v.cover||v.originCover||images[0]),duration:Number(v.duration)||0,formats,images,headers:{Cookie:cookieHeader(jar),Referer:'https://www.tiktok.com/','User-Agent':BROWSER}};
}
async function resolveTikTok(url,fetcher,store) {
 // Ưu tiên trang TikTok; chỉ khi trang chưa trả dữ liệu mới dùng TikWM làm dự phòng.
 try{return await tiktokDirect(url,fetcher);}catch{}
 return resolveTikwm(url,fetcher,store);
}
async function resolveTikwm(url,fetcher,store) {
 let response,result;
 // Nguồn vừa báo bận cách đây vài giây thì không gọi dồn thêm, trả lời ngay để người dùng thử lại sau.
 if(await edgeGet(store,'tikwm-busy'))throw error(429,BUSY,BUSY_TTL);
 const delays=[1200,2500],busy=async()=>{await edgePut(store,'tikwm-busy',1,BUSY_TTL);return error(429,BUSY,BUSY_TTL);};
 for(let attempt=0;attempt<=delays.length;attempt++){
 try{response=await fetcher('https://www.tikwm.com/api/',{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({url,hd:'1'}),signal:AbortSignal.timeout(25000),redirect:'manual'});}
 catch{throw error(504,'Nguồn video phản hồi chậm. Trang sẽ tự thử lại, bạn chờ một chút nhé.',3);}
 if(response.status===429){await response.body?.cancel();if(attempt<delays.length){await new Promise(resolve=>setTimeout(resolve,delays[attempt]));continue;}throw await busy();}
 if(!response.ok){await response.body?.cancel();throw error(502,'Chưa kết nối được nguồn video. Hãy thử lại sau.',4);}
 result=await limitedJSON(response);
 if(result.code!==0&&/limit|frequen|too many|busy/i.test(result.msg||'')){if(attempt<delays.length){await new Promise(resolve=>setTimeout(resolve,delays[attempt]));continue;}throw await busy();}
 break;
 }
 const d=result?.data;
 if(result.code!==0||!d||!/^\d{15,22}$/.test(String(d.id)))throw error(404,'Chưa lấy được nội dung. Kiểm tra bài còn công khai và liên kết đã đầy đủ nhé.');
 const formats=[];
 for(const [kind,key,label,size]of [['video','play','Video MP4','size'],['hd','hdplay','Video chất lượng cao','hd_size'],['audio','music','Âm thanh','']]){
  const source=mediaURL(d[key]);if(source&&(kind!=='hd'||source!==mediaURL(d.play)))formats.push({kind,label,size:Number(d[size])||0,source});
 }
 const images=Array.isArray(d.images)?d.images.slice(0,50).map(mediaURL).filter(Boolean):[];
 if(!formats.length&&!images.length)throw error(404,'Bài này chưa có file phù hợp để tải.');
 return {platform:'tiktok',id:String(d.id),url,title:typeof d.title==='string'?d.title.slice(0,2000):'Một video từ TikTok',author:typeof d.author?.nickname==='string'?d.author.nickname.slice(0,150):'',cover:mediaURL(d.cover),duration:Number(d.duration)||0,formats,images};
}
// Chỉ đọc literal JSON trong dữ liệu nhúng, không chạy JavaScript của trang nguồn.
export function embeddedData(html){
 const objects=[];let visited=0;
 function walk(value,depth=0){
  if(++visited>100000||depth>50)return;
  if(typeof value==='string'&&/^[{\["]/.test(value)){try{walk(JSON.parse(value),depth+1);}catch{}return;}
  if(!value||typeof value!=='object')return;
  if(!Array.isArray(value))objects.push(value);
  for(const child of Object.values(value))walk(child,depth+1);
 }
 for(const [,raw]of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){
  try{walk(JSON.parse(raw));continue;}catch{}
  const pos=raw.indexOf('.handle(');if(pos<0)continue;
  const start=pos+8;let depth=0,quote=false,escape=false;
  for(let i=start;i<raw.length;i++){const c=raw[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;}else if(c==='"')quote=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){try{walk(JSON.parse(raw.slice(start,i+1)));}catch{}break;}}
 }
 return objects;
}
function entities(text){return String(text).replace(/&(?:amp|quot|apos|lt|gt|#x[\da-f]+|#\d+);/gi,m=>{const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};if(named[m])return named[m];const n=parseInt(m.slice(m[2].toLowerCase()==='x'?3:2,-1),m[2].toLowerCase()==='x'?16:10);return Number.isFinite(n)&&n<=0x10ffff?String.fromCodePoint(n):'';});}
function metaTag(html,key){for(const [,tag]of html.matchAll(/(<meta\b[^>]*>)/gi)){const attrs={};for(const [,name,,value]of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g))attrs[name.toLowerCase()]=entities(value);if((attrs.property||attrs.name)===key)return attrs.content||'';}return '';}
async function metaPage(value,fetcher){
 let url=value;
 for(let i=0;i<5;i++){
  let r;try{r=await fetcher(url,{headers:{Accept:'text/html','User-Agent':'Snap/1.0 (+https://hunghienhoa.com/snaptik/)'},redirect:'manual',signal:AbortSignal.timeout(20000)});}catch{throw error(504,'Nguồn phản hồi chậm. Hãy thử lại sau một chút.');}
  if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();try{const next=new URL(location,url),embed=/\/embed(?:\/captioned)?\/?$/.test(next.pathname);if(embed)next.pathname=next.pathname.replace(/\/embed(?:\/captioned)?\/?$/,'/');const post=socialURL(next.href);url=post.url+(embed&&post.platform==='instagram'?'embed/':'');}catch{throw error(404,'Bài chưa có nội dung nhúng công khai để tải.');}continue;}
  if(!r.ok){await r.body?.cancel();throw error(r.status===429?429:502,'Nguồn chưa trả được nội dung. Hãy thử lại sau.');}
  return {url,html:await limitedText(r,2097152)};
 }
 throw error(502,'Liên kết chuyển hướng quá nhiều lần. Hãy sao chép lại link bài gốc.');
}
function facebookId(value){const u=new URL(value);return u.pathname.match(/\/(?:reel|videos)\/(?:[^/]+\/)?(\d{5,25})\/?$/)?.[1]||u.searchParams.get('v');}
async function resolveMeta({platform,url},fetcher){
 let page,id,root,details;const formats=[],images=[];
 if(platform==='instagram'){
  const code=new URL(url).pathname.split('/')[2];
  // Hai trang nhúng công khai có thể trả dữ liệu khác nhau trong cùng thời điểm.
  for(const suffix of ['embed/','embed/captioned/']){
   page=await metaPage('https://www.instagram.com/p/'+code+'/'+suffix,fetcher);
   root=embeddedData(page.html).find(v=>v.shortcode===code&&/^(GraphVideo|GraphImage|GraphSidecar)$/.test(v.__typename||''));
   if(root?.owner?.is_private)throw error(404,'Bài Instagram này không công khai.');
   const nodes=root?.edge_sidecar_to_children?.edges?.map(e=>e?.node)||[root];
   if(nodes.some(v=>v&&(v.is_video===true?mediaURL(v.video_url):mediaURL(v.display_url))))break;
  }
  if(!root)throw error(503,'Instagram tạm thời chưa cung cấp dữ liệu tải cho liên kết này. Bạn thử lại sau một chút nhé.',5);
  id=String(root.id||code);const nodes=root.edge_sidecar_to_children?.edges?.map(e=>e?.node)||[root];
  for(const node of nodes.slice(0,50)){if(!node)continue;const source=mediaURL(node.video_url);if(node.is_video===true){if(source)formats.push({kind:formats.length?'video-'+formats.length:'video',label:'Video MP4'+(nodes.length>1?' · '+(formats.length+1):''),size:0,source});}else{const image=mediaURL(node.display_url);if(image)images.push(image);}}
 }else{
  id=facebookId(url);
  if(!id){details=await metaPage(url,fetcher);id=facebookId(details.url)||facebookId(metaTag(details.html,'og:url')||url);}
  if(!/^\d{5,25}$/.test(id||''))throw error(404,'Chưa nhận diện được video Facebook. Hãy sao chép liên kết trực tiếp của video hoặc Reels.');
  page=await metaPage('https://www.facebook.com/plugins/video.php?'+new URLSearchParams({href:'https://www.facebook.com/reel/'+id}),fetcher);
  const videoFrom=html=>{
   const matches=embeddedData(html).filter(v=>String(v.video_id||v.id)===id);
   if(matches.some(v=>v.is_live_stream===true||v.is_live_streaming===true))throw error(422,'Video đang trực tiếp chưa được hỗ trợ. Hãy thử lại sau khi buổi phát kết thúc.');
   const v=matches.find(v=>mediaURL(v.sd_src||v.browser_native_sd_url)||mediaURL(v.hd_src||v.browser_native_hd_url));
   return v?{...v,sd_src:v.sd_src||v.browser_native_sd_url,hd_src:v.hd_src||v.browser_native_hd_url}:null;
  };
  root=videoFrom(page.html);
  if(!root){
   details||=await metaPage('https://www.facebook.com/reel/'+id,fetcher);
   root=videoFrom(details.html);
  }
  if(!root)throw error(503,'Facebook tạm thời chưa cung cấp dữ liệu tải cho liên kết này. Bạn thử lại sau một chút nhé.',5);
  details||=await metaPage(url,fetcher).catch(()=>null);
  for(const [kind,key,label]of [['video','sd_src','Video MP4'],['hd','hd_src','Video chất lượng cao']]){const source=mediaURL(root[key]);if(source&&(kind!=='hd'||source!==mediaURL(root.sd_src)))formats.push({kind,label,size:0,source});}
 }
 if(!/^[\w-]{5,64}$/.test(id)||!formats.length&&!images.length)throw error(404,'Bài này chưa có file phù hợp để tải.');
 const caption=root.edge_media_to_caption?.edges?.[0]?.node?.text;
 const html=details?.html||page.html;
 return {platform,id,url,title:String(caption||metaTag(html,'og:description')||metaTag(html,'og:title')||'Một chút hay từ '+(platform==='instagram'?'Instagram':'Facebook')).slice(0,2000),author:String(root.owner?.full_name||root.owner?.username||'').slice(0,150),duration:Number(root.video_duration)||0,cover:mediaURL(root.display_url||metaTag(html,'og:image'))||images[0]||null,formats,images};
}
// Ba lớp giảm số lần gọi nguồn: bộ nhớ trong isolate (60 giây), Cache API dùng chung (15 phút) và gộp các yêu cầu trùng đang chạy.
export async function resolveVideo(value,fetcher=fetch,store=edgeStore()){
 let selected;try{selected=socialURL(value);}catch(e){throw error(400,e.message);}
 let state=results.get(fetcher);if(!state){state={cache:new Map(),flight:new Map()};results.set(fetcher,state);}
 const {cache,flight}=state,saved=cache.get(selected.url);if(saved&&saved.until>Date.now())return saved.data;
 if(flight.has(selected.url))return flight.get(selected.url);
 const work=(async()=>{
  const shared=await edgeGet(store,'r:'+selected.url);
  const data=shared||(selected.platform==='tiktok'?await resolveTikTok(selected.url,fetcher,store):await resolveMeta(selected,fetcher));
  if(!shared)await edgePut(store,'r:'+selected.url,data,RESULT_TTL);
  cache.set(selected.url,{until:Date.now()+60000,data});if(cache.size>32)cache.delete(cache.keys().next().value);
  return data;
 })().finally(()=>flight.delete(selected.url));
 flight.set(selected.url,work);return work;
}
export function publicVideo(data) {return {...data,headers:undefined,formats:data.formats.map(({source,...format})=>format),images:undefined,imageCount:data.images.length};}
async function openFile(source,kind,id,fetcher,sourceHeaders) {
 let response,url=source;
 for(let redirects=0;redirects<=3;redirects++){
  response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(600000),...(sourceHeaders?{headers:sourceHeaders}:{})});
  if(![301,302,303,307,308].includes(response.status))break;
  const location=response.headers.get('location');await response.body?.cancel();
  try{url=location&&mediaURL(new URL(location,url).href);}catch{url=null;}if(!url||redirects===3)throw error(502,'Đường dẫn tải đã thay đổi. Hãy lấy lại liên kết.');
 }
 if(!response.ok||!response.body){await response.body?.cancel();throw error(502,'File đã hết hạn hoặc nguồn đang bận. Hãy lấy lại liên kết.');}
 if(Number(response.headers.get('content-length'))>MAX_FILE){await response.body.cancel();throw error(413,'File vượt quá giới hạn 200 MB cho mỗi lần tải.');}
 const reader=response.body.getReader(),parts=[];let prefixSize=0;
 try{while(prefixSize<16){const part=await reader.read();if(part.done)break;parts.push(part.value);prefixSize+=part.value.length;}}catch{await reader.cancel().catch(()=>{});throw error(502,'Chưa đọc được file từ nguồn.');}
 const bytes=new Uint8Array(prefixSize);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 if(bytes.length>MAX_FILE){await reader.cancel();throw error(413,'File vượt quá giới hạn 200 MB cho mỗi lần tải.');}
 const header=new TextDecoder('ascii').decode(bytes.slice(4,8)),mime=(response.headers.get('content-type')||'').split(';')[0];
 let type,extension;
 if(kind==='image'&&bytes[0]===255&&bytes[1]===216){type='image/jpeg';extension='jpg';}
 else if(kind==='image'&&bytes[0]===137&&bytes[1]===80){type='image/png';extension='png';}
 else if(kind==='image'&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'){type='image/webp';extension='webp';}
 else if(kind!=='image'&&header==='ftyp'){type=kind==='audio'?'audio/mp4':'video/mp4';extension=kind==='audio'?'m4a':'mp4';}
 else if(kind==='audio'&&(new TextDecoder().decode(bytes.slice(0,3))==='ID3'||bytes[0]===255&&(bytes[1]&224)===224)&&['audio/mpeg','application/octet-stream'].includes(mime)){type='audio/mpeg';extension='mp3';}
 if(!type){await reader.cancel();throw error(502,'File nguồn chưa đúng định dạng. Hãy thử lấy lại liên kết.');}
 let size=bytes.length;
 const stream=new ReadableStream({start(controller){controller.enqueue(bytes);},async pull(controller){try{const {done,value}=await reader.read();if(done){controller.close();return;}size+=value.length;if(size>MAX_FILE){await reader.cancel();controller.error(error(413,'File quá lớn.'));return;}controller.enqueue(value);}catch(e){controller.error(e);}},cancel(){return reader.cancel();}});
 const headers={'Content-Type':type,'Content-Disposition':`attachment; filename="snap-${id}.${extension}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'};
 const length=response.headers.get('content-length');if(length)headers['Content-Length']=length;
 return new Response(stream,{headers});
}
export async function snaptikRoute(request,{fetcher=fetch,store=edgeStore()}={}) {
 const url=new URL(request.url),route=url.pathname.replace(/^\/api\/snap\//,'/api/snaptik/'),file=route==='/api/snaptik/file';
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)throw error(403,'Nguồn yêu cầu chưa được cho phép.');
 if(file&&request.method==='GET'){
  try {
  const kind=url.searchParams.get('kind'),index=url.searchParams.get('index');
  if(!/^(?:video(?:-\d{1,2})?|hd|audio|image)$/.test(kind||'')||kind==='image'&&!/^\d{1,2}$/.test(index||''))throw error(400,'Kiểu file chưa hợp lệ.');
  const data=await resolveVideo(url.searchParams.get('url'),fetcher,store),source=kind==='image'?data.images[Number(index)]:data.formats.find(f=>f.kind===kind)?.source;
  if(!source)throw error(404,'Bài này chưa có định dạng được chọn.');
  return await openFile(source,kind,data.id,fetcher,data.headers);
  }catch(e){
   if(!request.headers.get('accept')?.includes('text/html'))throw e;
   const text=String(e.message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const back='/snaptik/';
   return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Chưa tải được file — Snap của Hùng</title><body style="background:#fbf2e3;color:#303487;font-family:Arial,sans-serif;max-width:650px;margin:12vh auto;padding:24px;line-height:1.8"><h1>Chưa tải được file.</h1><p>${text}</p><a href="${back}">Trở về Snap để thử lại</a></body></html>`,{status:e.status||502,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
  }
 }
 if(route!=='/api/snaptik/resolve'||request.method!=='POST')throw error(405,'Hãy dán liên kết trên trang Snap để lấy video.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw error(415,'Yêu cầu cần dùng định dạng JSON.');
 const body=await limitedJSON(request).catch(()=>{throw error(400,'Nội dung yêu cầu chưa hợp lệ.');});if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='url'))throw error(400,'Yêu cầu chưa hợp lệ.');
 try{
  const data=await resolveVideo(body.url,fetcher,store);
  return Response.json(publicVideo(data),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
 }catch(e){
  // Lỗi tạm thời: báo số giây nên thử lại để trình duyệt tự thử lại, không biến thành lỗi máy chủ chung.
  if(e.retryAfter)return Response.json({error:e.message,retryAfter:e.retryAfter},{status:e.status,headers:{'Retry-After':String(e.retryAfter),'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  throw e;
 }
}
