import contentFields from '../dist/content-fields.json' with { type: 'json' };
import {FRAME_CATEGORIES} from '../dist/photobooth/design.mjs';
export const HOUR = 60 * 60 * 1000;
export const MAX_IMAGE_BYTES = 1024 * 1024;
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
export function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(400, 'Dữ liệu có trường không được hỗ trợ.');
}
export function text(value, maximum, required = false, multiline = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail(400, 'Thông tin cần là văn bản.');
  const result = value.trim();
  if (result.length > maximum || (required && !result) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result) || (!multiline && /[\r\n]/.test(result))) fail(400, 'Độ dài hoặc nội dung văn bản chưa hợp lệ.');
  return result;
}
export function publicLink(value) {
  const link = text(value, 400);
  if (!link) return '';
  let url;
  try { url = new URL(link); } catch { fail(400, 'Liên kết công khai cần bắt đầu bằng http hoặc https.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail(400, 'Liên kết công khai chưa hợp lệ.');
  return url.href;
}
export function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail(400, 'Mật khẩu cần từ 12 đến 128 ký tự.');
  return value;
}

export function decodeWebP(dataUrl, exactFrame = false) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/webp;base64,')) fail(400, 'Chỉ nhận ảnh WebP đã được chuyển đổi.');
  const encoded = dataUrl.slice(23);
  if (!encoded || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail(400, 'Tệp WebP chưa hợp lệ hoặc vượt quá 1 MB.');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== encoded || bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) fail(400, 'Cấu trúc WebP chưa hợp lệ.');
  let dimensions, imageDimensions, imageCount = 0, offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail(400, 'Cấu trúc WebP chưa đầy đủ.');
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > bytes.length || !['VP8X', 'VP8 ', 'VP8L', 'ALPH', 'ICCP'].includes(type)) fail(400, 'Chỉ nhận khung WebP tĩnh, không chứa dữ liệu EXIF/XMP.');
    if (type === 'VP8X') {
      if (size !== 10 || (bytes[start] & 14) || dimensions) fail(400, 'Khung WebP mở rộng chưa hợp lệ.');
      dimensions = [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
    } else if (type === 'VP8 ') {
      if (size < 10 || bytes[start + 3] !== 0x9d || bytes[start + 4] !== 1 || bytes[start + 5] !== 0x2a) fail(400, 'Khung WebP chưa hợp lệ.');
      imageDimensions = [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
      imageCount++;
    } else if (type === 'VP8L') {
      if (size < 5 || bytes[start] !== 0x2f) fail(400, 'Khung WebP nén chưa hợp lệ.');
      const bits = bytes.readUInt32LE(start + 1);
      imageDimensions = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      imageCount++;
    }
    offset = start + size + (size & 1);
  }
  if (offset !== bytes.length || imageCount !== 1 || !imageDimensions) fail(400, 'Khung WebP cần có đúng một ảnh tĩnh.');
  dimensions ||= imageDimensions;
  const [width, height] = dimensions;
  if (width !== imageDimensions[0] || height !== imageDimensions[1] || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 16000000 || (exactFrame && (width !== 720 || height !== 2180))) fail(400, exactFrame ? 'Khung đóng góp cần đúng kích thước 720×2180.' : 'Kích thước ảnh WebP quá lớn hoặc chưa hợp lệ.');
  return bytes;
}

export function imageMime(bytes) {
  bytes = Buffer.from(bytes);
  if (bytes.length >= 12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'image/webp';
  if (bytes.length >= 33 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  fail(400,'Định dạng ảnh không hợp lệ.');
}

export function decodeFrameImage(dataUrl) {
  if (typeof dataUrl !== 'string') fail(400,'Ảnh khung chưa hợp lệ.');
  if (dataUrl.startsWith('data:image/webp;base64,')) return decodeWebP(dataUrl,true);
  const match=dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length>Math.ceil(MAX_IMAGE_BYTES/3)*4 || match[2].length%4) fail(400,'Chỉ nhận WebP, PNG hoặc JPEG dưới 1 MB.');
  const bytes=Buffer.from(match[2],'base64');
  if(bytes.length>MAX_IMAGE_BYTES || bytes.toString('base64')!==match[2] || imageMime(bytes)!==match[1]) fail(400,'Nội dung ảnh không khớp định dạng.');
  let width,height;
  if(match[1]==='image/png') {
    if(bytes.readUInt32BE(8)!==13 || bytes.toString('ascii',12,16)!=='IHDR') fail(400,'Đầu ảnh PNG không hợp lệ.');
    width=bytes.readUInt32BE(16); height=bytes.readUInt32BE(20);
    let offset=8, data=false, ended=false;
    while(offset+12<=bytes.length) {
      const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
      if(offset+12+length>bytes.length || type==='acTL') fail(400,'Chỉ nhận khung PNG tĩnh hợp lệ.');
      if(type==='IDAT') data=true;
      offset+=12+length;
      if(type==='IEND') {ended=length===0 && offset===bytes.length; break;}
    }
    if(!data || !ended) fail(400,'Ảnh PNG chưa đầy đủ.');
  } else {
    if(bytes[bytes.length-2]!==255 || bytes[bytes.length-1]!==217) fail(400,'Ảnh JPEG chưa đầy đủ.');
    let offset=2;
    while(offset+4<=bytes.length) {
      if(bytes[offset++]!==255) fail(400,'Cấu trúc JPEG không hợp lệ.');
      while(bytes[offset]===255) offset++;
      if(offset+3>bytes.length) fail(400,'Đoạn ảnh JPEG bị cắt ngắn.');
      const marker=bytes[offset++];
      if(marker===218 || marker===217) break;
      const length=bytes.readUInt16BE(offset);
      if(length<2 || offset+length>bytes.length) fail(400,'Đoạn ảnh JPEG không hợp lệ.');
      if([192,193,194].includes(marker) && length>=8) {height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);}
      offset+=length;
    }
  }
  if(width!==720 || height!==2180) fail(400,'Khung đóng góp cần đúng kích thước 720×2180.');
  return bytes;
}

export const defaultSite = {
  displayName: 'Hùng Hiền Hòa', shortName: 'Hùng',
  intro: 'Một chút tò mò. Một chút khác biệt.\nVà rất nhiều điều muốn kể bằng thiết kế.',
  about: 'Đây là góc nhỏ dành cho những điều mình sáng tạo: từ một nét vẽ, một câu chuyện đến một thế giới hình ảnh hoàn chỉnh. Mình tin sự tò mò luôn là điểm bắt đầu thú vị.',
  email: 'hunghienhoa2110@gmail.com', phone: '0898.29.8886',
  blogTitle: 'Góc tò mò của Hùng', blogIntro: 'Những điều nhỏ mà thú vị, những ý tưởng muốn giữ lại và những câu chuyện muốn chia sẻ.',
  pageTexts: {}, theme: { cream:'#fbf2e3',blue:'#303487',yellow:'#ffdc38' },
  socials: {facebook:'https://www.facebook.com/quanghungdethuong',instagram:'https://www.instagram.com/im.bqhung/',threads:'https://www.threads.com/@im.bqhung',tiktok:'https://www.tiktok.com/@im.bqhung',zalo:'https://zalo.me/0898298886',youtube:'https://www.youtube.com/@hunghienhoa98886',wechat:'bqhtit'}
};
export function siteSettings(value) {
  keys(value, Object.keys(defaultSite));
  const result = {
    displayName: text(value.displayName, 80, true), shortName: text(value.shortName, 30, true),
    intro: text(value.intro, 400, true, true), about: text(value.about, 3000, true, true),
    email: text(value.email, 160, true), phone: text(value.phone, 40, true),
    blogTitle: text(value.blogTitle, 100, true), blogIntro: text(value.blogIntro, 400, true, true)
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !/^[+\d\s().-]{7,40}$/.test(result.phone)) fail(400, 'Email hoặc số điện thoại chưa hợp lệ.');
  const pageTexts = value.pageTexts ?? {};
  keys(pageTexts, contentFields.map(field => field.key));
  result.pageTexts = Object.fromEntries(Object.entries(pageTexts).map(([key,value]) => [key,text(value,3000,false,true)]));
  if (value.theme!==undefined) keys(value.theme,Object.keys(defaultSite.theme));
  result.theme = {...defaultSite.theme,...value.theme};
  keys(result.theme,Object.keys(defaultSite.theme));
  for (const color of Object.values(result.theme)) if (typeof color!=='string' || !/^#[a-f\d]{6}$/i.test(color)) fail(400,'Màu giao diện cần dạng #RRGGBB.');
  if (value.socials!==undefined) keys(value.socials,Object.keys(defaultSite.socials));
  result.socials = {...defaultSite.socials,...value.socials};
  keys(result.socials,Object.keys(defaultSite.socials));
  for (const [name,link] of Object.entries(result.socials)) {
    if (typeof link!=='string') fail(400,'Liên kết mạng xã hội cần là văn bản.');
    if (name==='wechat') {result.socials[name]=text(link,80,true);continue;}
    let url;try {url=new URL(link);}catch {fail(400,'Liên kết mạng xã hội chưa hợp lệ.');}
    if (url.protocol!=='https:' || url.username || url.password || link.length>500) fail(400,'Mạng xã hội cần liên kết HTTPS hợp lệ.');
  }
  return result;
}
export function design(value) {
  keys(value, ['background', 'ink', 'accent', 'title', 'footer', 'pattern', 'sticker','category']);
  if(value.category!==undefined && !FRAME_CATEGORIES.includes(value.category)) fail(400,'Phân loại khung chưa hợp lệ.');
  for (const field of ['background', 'ink', 'accent']) if (typeof value[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[field])) fail(400, 'Màu khung cần có dạng #RRGGBB.');
  if (!['plain', 'grid', 'dots', 'film', 'checker', 'stripes', 'confetti', 'hearts', 'waves', 'sparkles', 'lace', 'doodles'].includes(value.pattern) || !['star', 'heart', 'flower', 'bow', 'cat', 'cherry', 'cloud', 'butterfly', 'smile', 'none'].includes(value.sticker)) fail(400, 'Họa tiết hoặc nhãn dán chưa hợp lệ.');
  return { background: value.background, ink: value.ink, accent: value.accent, title: text(value.title, 60), footer: text(value.footer, 60), pattern: value.pattern, sticker: value.sticker, ...(value.category?{category:value.category}:{}) };
}
export function submission(value) {
  keys(value, ['name', 'authorName', 'authorContact', 'authorLink', 'consent', 'design', 'imageDataUrl']);
  if (value.consent !== true) fail(400, 'Cần đồng ý gửi thiết kế khung để xét duyệt.');
  return { name: text(value.name, 100, true), authorName: text(value.authorName, 80, true), authorContact: text(value.authorContact, 200), authorLink: publicLink(value.authorLink), design: design(value.design), image: decodeFrameImage(value.imageDataUrl) };
}
export function post(value) {
  keys(value, ['title', 'slug', 'excerpt', 'content', 'category', 'tags', 'status', 'isSample', 'coverDataUrl']);
  const title = text(value.title, 160, true);
  const slug = text(value.slug, 120) || title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['draft', 'published'].includes(value.status)) fail(400, 'Đường dẫn hoặc trạng thái bài viết chưa hợp lệ.');
  if (!Array.isArray(value.tags) || value.tags.length > 8 || (value.isSample !== undefined && typeof value.isSample !== 'boolean')) fail(400, 'Nhãn bài viết chưa hợp lệ.');
  return { title, slug, excerpt: text(value.excerpt, 500, true, true), content: text(value.content, 80000, true, true), category: text(value.category, 60, true), tags: [...new Set(value.tags.map(tag => text(tag, 40, true)))], status: value.status, isSample: value.isSample === true, cover: value.coverDataUrl ? decodeWebP(value.coverDataUrl) : value.coverDataUrl === null || value.coverDataUrl === '' ? null : undefined };
}
