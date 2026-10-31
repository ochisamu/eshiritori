import { test, expect, openGameControl } from "./_test";
import { initialState } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { CPU_VERSION } from "../../src/game/cpu";
import { SAVE_KEY } from "../../src/storage/save";
test("focused match uses three rival appearances and restores each without growing chrome", async ({
  page,
}) => {
  const variants = new Set<string>();
  for (let round = 0; round < 3; round++) {
    const s = initialState();
    s.phase = "playerTurn";
    s.head = "あ";
    s.seed = "rival-study";
    s.round = round;
    s.settings = {
      ...s.settings,
      mode: "practice",
      muted: true,
      tutorialSeen: true,
    };
    s.board = {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "あ",
      seed: s.seed,
      version: "test",
      cpuVersion: CPU_VERSION,
      fallback: false,
    };
    if (round === 0)
      await page.addInitScript(
        ({ key, base }) => {
          const round = Number(
            new URLSearchParams(location.search).get("rivalRound") ?? 0,
          );
          const old = JSON.parse(localStorage.getItem(key) ?? "null");
          if (!old || old.seed !== base.seed || old.round !== round)
            localStorage.setItem(key, JSON.stringify({ ...base, round }));
        },
        { key: SAVE_KEY, base: s },
      );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?rivalRound=${round}`);
    await page
      .getByRole("button", { name: "つづきから遊ぶ", exact: true })
      .click();
    await expect(page.locator(".topbar")).toBeHidden();
    await expect(page.locator(".feedback-bar")).toHaveCount(0);
    await expect(page.locator(".history-strip")).toBeHidden();
    const variant = (await page
      .locator(".cpu-companion")
      .getAttribute("data-variant"))!;
    variants.add(variant);
    expect(
      await page
        .locator(".board-grid")
        .evaluate((e) => e.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(640);
    await page.reload();
    expect(
      await page.locator(".cpu-companion").getAttribute("data-variant"),
    ).toBe(variant);
    await openGameControl(page, "設定");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "アプリとして使う", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("HTTPS");
  }
  expect(variants.size).toBe(3);
});
