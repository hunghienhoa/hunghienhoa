// Các game bài nhiều người đã được gỡ khỏi website. Lớp này được giữ lại, rỗng, vì Durable Object GameRoom vẫn còn
// được khai báo trong cloudflare.config.ts; gỡ hẳn một lớp Durable Object cần bước di chuyển (migration) riêng trên Cloudflare.
export class GameRoom {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch() { return new Response('Trò chơi này đã được gỡ.', { status: 410 }); }
}
