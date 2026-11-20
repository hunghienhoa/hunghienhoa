// Làm Nét bằng AI đám mây (Cloudflare Workers AI, FLUX.2 [klein] 4B): kiểm tra yêu cầu, đếm lượt, gọi model.
// Dùng chung cho Worker và server cục bộ. Ảnh và câu lệnh chỉ đi qua bộ nhớ tới Workers AI khi người dùng đồng ý:
// website không lưu, không ghi log nội dung; Workers AI không giữ lại và không dùng để huấn luyện.
import { contributionDay } from './contribution-limit.mjs';
import { fail, imageMime } from './validation.mjs';

export const AI_DAILY_LIMIT = 30;   // tổng mỗi ngày (giờ Việt Nam) cho cả website: tối đa ~3.800 Neuron, dưới 10.000 Neuron miễn phí/ngày
export const AI_CLIENT_LIMIT = 3;   // mỗi người (IP băm theo ngày) mỗi ngày
export const AI_MAX_IMAGE = 1024 * 1024; // ảnh gửi vào nhỏ hơn 512px nên 1 MB là dư
export const AI_MAX_PROMPT = 1000;
export const AI_BODY_LIMIT = Math.ceil(AI_MAX_IMAGE / 3) * 4 + 8192;
export const AI_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const ENHANCE = 'Restore and sharpen this photo. Remove blur, noise and compression artifacts and bring out fine, natural detail. '
  + 'Keep the exact composition, framing, colors, lighting, faces, identity, text and every object unchanged. Do not add, remove or restyle anything.';

export function initAiQuota(sql) {
  sql('CREATE TABLE IF NOT EXISTS ai_quota(day TEXT,client TEXT,count INTEGER NOT NULL,PRIMARY KEY(day,client))');
}

// Giữ một lượt: tăng bộ đếm chung '*' rồi bộ đếm của người dùng; hết lượt nào thì trả lại lượt chung và báo lý do.
// release=true trả lại một lượt khi gọi AI thất bại. Bảng chỉ giữ ngày hiện tại.
export function claimAi(sql, client, now = Date.now(), release = false) {
  const day = contributionDay(now);
  sql('DELETE FROM ai_quota WHERE day<?', day);
  if (release) { sql("UPDATE ai_quota SET count=MAX(0,count-1) WHERE day=? AND client IN (?,'*')", day, client); return aiStatus(sql, client, now); }
  const take = (key, limit) => sql('INSERT INTO ai_quota VALUES(?,?,1) ON CONFLICT(day,client) DO UPDATE SET count=count+1 WHERE count<? RETURNING count', day, key, limit)[0];
  if (!take('*', AI_DAILY_LIMIT)) return { remaining: 0, reason: 'global' };
  if (!take(client, AI_CLIENT_LIMIT)) { sql("UPDATE ai_quota SET count=count-1 WHERE day=? AND client='*'", day); return { remaining: 0, reason: 'client' }; }
  return { ...aiStatus(sql, client, now), claimed: true };
}

export function aiStatus(sql, client, now = Date.now()) {
  const day = contributionDay(now), count = key => sql('SELECT count FROM ai_quota WHERE day=? AND client=?', day, key)[0]?.count || 0;
  return { remaining: Math.max(0, Math.min(AI_CLIENT_LIMIT - count(client), AI_DAILY_LIMIT - count('*'))) };
}

export function quotaMessage(reason) {
  return reason === 'global' ? 'Hôm nay website đã dùng hết lượt AI đám mây. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy.'
    : `Bạn đã dùng đủ ${AI_CLIENT_LIMIT} lượt AI đám mây hôm nay. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy.`;
}

// Kích thước ảnh trả về: bội số của 16, mỗi cạnh 256–1024px.
const side = value => Number.isInteger(value) && value % 16 === 0 && value >= 256 && value <= 1024;

export function parseAiRequest(value) {
  if (value?.mode === 'generate') {
    const prompt = typeof value.prompt === 'string' ? value.prompt.trim() : '';
    if (!prompt || prompt.length > AI_MAX_PROMPT) fail(400, `Hãy mô tả ảnh muốn tạo, tối đa ${AI_MAX_PROMPT.toLocaleString('vi-VN')} ký tự.`);
    return { mode: 'generate', prompt, width: 1024, height: 1024 };
  }
  if (value?.mode !== 'enhance') fail(400, 'Chế độ chưa hợp lệ.');
  if (value.consent !== true) fail(400, 'Bạn cần đồng ý gửi ảnh trước khi dùng AI đám mây.');
  if (!side(value.width) || !side(value.height)) fail(400, 'Kích thước ảnh kết quả chưa hợp lệ.');
  const match = typeof value.image === 'string' && value.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > Math.ceil(AI_MAX_IMAGE / 3) * 4 || match[2].length % 4) fail(400, 'Chỉ nhận ảnh JPEG, PNG hoặc WebP dưới 1 MB.');
  const image = Buffer.from(match[2], 'base64');
  if (image.length > AI_MAX_IMAGE || image.toString('base64') !== match[2] || imageMime(image) !== match[1]) fail(400, 'Nội dung ảnh không khớp định dạng.');
  return { mode: 'enhance', image, mime: match[1], width: value.width, height: value.height };
}

// Gọi FLUX.2 [klein] qua binding Workers AI (env.AI trên Worker; server cục bộ truyền vào khi có).
export async function runAi(request, ai) {
  if (!ai?.run) fail(503, 'AI đám mây chưa được bật trên website này.');
  const form = new FormData();
  form.append('prompt', request.mode === 'enhance' ? ENHANCE : request.prompt);
  form.append('width', String(request.width));
  form.append('height', String(request.height));
  if (request.mode === 'enhance') form.append('input_image_0', new Blob([request.image], { type: request.mime }), 'anh.' + request.mime.split('/')[1]);
  const multipart = new Response(form);
  let data;
  try { data = await ai.run(AI_MODEL, { multipart: { body: multipart.body, contentType: multipart.headers.get('content-type') } }); }
  catch (error) {
    // Lỗi của Workers AI chỉ nói về hạn mức/định dạng/bộ lọc, không chứa ảnh hay câu lệnh: ghi lại để chẩn đoán.
    const detail = String(error?.message || error).slice(0, 300);
    console.error(JSON.stringify({ message: 'lamnet_ai_failed', detail }));
    if (/4006|daily free allocation|neurons/i.test(detail)) fail(503, 'Hôm nay AI đám mây đã dùng hết phần miễn phí. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy.');
    if (/nsfw|safety|flagged|moderat|policy/i.test(detail)) fail(422, 'AI từ chối xử lý nội dung này. Hãy thử ảnh hoặc mô tả khác.');
    fail(502, 'AI đám mây đang gặp lỗi. Hãy thử lại sau.');
  }
  if (typeof data?.image !== 'string' || !data.image) fail(422, 'AI không trả về ảnh. Hãy thử ảnh hoặc mô tả khác.');
  const bytes = Buffer.from(data.image, 'base64');
  try { return { bytes, mime: imageMime(bytes) }; } catch { fail(502, 'AI trả về dữ liệu không phải ảnh. Hãy thử lại sau.'); }
}
