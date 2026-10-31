import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(".cache/playwright");
export default defineConfig({
  metadata: { runId: process.env.TEST_RUN_ID ?? "development" },
  testDir: "tests/e2e",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: process.env.PW_JSON_OUTPUT ?? "reports/e2e-results.json" },
    ],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://127.0.0.1:4173",
    headless: true,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: "/usr/bin/google-chrome",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "firefox",
      testIgnore: /performance\.spec\.ts/,
      use: { browserName: "firefox" },
    },
    ...(process.env.TEST_WEBKIT === "1"
      ? [
          {
            name: "webkit",
            testIgnore: /performance\.spec\.ts/,
            use: { browserName: "webkit" as const },
          },
        ]
      : []),
  ],
});
