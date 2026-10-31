import { test, expect } from "./_test";
import { initialState } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { SAVE_KEY } from "../../src/storage/save";
test("standard game never opens paid sessions and optional voice remains keyless", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("https://api.openai.com/**", (route) => {
    external.push(route.request().method());
    return route.abort();
  });
  let statusCalls = 0;
  await page.route("**/voice-api/status", (route) => {
    statusCalls++;
    return route.fulfill({
      json: {
        available: false,
        paired: false,
        busy: false,
        lan: false,
        maxSeconds: 900,
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
  expect(statusCalls).toBe(0);
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "会話できる対戦相手" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".voice-panel")).toContainText("ホストPC");
  expect(external).toEqual([]);
});
for (const size of [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
  { width: 1024, height: 768 },
]) {
  test(
    "voice controls contain scrolling and preserve board " +
      size.width +
      "x" +
      size.height,
    async ({ page }) => {
      await page.setViewportSize(size);
      await page.route("**/voice-api/status", (route) =>
        route.fulfill({
          json: {
            available: false,
            paired: false,
            busy: false,
            lan: false,
            maxSeconds: 900,
          },
        }),
      );
      const s = initialState();
      s.phase = "playerTurn";
      s.actor = "player";
      s.head = "か";
      s.settings = {
        ...s.settings,
        mode: "practice",
        opponent: "turns",
        muted: true,
        tutorialSeen: true,
      };
      s.board = {
        ids: assets.slice(0, 24).map((a) => a.id),
        head: s.head,
        seed: "voice-layout",
        version: "test",
        fallback: false,
      };
      await page.addInitScript(
        ({ state, key }) => {
          if (!localStorage.getItem(key))
            localStorage.setItem(key, JSON.stringify(state));
        },
        { state: s, key: SAVE_KEY },
      );
      await page.goto("/");
      await page
        .getByRole("button", { name: "つづきから遊ぶ", exact: true })
        .click();
      await expect(page.locator(".picture-card").first()).toBeEnabled();
      const before = await page.locator(".board-grid").boundingBox();
      await page
        .getByRole("button", { name: "ひとやすみ", exact: true })
        .click();
      await page.getByRole("button", { name: "会話する", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "ゲームに戻る", exact: true })
        .click();
      await page
        .getByRole("button", { name: "つづきから遊ぶ", exact: true })
        .click();
      const after = await page.locator(".board-grid").boundingBox();
      expect(after?.width).toBe(before?.width);
      expect(after?.height).toBe(before?.height);
      const save = await page.evaluate(
        (key) => localStorage.getItem(key)!,
        SAVE_KEY,
      );
      for (const word of ["connectionEpoch", "apiKey", "userCaption", "csrf"])
        expect(save).not.toContain(word);
    },
  );
}
test("the title voice option chooses untimed alternating without a paid connection", async ({
  page,
}) => {
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: false,
        paired: false,
        busy: false,
        lan: false,
        maxSeconds: 900,
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await page.getByRole("button", { name: "交互・時間なしを選ぶ" }).click();
  await expect(
    page
      .getByRole("group", { name: "制限時間", exact: true })
      .getByRole("button", { name: "なし", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
});
