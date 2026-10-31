import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "tests/pwa",
  outputDir: "test-results/pwa",
  use: { ...base.use, baseURL: "http://127.0.0.1:4174" },
  reporter: [
    ["list"],
    ["json", { outputFile: process.env.PWA_JSON_OUTPUT ?? "reports/roomy-board/pwa.json" }],
  ],
});
