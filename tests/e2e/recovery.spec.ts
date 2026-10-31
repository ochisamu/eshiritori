import { completeRound } from "./_test";
import { openGameControl, test, expect, type Page } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { legalMoves } from "../../src/game/rules";
import { CPU_VERSION } from "../../src/game/cpu";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
function fixture(head = "か"): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head,
    settings: {
      ...s.settings,
      mode: "practice",
      muted: true,
      tutorialSeen: true,
    },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head,
      seed: "recovery-ui",
      version: "fixture",
      cpuVersion: CPU_VERSION,
      fallback: false,
      initialDiscovered: [],
    },
  };
}
async function saved(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  ) as Promise<GameState>;
}
async function ready(page: Page) {
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.locator(".board-overlay")).toHaveCount(0);
}
async function tabTo(page: Page, target: ReturnType<Page["locator"]>) {
  for (let i = 0; i < 160; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw Error("Keyboard focus did not reach requested control");
}
test("keyboard alone completes start, answer, result, review, next and catalog", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await tabTo(
    page,
    page.getByRole("button", { name: "さっそく、あそぶ", exact: true }),
  );
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    page.getByRole("button", { name: "さあ、はじめよう", exact: true }),
  );
  await page.keyboard.press("Enter");
  await ready(page);
  await page.clock.runFor(6500);
  await expect(page.locator(".hint-button")).toBeEnabled();
  // A fresh match includes the CPU search and answer reveal before human input.
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 15000,
  });
  const s = await saved(page),
    move = legalMoves(assets, position(s))[0];
  const index = s.board!.ids.indexOf(move.assetId);
  await tabTo(page, page.locator(".picture-card").nth(index));
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () =>
        (await saved(page)).moves.find((m) => m.actor === "player")?.assetId,
    )
    .toBe(move.assetId);
  // Player reveal + maximum CPU search + CPU reveal can exceed a five-second poll.
  await page.clock.runFor(6000);
  await expect
    .poll(
      async () =>
        (await saved(page)).phase !== "resolvingMove" &&
        (await saved(page)).phase !== "cpuThinking",
    )
    .toBe(true);
  await completeRound(page);
  await tabTo(
    page,
    page.getByRole("button", { name: "読みを見返す", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "この対戦のことば" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await tabTo(
    page,
    page.getByRole("button", { name: "つぎの対戦へ", exact: true }),
  );
  await page.keyboard.press("Enter");
  await ready(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await tabTo(
    page,
    page.getByRole("button", { name: "ひとやすみ", exact: true }),
  );
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    page.getByRole("button", { name: "発見ずかん", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "ひらめき発見ずかん" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});
test("kana entry and confirmation fit a reduced viewport and rotation", async ({
  page,
}, info) => {
  const s = fixture("あ");
  await page.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s, key: SAVE_KEY },
  );
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await ready(page);
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", { name: "札15を拡大・読みを入力", exact: true })
    .click();
  const field = page.getByRole("textbox", { name: "かなで回答" }),
    submit = page.getByRole("button", { name: "回答", exact: true });
  for (const viewport of [
    { width: 360, height: 360 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await field.fill("あまがさ");
    await submit.scrollIntoViewIfNeeded();
    const a = await field.boundingBox(),
      b = await submit.boundingBox();
    expect(a!.y).toBeGreaterThanOrEqual(0);
    expect(b!.y + b!.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `reports/kana-reduced-viewport-${info.project.name}.png`,
  });
  await field.press("Enter");
  await expect
    .poll(async () => (await saved(page)).moves[0]?.word)
    .toBe("あまがさ");
});
test("image-load failure is recoverable without recording a loss", async ({
  page,
}) => {
  test.info().annotations.push({
    type: "intentional-fault",
    description:
      "Abort image requests, expect resource console errors, then remove fault and retry.",
  });
  await page.route("**/assets/card-*.webp*", (route) => route.abort());
  await page.goto("/");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "さあ、はじめよう", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "盤面を準備できませんでした",
      exact: true,
    }),
  ).toBeVisible();
  expect((await saved(page)).stats.played).toBe(0);
  await page.unroute("**/assets/card-*.webp*");
  await page
    .getByRole("button", { name: "別の盤面で再試行", exact: true })
    .click();
  await ready(page);
  expect((await saved(page)).stats.played).toBe(0);
});
test("storage unavailable still permits play and displays a warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("test storage denied", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await expect(page.locator(".warning")).toContainText("保存できません");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "さあ、はじめよう", exact: true })
    .click();
  await ready(page);
  // CPU search plus the answer reveal can exceed the default five-second poll.
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 15000,
  });
});
test("corrupt current data restores backup, preserves original, and reload does not duplicate a move", async ({
  page,
}) => {
  const s = fixture();
  s.stats.played = 7;
  await page.addInitScript(
    ({ s, key }) => {
      if (!sessionStorage.getItem("fault-installed")) {
        localStorage.setItem(key, "{");
        localStorage.setItem(key + ".backup", JSON.stringify(s));
        sessionStorage.setItem("fault-installed", "1");
      }
    },
    { s, key: SAVE_KEY },
  );
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".warning")).toContainText("復旧");
  expect((await saved(page)).stats.played).toBe(7);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key + ".damaged"),
      SAVE_KEY,
    ),
  ).toBe("{");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await ready(page);
  await page.locator(".picture-card").nth(14).click();
  await expect.poll(async () => (await saved(page)).moves.length).toBe(1);
  const moveId = (await saved(page)).moves[0].id;
  await page.reload();
  expect((await saved(page)).moves).toHaveLength(1);
  expect((await saved(page)).moves[0].id).toBe(moveId);
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await ready(page);
  expect((await saved(page)).moves[0].id).toBe(moveId);
  expect((await saved(page)).stats.played).toBe(7);
});
test("offline local package decodes every approved board and detail image", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180000);
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL!).origin) return route.continue();
    external.push(url.href);
    return route.abort();
  });
  const s = fixture();
  await page.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s, key: SAVE_KEY },
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await ready(page);
  const files = assets.flatMap((a) => [
    { url: a.image, size: 256 },
    { url: a.detail, size: 512 },
    ...(a.thumbnail ? [{ url: a.thumbnail, size: 128 }] : []),
    ...(a.preview ? [{ url: a.preview, size: 96 }] : []),
  ]);
  const result = await page.evaluate(async (files) => {
    let decoded = 0;
    const failed: string[] = [];
    for (let i = 0; i < files.length; i += 8)
      await Promise.all(
        files.slice(i, i + 8).map(async (file) => {
          try {
            const response = await fetch(file.url);
            if (!response.ok) throw Error(String(response.status));
            const blob = await response.blob(),
              url = URL.createObjectURL(blob);
            try {
              const img = new Image();
              img.src = url;
              await img.decode();
              if (
                img.naturalWidth !== file.size ||
                img.naturalHeight !== file.size
              )
                throw Error("size");
              decoded++;
            } finally {
              URL.revokeObjectURL(url);
            }
          } catch {
            failed.push(file.url);
          }
        }),
      );
    return { decoded, failed };
  }, files);
  expect(result.failed).toEqual([]);
  expect(result.decoded).toBe(files.length);
  expect(external).toEqual([]);
  await page.locator(".picture-card").nth(14).click();
  await expect(page.locator(".used-word")).toHaveCount(1);
  // Advance animation frames too: fastForward skips RAF ticks used by the thinking timer.
  await page.clock.runFor(6000);
  // WebKit may commit React's final timer update after runFor resolves.
  await expect
    .poll(
      async () =>
        (await page
          .getByRole("button", { name: "つぎの対戦へ", exact: true })
          .isVisible()) || (await page.locator(".hint-button").isEnabled()),
    )
    .toBe(true);
  await completeRound(page);
  await page.getByRole("button", { name: "つぎの対戦へ", exact: true }).click();
  await ready(page);
  await openGameControl(page, "発見ずかん");
  await expect(page.getByRole("dialog")).toBeVisible();
});
