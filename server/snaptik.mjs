import {socialURL} from '../dist/snaptik/core.mjs';
const MAX_FILE=200*1024*1024;
const results=new WeakMap();
const roots=['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktok.com','muscdn.com','byteoversea.com','ibytedtos.com','tikwm.com','fbcdn.net','cdninstagram.com'];
const error=(status,message)=>Object.assign(new Error(message),{status});
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
async function resolveTikTok(url,fetcher) {
 let response,result;
 for(let attempt=0;attempt<2;attempt++){
 try{response=await fetcher('https://www.tikwm.com/api/',{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({url,hd:'1'}),signal:AbortSignal.timeout(25000),redirect:'manual'});}
 catch{throw error(504,'Nguồn video phản hồi chậm. Hãy thử lại sau một chút.');}
 if(response.status===429){await response.body?.cancel();if(!attempt){await new Promise(resolve=>setTimeout(resolve,1100));continue;}throw error(429,'Nguồn video đang bận. Bạn chờ một chút rồi thử lại nhé.');}
 if(!response.ok){await response.body?.cancel();throw error(502,'Chưa kết nối được nguồn video. Hãy thử lại sau.');}
 result=await limitedJSON(response);
 if(result.code!==0&&/limit|frequen|too many|busy/i.test(result.msg||'')){if(!attempt){await new Promise(resolve=>setTimeout(resolve,1100));continue;}throw error(429,'Nguồn video đang bận. Bạn chờ một chút rồi thử lại nhé.');}
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
  let r;try{r=await fetcher(url,{headers:{Accept:'text/html','User-Agent':'Snap/1.0 (+https://snap.hunghienhoa.com/)'},redirect:'manual',signal:AbortSignal.timeout(20000)});}catch{throw error(504,'Nguồn phản hồi chậm. Hãy thử lại sau một chút.');}
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
  const code=new URL(url).pathname.split('/')[2];page=await metaPage('https://www.instagram.com/p/'+code+'/embed/',fetcher);
  root=embeddedData(page.html).find(v=>v.shortcode===code&&/^(GraphVideo|GraphImage|GraphSidecar)$/.test(v.__typename||''));
  if(!root||root.owner?.is_private)throw error(404,'Bài Instagram chưa có file nhúng công khai để tải.');
  id=String(root.id||code);const nodes=root.edge_sidecar_to_children?.edges?.map(e=>e?.node)||[root];
  for(const node of nodes.slice(0,50)){if(!node)continue;const source=mediaURL(node.video_url);if(node.is_video===true){if(source)formats.push({kind:formats.length?'video-'+formats.length:'video',label:'Video MP4'+(nodes.length>1?' · '+(formats.length+1):''),size:0,source});}else{const image=mediaURL(node.display_url);if(image)images.push(image);}}
 }else{
  id=facebookId(url);
  if(!id){details=await metaPage(url,fetcher);id=facebookId(details.url)||facebookId(metaTag(details.html,'og:url')||url);}
  if(!/^\d{5,25}$/.test(id||''))throw error(404,'Chưa nhận diện được video Facebook. Hãy sao chép liên kết trực tiếp của video hoặc Reels.');
  page=await metaPage('https://www.facebook.com/plugins/video.php?'+new URLSearchParams({href:'https://www.facebook.com/reel/'+id}),fetcher);
  root=embeddedData(page.html).find(v=>String(v.video_id)===id&&(v.sd_src||v.hd_src));
  if(!root||root.is_live_stream)throw error(404,'Video Facebook chưa có file nhúng công khai để tải. Video đang trực tiếp chưa được hỗ trợ.');
  details||=await metaPage(url,fetcher).catch(()=>null);
  for(const [kind,key,label]of [['video','sd_src','Video MP4'],['hd','hd_src','Video chất lượng cao']]){const source=mediaURL(root[key]);if(source&&(kind!=='hd'||source!==mediaURL(root.sd_src)))formats.push({kind,label,size:0,source});}
 }
 if(!/^[\w-]{5,64}$/.test(id)||!formats.length&&!images.length)throw error(404,'Bài này chưa có file phù hợp để tải.');
 const caption=root.edge_media_to_caption?.edges?.[0]?.node?.text;
 const html=details?.html||page.html;
 return {platform,id,url,title:String(caption||metaTag(html,'og:description')||metaTag(html,'og:title')||'Một chút hay từ '+(platform==='instagram'?'Instagram':'Facebook')).slice(0,2000),author:String(root.owner?.full_name||root.owner?.username||'').slice(0,150),duration:Number(root.video_duration)||0,cover:mediaURL(root.display_url||metaTag(html,'og:image'))||images[0]||null,formats,images};
}
export async function resolveVideo(value,fetcher=fetch){
 let selected;try{selected=socialURL(value);}catch(e){throw error(400,e.message);}
 let cache=results.get(fetcher);if(!cache){cache=new Map();results.set(fetcher,cache);}const saved=cache.get(selected.url);if(saved&&saved.until>Date.now())return saved.data;
 const data=selected.platform==='tiktok'?await resolveTikTok(selected.url,fetcher):await resolveMeta(selected,fetcher);
 cache.set(selected.url,{until:Date.now()+60000,data});if(cache.size>32)cache.delete(cache.keys().next().value);return data;
}
export function publicVideo(data) {return {...data,formats:data.formats.map(({source,...format})=>format),images:undefined,imageCount:data.images.length};}
async function openFile(source,kind,id,fetcher) {
 let response,url=source;
 for(let redirects=0;redirects<=3;redirects++){
  response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(600000)});
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
export async function snaptikRoute(request,{fetcher=fetch}={}) {
 const url=new URL(request.url),route=url.pathname.replace(/^\/api\/snap\//,'/api/snaptik/'),file=route==='/api/snaptik/file';
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)throw error(403,'Nguồn yêu cầu chưa được cho phép.');
 if(file&&request.method==='GET'){
  try {
  const kind=url.searchParams.get('kind'),index=url.searchParams.get('index');
  if(!/^(?:video(?:-\d{1,2})?|hd|audio|image)$/.test(kind||'')||kind==='image'&&!/^\d{1,2}$/.test(index||''))throw error(400,'Kiểu file chưa hợp lệ.');
  const data=await resolveVideo(url.searchParams.get('url'),fetcher),source=kind==='image'?data.images[Number(index)]:data.formats.find(f=>f.kind===kind)?.source;
  if(!source)throw error(404,'Bài này chưa có định dạng được chọn.');
  return await openFile(source,kind,data.id,fetcher);
  }catch(e){
   if(!request.headers.get('accept')?.includes('text/html'))throw e;
   const text=String(e.message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const back=url.hostname==='snap.hunghienhoa.com'?'/':'/snaptik/';
   return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Chưa tải được file — Snap của Hùng</title><body style="background:#fbf2e3;color:#303487;font-family:Arial,sans-serif;max-width:650px;margin:12vh auto;padding:24px;line-height:1.8"><h1>Chưa tải được file.</h1><p>${text}</p><a href="${back}">← Trở về Snap để thử lại</a></body></html>`,{status:e.status||502,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
  }
 }
 if(route!=='/api/snaptik/resolve'||request.method!=='POST')throw error(405,'Hãy dán liên kết trên trang Snap để lấy video.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw error(415,'Yêu cầu cần dùng định dạng JSON.');
 const body=await limitedJSON(request).catch(()=>{throw error(400,'Nội dung yêu cầu chưa hợp lệ.');});if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='url'))throw error(400,'Yêu cầu chưa hợp lệ.');
 const data=await resolveVideo(body.url,fetcher);
 return Response.json(publicVideo(data),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
