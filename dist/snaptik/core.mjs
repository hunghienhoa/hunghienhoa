export function tiktokURL(value) {
 if(typeof value!=='string'||value.length>2048)throw new Error('Hãy dán một liên kết TikTok công khai.');
 const links=value.match(/https?:\/\/[^\s<>"']+/g)||[];
 if(links.length!==1)throw new Error('Mỗi lần chỉ nhập một liên kết TikTok nhé.');
 let url;try{url=new URL(links[0].replace(/[),.;!]+$/,''));}catch{throw new Error('Liên kết chưa đúng định dạng.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Hãy dùng liên kết HTTPS từ TikTok.');
 const full=['www.tiktok.com','tiktok.com','m.tiktok.com'].includes(url.hostname)&&/^\/@[^/]+\/(?:video|photo)\/\d{15,22}\/?$/.test(url.pathname);
 const short=['vm.tiktok.com','vt.tiktok.com'].includes(url.hostname)&&/^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
 const share=['www.tiktok.com','tiktok.com'].includes(url.hostname)&&/^\/t\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
 if(!full&&!short&&!share)throw new Error('Liên kết cần trỏ tới video hoặc bài ảnh TikTok, không phải trang hồ sơ.');
 url.search='';url.hash='';return url.href;
}
export function fileSize(value) {return Number.isFinite(value)&&value>0?(value/1048576).toLocaleString('vi-VN',{maximumFractionDigits:1})+' MB':'';}
export const platformNames={tiktok:'TikTok',instagram:'Instagram',facebook:'Facebook'};
export function socialURL(value){
 if(typeof value!=='string'||value.length>2048)throw Error('Hãy dán một liên kết TikTok, Instagram hoặc Facebook công khai.');
 const links=value.match(/https?:\/\/[^\s<>"']+/g)||[];if(links.length!==1)throw Error('Mỗi lần chỉ nhập một liên kết nhé.');
 let u;try{u=new URL(links[0].replace(/[),.;!]+$/,''));}catch{throw Error('Liên kết chưa đúng định dạng.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Hãy dùng liên kết HTTPS từ nền tảng được hỗ trợ.');
 if(['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(u.hostname))return {platform:'tiktok',url:tiktokURL(u.href)};
 if(['instagram.com','www.instagram.com','m.instagram.com'].includes(u.hostname)){
  const m=u.pathname.match(/^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)\/?$/);if(!m)throw Error('Instagram: hãy dùng liên kết bài viết hoặc Reels công khai. Story và trang hồ sơ chưa được hỗ trợ.');
  return {platform:'instagram',url:`https://www.instagram.com/${m[1]==='reels'?'reel':m[1]}/${m[2]}/`};
 }
 const fb=['facebook.com','www.facebook.com','m.facebook.com','web.facebook.com'].includes(u.hostname),short=u.hostname==='fb.watch'&&/^\/[\w-]+\/?$/.test(u.pathname);
 if(fb||short){
  const watch=['/watch','/watch/','/video.php'].includes(u.pathname)&&/^\d{5,25}$/.test(u.searchParams.get('v')||'');
  if(!short&&!watch&&!/^\/(?:reel\/\d{5,25}|(?:[\w.-]+\/)?videos\/(?:[^/]+\/)?\d{5,25}|share\/[vr]\/[\w-]+)\/?$/.test(u.pathname))throw Error('Facebook: hãy dùng liên kết video, Reels hoặc liên kết chia sẻ video công khai.');
  if(fb)u.hostname='www.facebook.com';const id=watch?u.searchParams.get('v'):null;u.search='';if(id)u.searchParams.set('v',id);u.hash='';return {platform:'facebook',url:u.href};
 }
 throw Error('Trang hỗ trợ liên kết TikTok, Instagram và Facebook.');
}
