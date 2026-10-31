import { selectGameMode } from "./_test";
import { openGameControl, test, expect, type Page } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState } from "../../src/game/state";
import { headKana, tailKana } from "../../src/game/normalization";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
const asset = assets
  .slice(0, 12)
  .find(
    (a) =>
      a.readings.length > 2 &&
      a.readings.some((r) => r.kind !== "basic" && tailKana(r.kana) !== "ん"),
  )!;
const reading = asset.readings.find(
  (r) => r.kind !== "basic" && tailKana(r.kana) !== "ん",
)!;
function fixture(known: string[] = [], reducedMotion = false): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head: headKana(reading.kana),
    discovered: known,
    settings: {
      ...s.settings,
      mode: "practice",
      tutorialSeen: true,
      muted: true,
      reducedMotion,
    },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: headKana(reading.kana),
      seed: "reward-ui",
      version: "test",
      fallback: false,
    },
  };
}
async function restore(page: Page, s: GameState) {
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: SAVE_KEY },
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card").first()).toBeEnabled();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}
async function answer(page: Page) {
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `札${assets.indexOf(asset) + 1}を拡大・読みを入力`,
      exact: true,
    })
    .click();
  await page.getByRole("textbox", { name: "かなで回答" }).fill(reading.kana);
  await page.getByRole("textbox", { name: "かなで回答" }).press("Enter");
  await page.clock.runFor(50);
}
test("new alternative has a one-time stamp and surprised CPU, then expires", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await restore(page, fixture());
  await answer(page);
  await expect(page.locator(".success-pop .discovery-stamp")).toContainText(
    "NEW!",
  );
  await expect(page.locator(".cpu-companion")).toHaveAttribute(
    "data-mood",
    "surprised",
  );
  await page.screenshot({
    path: `reports/reactions/new-reading-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.clock.runFor(900);
  await expect(page.locator(".success-pop .discovery-stamp")).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.locator(".success-pop .discovery-stamp")).toBeVisible();
  await page.clock.runFor(500);
  await expect(page.locator(".discovery-stamp")).toHaveCount(0);
});
test("complete picture gets a persistent gold catalog mark, and showing answers earns no marks", async ({
  page,
}, info) => {
  await restore(
    page,
    fixture(asset.readings.filter((r) => r.id !== reading.id).map((r) => r.id)),
  );
  await answer(page);
  await expect(page.locator(".stamp-complete")).toBeVisible();
  await page.clock.runFor(2100);
  await expect(page.locator(".stamp-complete")).toBeVisible();
  await openGameControl(page, "発見ずかん");
  await expect(page.locator(".catalog-complete")).toHaveCount(1);
  await expect(page.locator(".catalog-medal")).toHaveCount(1);
  await page.getByRole("checkbox", { name: /答えも表示/ }).check();
  await expect(page.locator(".catalog-medal")).toHaveCount(1);
  await page.screenshot({
    path: `reports/reactions/catalog-complete-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await expect(page.locator(".discovery-stamp")).toHaveCount(0);
  await openGameControl(page, "発見ずかん");
  await expect(page.locator(".catalog-medal")).toHaveCount(1);
});
test("known alternatives still surprise CPU but never earn a fresh discovery stamp", async ({
  page,
}) => {
  await restore(page, fixture([reading.id]));
  await answer(page);
  await expect(page.locator(".alternative-success")).toBeVisible();
  await expect(page.locator(".discovery-stamp")).toHaveCount(0);
  await expect(page.locator(".cpu-companion")).toHaveAttribute(
    "data-mood",
    "surprised",
  );
});
test("opening visibly scans, compares, locks its selected panel and commits it", async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date("2026-10-31T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T00:00:01Z"));
  await page.goto("/");
  await selectGameMode(page,"practice");
  await page.getByRole("button", { name: "さっそく、あそぶ" }).click();
  await page.getByRole("button", { name: "さあ、はじめよう" }).click();
  await expect(page.locator(".opening-selection")).toHaveAttribute(
    "data-cpu-selection",
    "scan",
  );
  // Pause writes the actual initialized board immediately; active-game saves are throttled.
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  const s = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  )) as GameState;
  const duration = s.cpuRemaining;
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await page.clock.runFor(duration - 850);
  await expect(page.locator(".opening-selection")).toHaveAttribute(
    "data-cpu-selection",
    "compare",
  );
  await expect(page.locator(".cpu-companion")).toHaveAttribute(
    "data-mood",
    "thinking",
  );
  await page.clock.runFor(550);
  await expect(page.locator(".opening-selection")).toHaveAttribute(
    "data-cpu-selection",
    "locked",
  );
  await expect(page.locator(".cpu-companion")).toHaveAttribute(
    "data-mood",
    "idea",
  );
  const slot = s.board!.ids.indexOf(s.board!.opening!.assetId);
  await expect(page.locator(".card-shell").nth(slot)).toHaveClass(/cpu-locked/);
  await page.screenshot({
    path: `reports/reactions/cpu-opening-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.clock.runFor(2400);
  await expect(
    page.locator(".hint-button"),
  ).toBeEnabled();
  const played = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(played.moves[0].readingId).toBe(s.board!.opening!.readingId);
});
test("reduced motion keeps the new reward and CPU readable without animation", async ({
  page,
}) => {
  await restore(page, fixture([], true));
  await answer(page);
  await expect(page.locator(".discovery-stamp")).toBeVisible();
  expect(
    await page
      .locator(".cpu-sprite")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".discovery-stamp")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.clock.runFor(1000);
  await expect(page.locator(".cpu-searching")).toHaveCount(0);
});

test("closing tutorial at the first CPU selection cannot leave a stale pause", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const button = [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "さあ、はじめよう",
      );
      if (document.querySelector(".opening-selection") && button) {
        observer.disconnect();
        button.click();
      }
    });
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  await page.goto("/");
  await selectGameMode(page,"practice");
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "さあ、はじめよう", exact: true }),
  ).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator(".pause-overlay")).toHaveCount(0);
  await expect(
    page.locator(".hint-button"),
  ).toBeEnabled();
});

test("normal answer remains readable for 1.6 seconds without spending thinking time ", async ({
  page,
}) => {
  const basic = asset.readings.find(
    (r) => r.kind === "basic" && tailKana(r.kana) !== "ん",
  )!;
  const s = fixture([basic.id]);
  s.head = headKana(basic.kana);
  s.board!.head = s.head;
  s.settings.mode = "standard";
  await restore(page, s);
  const button = page.locator(".picture-card").nth(assets.indexOf(asset));
  await button.click();
  await page.clock.runFor(50);
  await expect(page.locator(".success-pop")).toContainText(basic.kana);
  const afterAnswer = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  await page.clock.runFor(1300);
  await expect(page.locator(".success-pop")).toBeVisible();
  const during = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(during.remaining).toBe(afterAnswer.remaining);
  await page.clock.runFor(500);
  await expect(page.locator(".success-pop")).toHaveCount(0);
});
