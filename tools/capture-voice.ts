import { chromium, expect } from "@playwright/test";
import { writeFileSync, statSync } from "node:fs";
import { initialState } from "../src/game/state";
import { activeAssets as assets } from "../src/game/content";
import { SAVE_KEY } from "../src/storage/save";
const state = initialState();
state.phase = "playerTurn";
state.head = "か";
state.actor = "player";
state.settings = {
  ...state.settings,
  mode: "practice",
  opponent: "turns",
  muted: false,
  tutorialSeen: true,
};
state.board = {
  ids: assets.slice(0, 24).map((a) => a.id),
  head: state.head,
  seed: "voice-guide",
  version: "test",
  fallback: false,
};
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s: state, key: SAVE_KEY },
  );
  const page = await context.newPage();
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        paired: true,
        hostSettings: true,
        busy: false,
        lan: false,
        maxSeconds: 900,
      },
    }),
  );
  await page.goto(process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card").first()).toBeEnabled();
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await expect(page.getByText("ホスト設定", { exact: false })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/voice-options.png" });
  writeFileSync(
    "docs/screenshots/voice-options.json",
    JSON.stringify(
      {
        width: 1280,
        height: 900,
        bytes: statSync("docs/screenshots/voice-options.png").size,
        note: "Isolated sample game. Disconnected voice settings; availability status is stubbed. No API session, real code or conversation included.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Captured disconnected voice settings");
} finally {
  await browser.close();
}
