import { test, expect } from "./_test";
import { initialState } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { SAVE_KEY } from "../../src/storage/save";
// API fixtures must not be bypassed by a previously activated service worker.
test.use({ serviceWorkers: "block" });
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
    page.getByRole("button", { name: "会話を始めて遊ぶ", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "開始時のマイク オン", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".voice-session-row")).toContainText(
    "未接続・マイク未使用",
  );
  await expect(page.getByRole("meter")).toHaveCount(0);
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

test("one explicit title start prepares the board and requests microphone without a second start", async ({
  page,
}) => {
  let paired = false,
    paid = 0;
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        paired,
        hostSettings: true,
        busy: false,
        lan: false,
        maxSeconds: 900,
        csrf: paired ? "test-csrf" : undefined,
      },
    }),
  );
  await page.route("**/voice-api/host-access", (route) => {
    paired = true;
    return route.fulfill({ json: { csrf: "test-csrf" } });
  });
  await page.route("**/voice-api/session", (route) => {
    paid++;
    return route.fulfill({ status: 400, json: { error: "test_only" } });
  });
  await page.addInitScript(() => {
    AudioContext.prototype.resume = async () => {};
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await expect(
    page.getByLabel("ホストのターミナルに表示された接続コード"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "会話を始めて遊ぶ" }).click();
  const tutorial = page.getByRole("button", { name: "さあ、はじめよう" });
  if (await tutorial.isVisible()) await tutorial.click();
  await expect(
    page.getByRole("status").filter({ hasText: "マイクの許可がありません" }),
  ).toBeVisible({ timeout: 10000 });
  expect(paid).toBe(0);
});
test("host key form stays blank, clears input after submit and does not persist in browser storage", async ({
  page,
}) => {
  const key = "sk-fake-browser-test-value-123456789";
  let configured = false,
    writes = 0;
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: configured,
        paired: true,
        hostSettings: true,
        busy: false,
        lan: false,
        maxSeconds: 900,
        csrf: "test",
      },
    }),
  );
  await page.route("**/voice-api/host-settings", (route) => {
    const data = route.request().postDataJSON();
    expect(data.apiKey).toBe(key);
    writes++;
    configured = true;
    return route.fulfill({ json: { configured: true } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  const input = page.getByLabel("OpenAI APIキー", { exact: true });
  await expect(input).toHaveValue("");
  await input.fill(key);
  await page.getByRole("button", { name: "キーを設定", exact: true }).click();
  await expect(page.locator(".voice-notice")).toContainText("キーを保存");
  expect(writes).toBe(1);
  expect(await input.inputValue()).toBe("");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    key,
  );
});

test("pending microphone permission times out visibly without creating a paid session", async ({
  page,
}) => {
  let paid = 0;
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        paired: true,
        hostSettings: true,
        busy: false,
        lan: false,
        maxSeconds: 900,
        csrf: "test",
      },
    }),
  );
  await page.route("**/voice-api/session", (route) => {
    paid++;
    return route.fulfill({ json: {} });
  });
  const state = initialState();
  state.phase = "playerTurn";
  state.actor = "player";
  state.head = "か";
  state.settings = {
    ...state.settings,
    mode: "practice",
    opponent: "turns",
    tutorialSeen: true,
  };
  state.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "mic-timeout",
    version: "test",
    fallback: false,
  };
  await page.addInitScript(
    ({ state, key }) => {
      localStorage.setItem(key, JSON.stringify(state));
      AudioContext.prototype.resume = async () => {};
      navigator.mediaDevices.getUserMedia = () => new Promise(() => {});
    },
    { state, key: SAVE_KEY },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await page.clock.install();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => new Promise(() => {}) },
    });
  });
  await page.getByRole("button", { name: "会話を開始", exact: true }).click();
  await expect(page.locator(".voice-session-row")).toContainText(
    "マイクの許可を待っています",
  );
  await page.clock.runFor(21000);
  await expect(page.locator(".voice-notice")).toContainText(
    "マイクの許可待ちが続いています",
  );
  expect(paid).toBe(0);
});

test("LAN invite authorizes without code entry and removes the fragment before requests", async ({
  page,
}) => {
  const token = "a".repeat(64);
  let paired = false,
    redeemed = 0;
  await page.route("**/voice-api/status", (route) =>
    route.fulfill({
      json: {
        available: true,
        paired,
        hostSettings: false,
        busy: false,
        lan: true,
        maxSeconds: 900,
        csrf: paired ? "test" : undefined,
      },
    }),
  );
  await page.route("**/voice-api/pair-invite", (route) => {
    expect(route.request().postDataJSON().token).toBe(token);
    expect(route.request().headers().referer).not.toContain(token);
    redeemed++;
    paired = true;
    return route.fulfill({ json: { csrf: "test" } });
  });
  await page.goto("/#connect=" + token);
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => redeemed).toBe(1);
  await expect(page.getByLabel("OpenAI APIキー", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("ホストのターミナルに表示された接続コード"),
  ).toHaveCount(0);
});
