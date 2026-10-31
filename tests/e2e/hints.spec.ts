import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { legalMoves } from "../../src/game/rules";
import { refillMode, withReserve } from "../../src/game/refill";
import { CPU_VERSION } from "../../src/game/cpu";
import { SAVE_KEY } from "../../src/storage/save";
import { normalizeReading } from "../../src/game/normalization";
import type { Mode } from "../../src/game/types";

for (const mode of [
  "standard",
  "refill",
  "refillPractice",
  "practice",
  "accessible",
] as Mode[]) {
  test(`hints get concrete on the second use: ${mode}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const s = initialState();
    s.settings = { ...s.settings, mode, muted: true, tutorialSeen: true };
    s.phase = "playerTurn";
    s.head = "か";
    s.board = {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: s.head,
      seed: "hint-ui",
      version: "test",
      cpuVersion: CPU_VERSION,
      initialDiscovered: [],
      fallback: false,
    };
    if (refillMode(mode))
      s.board = withReserve(s.board, s.settings.difficulty, assets);
    const target = legalMoves(assets, position(s))[0];
    expect(target).toBeDefined();
    const slot = s.board.ids.indexOf(target.assetId);
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
    const hint = page.locator(".hint-button");
    const outlines = await page
      .locator(".card-shell")
      .evaluateAll((cards) =>
        cards.map((card) => getComputedStyle(card).outline),
      );
    await hint.click();
    expect(
      await page
        .locator(".card-shell")
        .evaluateAll((cards) =>
          cards.map((card) => getComputedStyle(card).outline),
        ),
    ).toEqual(outlines);
    await expect(page.locator(".hint-message")).toContainText("この絵に注目");
    await expect(page.locator(".hint-target,.hint-marker")).toHaveCount(0);
    const first = await page.locator(".hint-message").textContent();
    await page
      .getByRole("button", { name: "ヒントを閉じる", exact: true })
      .click();
    await expect(page.locator(".hint-message")).toHaveCount(0);
    await hint.click();
    await expect(hint).toContainText("1/3");
    await expect(page.locator(".hint-message")).toHaveText(first!);
    await page
      .getByRole("button", { name: "もう少しヒント", exact: true })
      .click();
    const second = page.locator(".hint-message");
    await expect(second).toContainText(
      `${normalizeReading(target.reading.kana).length}文字`,
    );
    await expect(second).toContainText("？");
    expect(await second.textContent()).not.toBe(first);
    await expect(page.locator(".hint-target,.hint-marker")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (mode === "practice")
      await page.screenshot({
        path: `reports/hints/second-${info.project.name}.png`,
        fullPage: true,
      });
    await page.getByRole("button", { name: "答えを見る", exact: true }).click();
    await expect(second).toContainText(
      `ひとつの答えは「${target.reading.display}」`,
    );
    await expect(hint).toBeEnabled();
    await expect(page.locator(".hint-next")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.locator(".hint-popover")).toHaveCount(0);
    await hint.click();
    await expect(second).toContainText(target.reading.display);
    await expect(hint).toContainText("3/3");
    await page.locator(".card-shell").nth(slot).getByRole("button").click();
    await expect(page.locator(".hint-target")).toHaveCount(0);
    await expect(page.locator(".hint-message")).toHaveCount(0);
  });
}
