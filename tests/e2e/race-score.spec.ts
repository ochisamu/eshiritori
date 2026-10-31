import { test, expect, completeRound, type Page } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState } from "../../src/game/state";
import { cpuThinkDuration } from "../../src/game/cpuPresentation";
import { totalScore, emptyScore } from "../../src/game/scoring";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
const score = (n: number) => ({
  ...emptyScore(),
  points: n,
  panels: n ? 1 : 0,
});
function fixture(): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head: "ゔ",
    settings: {
      ...s.settings,
      opponent: "race",
      mode: "standard",
      muted: true,
      tutorialSeen: true,
    },
    score: score(200),
    cpuScore: score(300),
    carriedScore: score(10000),
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "ゔ",
      seed: "race-ui",
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
  for (const outcome of ["win", "lose", "tie"] as const)
    test(`race ${outcome} compares board scores and fits ${viewport.width}x${viewport.height}`, async ({
      page,
    }, info) => {
      await page.clock.install();
      await page.setViewportSize(viewport);
      const s = fixture();
      s.score = score(outcome === "win" ? 400 : outcome === "tie" ? 300 : 200);
      await open(page, s);
      await page.clock.runFor(200);
      const expected =
        outcome === "win" ? "player" : outcome === "lose" ? "cpu" : null;
      await expect(page.locator(".result-overlay h2")).toHaveText(
        outcome === "win"
          ? "あなたの勝ち！"
          : outcome === "lose"
            ? "CPUの勝ち"
            : "ひきわけ！",
      );
      expect((await saved(page)).winner).toBe(expected);
      await expect(page.locator(".race-result")).toContainText(
        String(s.score.points),
      );
      await expect(page.locator(".race-result")).toContainText("300");
      await expect(page.locator(".result-stats")).toContainText(
        String(10000 + s.score.points),
      );
      for (const locator of [
        page.locator(".result-overlay h2"),
        page.locator(".race-result"),
        page.getByRole("button", { name: "つぎの対戦へ", exact: true }),
        page.getByRole("button", { name: "終了", exact: true }),
      ]) {
        const r = await locator.boundingBox();
        expect(r!.y).toBeGreaterThanOrEqual(0);
        expect(r!.y + r!.height).toBeLessThanOrEqual(viewport.height);
      }
      expect(await page.evaluate(() => scrollY)).toBe(0);
      if (outcome === "win")
        await page.screenshot({
          path: `reports/race-score/result-${viewport.width}-${info.project.name}.png`,
        });
      await page
        .getByRole("button", { name: "つぎの対戦へ", exact: true })
        .click();
      await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
        timeout: 15000,
      });
      const next = await saved(page);
      expect(next.score?.points).toBe(0);
      expect(next.cpuScore?.points).toBe(0);
      expect(totalScore(next).points).toBe(
        outcome === "lose" ? 0 : 10000 + s.score.points,
      );
    });
for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
])
  test(`race cursor approaches only its answer and human can beat it at ${viewport.width}`, async ({
    page,
  }, info) => {
    // Keep screenshots and locator polling from spending the final 650ms window.
    await page.clock.install({ time: new Date("2026-10-31T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-31T00:00:01Z"));
    await page.setViewportSize(viewport);
    const s = fixture();
    s.head = "か";
    s.board!.head = "か";
    s.score = score(0);
    s.cpuScore = score(0);
    s.cpuRemaining = cpuThinkDuration(s);
    await open(page, s);
    await expect(page.locator(".board-overlay")).toHaveCount(0);
    await page.clock.runFor(s.cpuRemaining - 900);
    await expect(page.locator(".race-cursor")).toHaveCount(0);
    await expect(page.locator(".cpu-searching")).toHaveCount(0);
    await page.clock.runFor(450);
    await expect(page.locator(".race-cursor")).toBeVisible();
    const cursor = page.locator(".race-cursor"),
      target = await cursor.getAttribute("data-target");
    const card = page.locator(`[data-asset-id="${target}"]`),
      r = await card.boundingBox();
    const distance = async () => {
      const c = await cursor.boundingBox();
      return Math.hypot(
        c!.x - (r!.x + r!.width / 2),
        c!.y - (r!.y + r!.height / 2),
      );
    };
    const before = await distance();
    await page.clock.runFor(200);
    expect(await distance()).toBeLessThan(before);
    await page.screenshot({
      path: `reports/race-score/approach-${viewport.width}-${info.project.name}.png`,
    });
    await card.locator("button").click();
    await expect.poll(async () => (await saved(page)).moves.length).toBe(1);
    const n = await saved(page);
    expect(n.moves[0].actor).toBe("player");
    expect(n.cpuScore?.points).toBe(0);
    await expect(page.locator(".race-cursor")).toHaveCount(0);
  });
for (const mode of ["practice", "refillPractice", "accessible"] as const)
  test(`${mode} finishes without a ranking and ranking browsing only offers timed modes`, async ({
    page,
  }) => {
    const s = fixture();
    s.settings.opponent = "solo";
    s.settings.mode = mode;
    if (mode === "refillPractice")
      s.board!.reserve = assets.slice(24, 48).map((a) => a.id);
    await open(page, s);
    await expect(page.locator(".result-overlay")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ランキングを見る", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".record-category")).toContainText(
      "ランキング対象外",
    );
    expect((await saved(page)).stats.rankings).toEqual([]);
    await page.getByRole("button", { name: "終了", exact: true }).click();
    // Finished session has the title navigation; the title ranking uses timed filters.
    await page.getByRole("button", { name: "ランキング", exact: true }).click();
    await expect(page.locator(".ranking-note").first()).toContainText(
      "時間あり",
    );
    await expect(
      page.getByRole("button", { name: "時間 なし", exact: true }),
    ).toHaveCount(0);
  });
test("consecutive real boards count wins even after hints and reload", async ({
  page,
}) => {
  await page.clock.install();
  const s = fixture();
  s.settings.opponent = "solo";
  s.settings.mode = "practice";
  await open(page, s);
  await expect(page.locator(".result-overlay")).toBeVisible();
  expect((await saved(page)).stats.streak).toBe(1);
  await page.getByRole("button", { name: "つぎの対戦へ", exact: true }).click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 15000,
  });
  await page.locator(".hint-button").click();
  await page.keyboard.press("Escape");
  // Flush the throttled save before the helper reads the persisted phase.
  await page.clock.runFor(350);
  await expect.poll(async () => (await saved(page)).phase).toBe("playerTurn");
  await completeRound(page, false);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await expect.poll(async () => (await saved(page)).stats.streak).toBe(2);
  await expect(page.locator(".result-stats > span").last()).toContainText("2");
  await page.reload();
  await expect(page.locator(".result-overlay")).toBeVisible();
  await expect.poll(async () => (await saved(page)).stats.streak).toBe(2);
});
