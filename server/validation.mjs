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

export const defaultSite = {
  displayName: 'Hùng Hiền Hòa', shortName: 'Hùng',
  intro: 'Một chút tò mò. Một chút khác biệt.\nVà rất nhiều điều muốn kể bằng thiết kế.',
  about: 'Đây là góc nhỏ dành cho những điều mình sáng tạo: từ một nét vẽ, một câu chuyện đến một thế giới hình ảnh hoàn chỉnh. Mình tin sự tò mò luôn là điểm bắt đầu thú vị.',
  email: 'hunghienhoa2110@gmail.com', phone: '0898.29.8886',
  blogTitle: 'Góc tò mò của Hùng', blogIntro: 'Những điều nhỏ mà thú vị, những ý tưởng muốn giữ lại và những câu chuyện muốn chia sẻ.'
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
  return result;
}
export function design(value) {
  keys(value, ['background', 'ink', 'accent', 'title', 'footer', 'pattern', 'sticker']);
  for (const field of ['background', 'ink', 'accent']) if (typeof value[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[field])) fail(400, 'Màu khung cần có dạng #RRGGBB.');
  if (!['plain', 'grid', 'dots'].includes(value.pattern) || !['star', 'heart', 'flower', 'none'].includes(value.sticker)) fail(400, 'Họa tiết hoặc nhãn dán chưa hợp lệ.');
  return { background: value.background, ink: value.ink, accent: value.accent, title: text(value.title, 60), footer: text(value.footer, 60), pattern: value.pattern, sticker: value.sticker };
}
export function submission(value) {
  keys(value, ['name', 'authorName', 'authorContact', 'authorLink', 'consent', 'design', 'imageDataUrl']);
  if (value.consent !== true) fail(400, 'Cần đồng ý gửi thiết kế khung để xét duyệt.');
  return { name: text(value.name, 100, true), authorName: text(value.authorName, 80, true), authorContact: text(value.authorContact, 200), authorLink: publicLink(value.authorLink), design: design(value.design), image: decodeWebP(value.imageDataUrl, true) };
}
export function post(value) {
  keys(value, ['title', 'slug', 'excerpt', 'content', 'category', 'tags', 'status', 'isSample', 'coverDataUrl']);
  const title = text(value.title, 160, true);
  const slug = text(value.slug, 120) || title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !['draft', 'published'].includes(value.status)) fail(400, 'Đường dẫn hoặc trạng thái bài viết chưa hợp lệ.');
  if (!Array.isArray(value.tags) || value.tags.length > 8 || (value.isSample !== undefined && typeof value.isSample !== 'boolean')) fail(400, 'Nhãn bài viết chưa hợp lệ.');
  return { title, slug, excerpt: text(value.excerpt, 500, true, true), content: text(value.content, 80000, true, true), category: text(value.category, 60, true), tags: [...new Set(value.tags.map(tag => text(tag, 40, true)))], status: value.status, isSample: value.isSample === true, cover: value.coverDataUrl ? decodeWebP(value.coverDataUrl) : value.coverDataUrl === null || value.coverDataUrl === '' ? null : undefined };
}
