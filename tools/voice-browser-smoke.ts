import { chromium, expect } from "@playwright/test";
import { createVoiceServer } from "../server/voice/index";
import { loadConfig, loadHostEnv } from "../server/voice/config";
import { initialState, reducer } from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { activeAssets as assets } from "../src/game/content";
import { SAVE_KEY } from "../src/storage/save";
import { mkdirSync, writeFileSync } from "node:fs";
loadHostEnv();
if (process.env.VOICE_TEST_BUDGET_USD !== "5")
  throw Error("Test budget acknowledgment required");
const config = loadConfig({
  ...process.env,
  VOICE_PORT: "4176",
  VOICE_ALLOWED_ORIGINS: "http://127.0.0.1:4176",
  VOICE_MAX_SESSION_SECONDS: "80",
});
const app = await createVoiceServer(config);
await new Promise<void>((r) => app.server.listen(config.port, "127.0.0.1", r));
const browser = await chromium.launch({
  ignoreDefaultArgs: ["--mute-audio"],
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const context = await browser.newContext({ permissions: ["microphone"] });
let s = initialState();
s = reducer(
  s,
  {
    type: "START",
    seed: "voice-browser",
    settings: {
      ...s.settings,
      mode: "practice",
      opponent: "turns",
      tutorialSeen: true,
      muted: false,
    },
  },
  assets,
);
s = reducer(
  reducer(
    s,
    {
      type: "BOARD",
      board: generateBoard(assets, {
        seed: s.seed,
        round: 0,
        difficulty: "normal",
        discovered: [],
        cpuOpening: true,
      }),
    },
    assets,
  ),
  { type: "READY" },
  assets,
);
await context.addInitScript(
  ({ state, key }) => localStorage.setItem(key, JSON.stringify(state)),
  { state: s, key: SAVE_KEY },
);
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", () => errors.push("browser_exception"));
const begin = Date.now();
try {
  await page.goto("http://127.0.0.1:4176");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await page
    .getByLabel("ホストのターミナルに表示された接続コード")
    .fill(app.pairing.code);
  await page.getByRole("button", { name: "ペアリング", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "会話を開始", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を終了", exact: true }),
  ).toBeEnabled({ timeout: 40000 });
  await page.getByRole("button", { name: "ゲームに戻る", exact: true }).click();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await page.waitForTimeout(18000);
  const caption = await page.locator(".voice-caption").textContent();
  const output = await page.locator(".voice-speaking").count();
  await page.getByRole("button", { name: "会話の操作を開く" }).click();
  await page.getByRole("button", { name: "会話を終了", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  const usage = await page.locator(".voice-usage").textContent();
  const result = {
    connected: true,
    captionGenerated: !!caption,
    outputCurrentlyPlaying: !!output,
    elapsedSeconds: (Date.now() - begin) / 1000,
    usage,
    errors,
    syntheticInput: "Chromium fake microphone, not a human/device microphone",
  };
  mkdirSync("reports/voice", { recursive: true });
  writeFileSync(
    "reports/voice/browser-smoke.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await context.close();
  await browser.close();
  await app.stop();
}
