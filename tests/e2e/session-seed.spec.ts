import { selectGameMode } from "./_test";
import { test, expect, type Page } from "./_test";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";

const saved = (page: Page): Promise<GameState> =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
async function start(page: Page) {
  await page
    .getByRole("button", { name: /さっそく、あそぶ|新しい連戦をはじめる/ })
    .click();
  const tutorial = page.getByRole("button", {
    name: "さあ、はじめよう",
    exact: true,
  });
  if (await tutorial.isVisible()) await tutorial.click();
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.locator(".board-overlay")).toHaveCount(0, {
    timeout: 20000,
  });
  // CPU search (up to 3.4s), answer display (1.6s+) and throttled save can exceed 5s.
  await expect.poll(async () => (await saved(page)).phase, {timeout:15000}).toBe("playerTurn");
  return saved(page);
}
async function finish(page: Page) {
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page
    .getByRole("button", { name: "連戦を終了する", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
}
async function seedOverride(page: Page, value: string) {
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const field = page.getByRole("textbox", { name: "連戦seed", exact: true });
  await field.fill(value);
  await page.getByRole("button", { name: "とじる", exact: true }).click();
}

test("new sessions randomize, reload preserves play, and only an explicit seed repeats the board", async ({
  page,
}, info) => {
  await page.goto("/");
  await selectGameMode(page,"practice");
  const first = await start(page);
  await finish(page);
  const second = await start(page);
  expect(second.seed).not.toBe(first.seed);
  expect(second.board!.ids).not.toEqual(first.board!.ids);

  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "つづきから遊ぶ", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).seed).toBe(second.seed);
  expect((await saved(page)).board!.ids).toEqual(second.board!.ids);
  await page
    .getByRole("button", { name: "連戦を終了する", exact: true })
    .click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "連戦seed", exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "とじる", exact: true }).click();

  await seedOverride(page, "garden-01");
  const fixed = await start(page);
  expect(fixed.seed).toBe("garden-01");
  await finish(page);
  const repeated = await start(page);
  expect(repeated.seed).toBe(fixed.seed);
  expect(repeated.board!.ids).toEqual(fixed.board!.ids);
  expect(repeated.board!.head).toBe(fixed.board!.head);
  await finish(page);
  await seedOverride(page, "  ");
  const automatic = await start(page);
  expect(automatic.seed).not.toBe(fixed.seed);
  expect(automatic.board!.ids).not.toEqual(fixed.board!.ids);
  await page.screenshot({
    path: `reports/random-session-${info.project.name}.png`,
    fullPage: true,
  });
});
