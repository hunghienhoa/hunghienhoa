import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  accountId: "78e6131404ce4500b92bc2362e8ebbe5",
  worker: {
    name: "hunghienhoa",
    entrypoint: "./worker/index.mjs",
    compatibilityDate: "2026-11-09",
    compatibilityFlags: ["nodejs_compat"],
    domains: ["hunghienhoa.com", "www.hunghienhoa.com", "admin.hunghienhoa.com", "blog.hunghienhoa.com", "photobooth.hunghienhoa.com"],
    env: {
      ASSETS: bindings.assets(),
      SUPABASE_URL: bindings.text("https://sybdjztpsaffwcvjuimd.supabase.co"),
      SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_77IrLLmapoiJaotnK8BAvw_WUtoOnp4"),
      ADMIN_EMAIL: bindings.text("hunghienhoa2110@gmail.com")
    },
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
