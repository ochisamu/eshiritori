import { test, expect, type Page } from "./_test";
import { initialState, position } from "../../src/game/state";
import { activeAssets as assets } from "../../src/game/content";
import { legalMoves } from "../../src/game/rules";
import { totalScore, scoreKey, emptyScore } from "../../src/game/scoring";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
function fixture(head = "ゔ"): GameState {
  const s = initialState();
  s.phase = "playerTurn";
  s.head = head;
  s.seed = "chain-ui";
  s.settings = {
    ...s.settings,
    opponent: "solo",
    mode: "practice",
    muted: true,
    tutorialSeen: true,
  };
  s.score = { points: 200, panels: 2, alternatives: 0, elapsedMs: 500 };
  s.carriedScore = {
    points: 1000,
    panels: 8,
    alternatives: 2,
    elapsedMs: 5000,
  };
  s.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head,
    seed: "chain-ui:round:0",
    version: "test",
    fallback: false,
  };
  return s;
}
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}
async function open(page: Page, s = fixture()) {
  await page.addInitScript(
    ({ s, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { s, key: SAVE_KEY },
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
}
for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
])
  test(`no-move result and next button fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await open(page);
    await expect(page.locator(".result-overlay")).toBeVisible();
    await expect(page.locator(".result-overlay h2")).toHaveText(
      "ひらめき、つながった！",
    );
    await expect(page.locator(".result-stats")).toContainText("1200");
    const button = page.getByRole("button", {
      name: "つぎの対戦へ",
      exact: true,
    });
    await expect(button).toBeVisible();
    const title = await page.locator(".result-overlay h2").boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(0);
    expect(title!.y + title!.height).toBeLessThanOrEqual(viewport.height);
    const rect = await button.boundingBox();
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
    const finish = await page
      .getByRole("button", { name: "終了", exact: true })
      .boundingBox();
    expect(finish!.y + finish!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(page.locator(".rescue-overlay")).toHaveCount(0);
    await page.screenshot({
      path: `reports/race-score/result-${viewport.width}-${info.project.name}.png`,
    });
  });
test("a new board and a reload retain the total, then a new answer increases it", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator(".result-overlay")).toBeVisible();
  const old = await saved(page);
  await page.getByRole("button", { name: "つぎの対戦へ", exact: true }).click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator(".match-score")).toContainText("1,200");
  await expect
    .poll(async () => totalScore(await saved(page)).points)
    .toBe(1200);
  let s = await saved(page);
  expect(s.round).toBe(1);
  expect(s.moves).toHaveLength(0);
  expect(s.board!.ids).not.toEqual(old.board!.ids);
  const m = legalMoves(assets, position(s)).find(
    (m) => m.reading.kind === "basic",
  )!;
  await page
    .locator(".picture-card")
    .nth(s.board!.ids.indexOf(m.assetId))
    .click();
  await expect(page.locator(".match-score")).toContainText("1,300");
  await expect
    .poll(async () => totalScore(await saved(page)).points)
    .toBe(1300);
  await page.reload();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".match-score")).toContainText("1,300");
  s = await saved(page);
  expect(totalScore(s).panels).toBe(11);
  expect(s.moves).toHaveLength(1);
  await page.screenshot({
    path: `reports/race-score/carried-${info.project.name}.png`,
  });
});
test("losing finalizes the total and the next board starts at zero", async ({
  page,
}) => {
  const s = fixture("か");
  s.settings.mode = "standard";
  s.remaining = 1000;
  await page.clock.install();
  await open(page, s);
  await page.clock.runFor(1500);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await expect.poll(async () => (await saved(page)).winner).toBe("cpu");
  await expect(page.locator(".result-stats")).toContainText("1200");
  await page.getByRole("button", { name: "つぎの対戦へ", exact: true }).click();
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await page.clock.runFor(1000);
  await expect.poll(async () => totalScore(await saved(page)).points).toBe(0);
});
test("replaying a board starts a separate zero-score challenge", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".result-overlay")).toBeVisible();
  const old = await saved(page);
  await page
    .getByRole("button", { name: "同じseedで再挑戦", exact: true })
    .click();
  await expect
    .poll(async () => {
      const s = await saved(page);
      return { points: totalScore(s).points, replay: s.replay };
    })
    .toEqual({ points: 0, replay: true });
  expect((await saved(page)).board!.ids).toEqual(old.board!.ids);
});
test("rankings update the continuous attempt and keep legacy scores accessible separately", async ({
  page,
}) => {
  const s = fixture();
  s.settings.mode = "standard";
  s.stats.rankings = [
    {
      ...emptyScore(),
      points: 999,
      panels: 3,
      id: "old",
      key: scoreKey(s).replace(/^chain-v1:/, ""),
      round: 0,
      seed: "old",
    },
  ];
  await open(page, s);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await page
    .getByRole("button", { name: "ランキングを見る", exact: true })
    .click();
  await expect(page.locator(".ranking-list li")).toHaveCount(1);
  await expect(page.locator(".ranking-list")).toContainText("1,200");
  await page.getByRole("button", { name: "以前の記録", exact: true }).click();
  await expect(page.locator(".ranking-list")).toContainText("999");
  await page.getByRole("button", { name: "連続スコア", exact: true }).click();
  await expect(page.locator(".ranking-list")).toContainText("1,200");
});
