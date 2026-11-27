import { bindings, defineConfig, exports } from "cf/config";

export default defineConfig({
  accountId: "78e6131404ce4500b92bc2362e8ebbe5",
  worker: {
    name: "hunghienhoa",
    entrypoint: "./worker/index.mjs",
    compatibilityDate: "2026-11-09",
    compatibilityFlags: ["nodejs_compat"],
    // blog.hunghienhoa.com chỉ là cổng API nội bộ cho lịch đăng bài tự động (mã đăng bài của môi trường Claude gắn theo host này);
    // khách vào sẽ được chuyển 308 về hunghienhoa.com/blog/.
    domains: ["hunghienhoa.com", "www.hunghienhoa.com", "admin.hunghienhoa.com", "blog.hunghienhoa.com"],
    env: {
      VISITS: bindings.durableObject({ worker: "hunghienhoa", exportName: "VisitCounter" }),
      ASSETS: bindings.assets(),
      AI: bindings.ai(),
      SNAPTIK_LIMIT: bindings.rateLimit({ namespace: "914202611", simple: { limit: 30, period: 60 } }),
      CLOUDFLARE_USAGE_TOKEN: bindings.secret(),
      GITHUB_USAGE_TOKEN: bindings.secret(),
      FRAME_EMAIL: bindings.sendEmail({ destinationAddress: "hunghienhoa2110@gmail.com", allowedSenderAddresses: ["thongbao@hunghienhoa.com"] }),
      SUPABASE_URL: bindings.text("https://sybdjztpsaffwcvjuimd.supabase.co"),
      SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_77IrLLmapoiJaotnK8BAvw_WUtoOnp4"),
      ADMIN_EMAIL: bindings.text("hunghienhoa2110@gmail.com")
    },
    exports: { VisitCounter: exports.durableObject({ storage: "sqlite" }) },
    assets: {
      runWorkerFirst: true,
      htmlHandling: "auto-trailing-slash",
      notFoundHandling: "none"
    },
    observability: {
      enabled: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.05 }
    }
  }
});
