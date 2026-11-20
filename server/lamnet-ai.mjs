// Làm Nét bằng Gemini: kiểm tra yêu cầu, đếm lượt, gọi API. Dùng chung cho Worker và server cục bộ.
// Ảnh và câu lệnh chỉ đi qua bộ nhớ tới Google khi người dùng đồng ý: không lưu, không ghi log nội dung.
import { contributionDay } from './contribution-limit.mjs';
import { fail, imageMime } from './validation.mjs';

export const AI_DAILY_LIMIT = 30;   // tổng mỗi ngày (giờ Việt Nam) cho cả website, để chặn trần chi phí
export const AI_CLIENT_LIMIT = 3;   // mỗi người (IP băm theo ngày) mỗi ngày
export const AI_MAX_IMAGE = 3 * 1024 * 1024;
export const AI_MAX_PROMPT = 1000;
export const AI_BODY_LIMIT = Math.ceil(AI_MAX_IMAGE / 3) * 4 + 8192;
export const AI_MODELS = { gemini: 'gemini-nano-banana-2.1' };
const NAMES = { gemini: 'Gemini' };
const ENHANCE = 'Restore and sharpen this photo. Remove blur, noise and compression artifacts and bring out fine, natural detail. '
  + 'Keep the exact composition, framing, colors, lighting, faces, identity, text and every object unchanged. Do not add, remove or restyle anything.';
const TIMEOUT = 120000;

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
  return reason === 'global' ? 'Hôm nay website đã dùng hết lượt Gemini. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy.'
    : `Bạn đã dùng đủ ${AI_CLIENT_LIMIT} lượt Gemini hôm nay. Hãy quay lại vào ngày mai, hoặc dùng chế độ làm nét trên máy.`;
}

export function parseAiRequest(value) {
  const provider = value?.provider, mode = value?.mode;
  if (!Object.hasOwn(NAMES, provider)) fail(400, 'Hãy chọn Gemini.');
  if (mode === 'generate') {
    const prompt = typeof value.prompt === 'string' ? value.prompt.trim() : '';
    if (!prompt || prompt.length > AI_MAX_PROMPT) fail(400, `Hãy mô tả ảnh muốn tạo, tối đa ${AI_MAX_PROMPT.toLocaleString('vi-VN')} ký tự.`);
    return { provider, mode, prompt };
  }
  if (mode !== 'enhance') fail(400, 'Chế độ chưa hợp lệ.');
  if (value.consent !== true) fail(400, 'Bạn cần đồng ý gửi ảnh trước khi dùng Gemini.');
  const match = typeof value.image === 'string' && value.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > Math.ceil(AI_MAX_IMAGE / 3) * 4 || match[2].length % 4) fail(400, 'Chỉ nhận ảnh JPEG, PNG hoặc WebP dưới 3 MB.');
  const image = Buffer.from(match[2], 'base64');
  if (image.length > AI_MAX_IMAGE || image.toString('base64') !== match[2] || imageMime(image) !== match[1]) fail(400, 'Nội dung ảnh không khớp định dạng.');
  return { provider, mode, image, mime: match[1] };
}

async function call(url, init, provider, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) }); }
  catch { fail(504, `${NAMES[provider]} phản hồi quá lâu. Hãy thử lại sau.`); }
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  const code = data?.error?.code, status = data?.error?.status;
  // Thông điệp lỗi của Google chỉ nói về khóa/hạn mức/định dạng, không chứa ảnh hay câu lệnh: ghi lại để chẩn đoán.
  console.error(JSON.stringify({ message: 'lamnet_ai_failed', provider, status: response.status, code: code || status || null, detail: String(data?.error?.message || '').slice(0, 300) }));
  if (status === 'INVALID_ARGUMENT' && /safety|policy/i.test(data?.error?.message || '')) fail(422, `${NAMES[provider]} từ chối xử lý nội dung này. Hãy thử ảnh hoặc mô tả khác.`);
  if ([401, 403].includes(response.status)) fail(503, `${NAMES[provider]} chưa sẵn sàng (khóa API chưa đúng hoặc chưa bật thanh toán).`);
  if (response.status === 429) fail(503, `${NAMES[provider]} đang bận hoặc hết hạn mức. Hãy thử lại sau.`);
  fail(502, `${NAMES[provider]} đang gặp lỗi. Hãy thử lại sau.`);
}

function result(base64, provider) {
  if (typeof base64 !== 'string' || !base64) fail(422, `${NAMES[provider]} không trả về ảnh. Hãy thử ảnh hoặc mô tả khác.`);
  const bytes = Buffer.from(base64, 'base64');
  try { return { bytes, mime: imageMime(bytes) }; } catch { fail(502, `${NAMES[provider]} trả về dữ liệu không phải ảnh. Hãy thử lại sau.`); }
}

// Gọi Gemini. keys: { gemini }; fetchImpl để test thay bằng bản giả.
export async function runAi(request, keys, fetchImpl = fetch) {
  const key = keys?.[request.provider];
  if (!key) fail(503, `${NAMES[request.provider]} chưa được bật trên website này.`);
  const parts = request.mode === 'enhance'
    ? [{ text: ENHANCE }, { inline_data: { mime_type: request.mime, data: request.image.toString('base64') } }]
    : [{ text: request.prompt }];
  const data = await call(`https://generativelanguage.googleapis.com/v1/models/${AI_MODELS.gemini}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { imageSize: '2K' } } })
  }, 'gemini', fetchImpl);
  const part = data?.candidates?.[0]?.content?.parts?.find(item => item.inlineData || item.inline_data);
  return result((part?.inlineData || part?.inline_data)?.data, 'gemini');
}
