import { test, expect, type Page } from "./_test";
import { initialState } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { totalScore } from "../../src/game/scoring";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
function fixture(): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head: "ゔ",
    seed: "chain-recovery",
    settings: {
      ...s.settings,
      opponent: "solo",
      mode: "practice",
      muted: true,
      tutorialSeen: true,
    },
    score: { points: 200, panels: 2, alternatives: 0, elapsedMs: 500 },
    carriedScore: { points: 1000, panels: 8, alternatives: 2, elapsedMs: 5000 },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "ゔ",
      seed: "chain-recovery:round:0",
      version: "test",
      fallback: false,
    },
  };
}
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}
async function open(page: Page, s: GameState) {
  await page.addInitScript(
    ({ s, key }) => localStorage.setItem(key, JSON.stringify(s)),
    { s, key: SAVE_KEY },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
}
test("failed next-board images can be replaced without losing accumulated points", async ({
  page,
}) => {
  test.info().annotations.push({
    type: "intentional-fault",
    description:
      "Abort next-board images, then remove fault and retry with preserved score.",
  });
  // Register before navigation: the game preloads the next board during play.
  // Permit the saved board while failing every new image, including prefetches.
  const s = fixture();
  const initialIds = new Set(s.board!.ids);
  await page.route("**/assets/card-*.webp*", (route) => {
    const id = route
      .request()
      .url()
      .match(/card-\d{4}/)?.[0];
    return id && initialIds.has(id) ? route.continue() : route.abort();
  });
  await open(page, s);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await page.getByRole("button", { name: "つぎの対戦へ", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "盤面を準備できませんでした",
      exact: true,
    }),
  ).toBeVisible();
  const failed = await saved(page);
  expect(totalScore(failed).points).toBe(1200);
  await page.unroute("**/assets/card-*.webp*");
  await page
    .getByRole("button", { name: "別の盤面で再試行", exact: true })
    .click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator(".match-score")).toContainText("1,200");
  const recovered = await saved(page);
  expect(recovered.stats).toEqual(failed.stats);
  expect(recovered.seed).toBe(failed.seed);
  expect(recovered.round).toBe(failed.round + 1);
  expect(totalScore(recovered)).toEqual(totalScore(failed));
});
test("result labels retain a previous board's hint category", async ({
  page,
}) => {
  const s = fixture();
  s.scoreHelp = "hint";
  await open(page, s);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await expect(page.locator(".record-category")).toContainText("ヒントあり");
  await expect(page.locator(".record-category")).not.toContainText(
    "ヒントなし",
  );
});
