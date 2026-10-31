import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { pwaPlugin } from "./tools/pwa-plugin";
export default defineConfig({
  base: "./",
  plugins: [react(), pwaPlugin()],
  // Keep versioned chunks reachable by a game already open during content production.
  // The release packager selects only the current manifest's dependency closure.
  build: { emptyOutDir: false, manifest: true, assetsInlineLimit: 0 },
  server: {
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/.git/**",
        "**/.voice/**",
        "**/.cache/**",
        "**/artifacts/**",
        "**/*.{key,pem,crt,cer,p12,pfx}",
      ],
    },
    proxy: {
      "/voice-api": {
        target: "http://127.0.0.1:4174",
        ws: true,
        changeOrigin: false,
      },
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/game/**/*.ts", "src/storage/**/*.ts"],
      reporter: ["text", "json", "html"],
    },
  },
});
