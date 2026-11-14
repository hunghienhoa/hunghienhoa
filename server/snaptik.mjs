import {tiktokURL} from '../dist/snaptik/core.mjs';
const MAX_FILE=200*1024*1024;
const roots=['tiktokcdn.com','tiktokcdn-us.com','tiktokcdn-eu.com','tiktok.com','muscdn.com','byteoversea.com','ibytedtos.com','tikwm.com'];
const error=(status,message)=>Object.assign(new Error(message),{status});
export function mediaURL(value) {
 if(typeof value!=='string'||value.length>12000)return null;
 let url;try{url=new URL(value,'https://www.tikwm.com');}catch{return null;}
 return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&roots.some(root=>url.hostname===root||url.hostname.endsWith('.'+root))?url.href:null;
}
async function limitedJSON(response) {
 const reader=response.body?.getReader();if(!reader)throw error(502,'Nguồn video chưa trả kết quả.');
 let length=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>262144)throw error(502,'Kết quả từ nguồn video quá lớn.');chunks.push(value);}}
 catch(e){await reader.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw error(502,'Nguồn video đang trả kết quả chưa hợp lệ.');}
}
export async function resolveVideo(value,fetcher=fetch) {
 let url;try{url=tiktokURL(value);}catch(e){throw error(400,e.message);}
 let response;
 try{response=await fetcher('https://www.tikwm.com/api/',{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({url,hd:'1'}),signal:AbortSignal.timeout(25000),redirect:'manual'});}
 catch{throw error(504,'Nguồn video phản hồi chậm. Hãy thử lại sau một chút.');}
 if(response.status===429)throw error(429,'Nguồn video đang bận. Bạn chờ một chút rồi thử lại nhé.');
 if(!response.ok)throw error(502,'Chưa kết nối được nguồn video. Hãy thử lại sau.');
 const result=await limitedJSON(response),d=result?.data;
 if(result.code!==0||!d||!/^\d{15,22}$/.test(String(d.id)))throw error(404,'Chưa lấy được nội dung. Kiểm tra bài còn công khai và liên kết đã đầy đủ nhé.');
 const formats=[];
 for(const [kind,key,label,size]of [['video','play','Video MP4','size'],['hd','hdplay','Video chất lượng cao','hd_size'],['audio','music','Âm thanh','']]){
  const source=mediaURL(d[key]);if(source&&(kind!=='hd'||source!==mediaURL(d.play)))formats.push({kind,label,size:Number(d[size])||0,source});
 }
 const images=Array.isArray(d.images)?d.images.slice(0,50).map(mediaURL).filter(Boolean):[];
 if(!formats.length&&!images.length)throw error(404,'Bài này chưa có file phù hợp để tải.');
 return {id:String(d.id),url,title:typeof d.title==='string'?d.title.slice(0,2000):'Một video từ TikTok',author:typeof d.author?.nickname==='string'?d.author.nickname.slice(0,150):'',cover:mediaURL(d.cover),duration:Number(d.duration)||0,formats,images};
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
 const headers={'Content-Type':type,'Content-Disposition':`attachment; filename="snaptik-${id}.${extension}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'};
 const length=response.headers.get('content-length');if(length)headers['Content-Length']=length;
 return new Response(stream,{headers});
}
export async function snaptikRoute(request,{fetcher=fetch}={}) {
 const url=new URL(request.url),file=url.pathname==='/api/snaptik/file';
 const origin=request.headers.get('origin');
 if(origin&&origin!==url.origin)throw error(403,'Nguồn yêu cầu chưa được cho phép.');
 if(file&&request.method==='GET'){
  try {
  const kind=url.searchParams.get('kind'),index=url.searchParams.get('index');
  if(!['video','hd','audio','image'].includes(kind)||kind==='image'&&!/^\d{1,2}$/.test(index||''))throw error(400,'Kiểu file chưa hợp lệ.');
  const data=await resolveVideo(url.searchParams.get('url'),fetcher),source=kind==='image'?data.images[Number(index)]:data.formats.find(f=>f.kind===kind)?.source;
  if(!source)throw error(404,'Bài này chưa có định dạng được chọn.');
  return await openFile(source,kind,data.id,fetcher);
  }catch(e){
   if(!request.headers.get('accept')?.includes('text/html'))throw e;
   const text=String(e.message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const back=url.hostname==='snaptik.hunghienhoa.com'?'/':'/snaptik/';
   return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Chưa tải được file — SnapTik của Hùng</title><body style="background:#fbf2e3;color:#303487;font-family:Arial,sans-serif;max-width:650px;margin:12vh auto;padding:24px;line-height:1.8"><h1>Chưa tải được file.</h1><p>${text}</p><a href="${back}">← Trở về SnapTik để thử lại</a></body></html>`,{status:e.status||502,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
  }
 }
 if(url.pathname!=='/api/snaptik/resolve'||request.method!=='POST')throw error(405,'Hãy dán liên kết trên trang SnapTik để lấy video.');
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw error(415,'Yêu cầu cần dùng định dạng JSON.');
 const body=await limitedJSON(request).catch(()=>{throw error(400,'Nội dung yêu cầu chưa hợp lệ.');});if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='url'))throw error(400,'Yêu cầu chưa hợp lệ.');
 const data=await resolveVideo(body.url,fetcher);
 return Response.json(publicVideo(data),{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}
