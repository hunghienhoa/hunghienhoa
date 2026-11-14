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
