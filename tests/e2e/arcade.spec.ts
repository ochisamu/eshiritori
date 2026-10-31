import { test, expect, type Page } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { generateBoard } from "../../src/game/boardGenerator";
import { advance, type Position, legalMoves } from "../../src/game/rules";
import { headKana, tailKana } from "../../src/game/normalization";
import { CPU_VERSION } from "../../src/game/cpu";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
function fixture(opponent: "turns" | "solo" | "race" = "solo"): GameState {
  const s = initialState();
  s.settings = {
    ...s.settings,
    opponent,
    mode: "practice",
    muted: true,
    tutorialSeen: true,
  };
  s.phase = "playerTurn";
  s.head = "か";
  s.cpuRemaining = opponent === "race" ? 6500 : 2800;
  s.board = {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: s.head,
    seed: "arcade-ui",
    version: "test",
    cpuVersion: CPU_VERSION,
    fallback: false,
    initialDiscovered: [],
  };
  return s;
}
async function restore(page: Page, s: GameState) {
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
  await expect(page.locator(".board-grid")).toBeVisible();
}
for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 640, height: 360 },
  { width: 1440, height: 900 },
])
  test(`arcade title fits ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /絵をみて/ })).toBeVisible();
    expect(
      await page.locator(".arcade-title button").evaluateAll((buttons) =>
        buttons
          .map((b) => {
            const r = b.getBoundingClientRect();
            return {
              name: b.textContent,
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
            };
          })
          .filter(
            (r) =>
              r.x < 0 ||
              r.y < 0 ||
              r.x + r.w > innerWidth ||
              r.y + r.h > innerHeight ||
              r.w < 44 ||
              r.h < 44,
          ),
      ),
    ).toEqual([]);
    expect(await page.locator(".arcade-title select").count()).toBe(0);
    await page.mouse.wheel(0, 600);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    if (viewport.width === 390 || viewport.width === 1440)
      await page.screenshot({
        path: `reports/race-score/title-${viewport.width}-${info.project.name}.png`,
      });
    await page.getByRole("button", { name: /ひとりで挑戦/ }).click();
    await expect(
      page.getByRole("button", { name: /ひとりで挑戦/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "ランキング", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "ランキング", exact: true }),
    ).toBeVisible();
  });
test("solo accepts consecutive human panels and preserves score after pause/reload", async ({
  page,
}) => {
  let s = fixture();
  s.seed = "solo-three-moves";
  s.board = generateBoard(assets, {
    seed: s.seed,
    round: 0,
    difficulty: s.settings.difficulty,
    discovered: [],
  });
  s.head = s.board.head;
  // Follow a real four-step route so the third answer leaves this test in play.
  function path(
    p: Position,
    depth: number,
  ): ReturnType<typeof legalMoves> | null {
    if (!depth) return [];
    for (const move of legalMoves(assets, p).filter((m) => !m.explicit)) {
      const rest = path(advance(p, move), depth - 1);
      if (rest) return [move, ...rest];
    }
    return null;
  }
  const route = path(position(s), 4);
  expect(route).toBeTruthy();
  let total = 0;
  await restore(page, s);
  await expect(page.locator(".cpu-companion")).toHaveCount(0);
  for (let i = 0; i < 3; i++) {
    const m = route![i];
    expect(m).toBeTruthy();
    const index = s.board!.ids.indexOf(m.assetId);
    await page.locator(".picture-card").nth(index).click();
    await expect(page.locator(".answer-points")).toContainText(
      m.reading.kind === "basic" ? "+100" : "+250",
    );
    total += m.reading.kind === "basic" ? 100 : 250;
    await page.getByRole("button", { name: "正解演出を短縮" }).click();
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    );
    s = saved;
    expect(s.moves.every((m) => m.actor === "player")).toBe(true);
    expect(s.score?.panels).toBe(i + 1);
  }
  await expect(page.locator(".match-score")).toContainText(String(total));
  await page.reload();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".match-score")).toContainText(String(total));
});
test("race CPU waits quietly while panels stay playable, then claims and scores separately", async ({
  page,
}) => {
  const s = fixture("race");
  await restore(page, s);
  await expect(page.locator(".board-panel")).toHaveAttribute(
    "data-cpu-selection",
    "waiting",
  );
  await expect(page.locator(".picture-card").first()).toBeEnabled();
  await expect(page.locator(".success-pop")).toBeVisible({ timeout: 10000 });
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.moves).toHaveLength(1);
  expect(saved.moves[0].actor).toBe("cpu");
  expect(saved.score.points).toBe(0);
  expect(saved.cpuScore.points).toBeGreaterThan(0);
  await page.getByRole("button", { name: "正解演出を短縮" }).click();
  await expect(
    page.locator(".picture-card").filter({ hasText: "___" }),
  ).toHaveCount(0);
  await expect(page.locator(".turn-indicator")).toContainText("CPUより先に");
});
test("race lets the human claim before CPU and freezes both clocks during answer/pause", async ({
  page,
}) => {
  const s = fixture("race"),
    m = legalMoves(assets, position(s))[0];
  await restore(page, s);
  await page
    .locator(".picture-card")
    .nth(s.board!.ids.indexOf(m.assetId))
    .click();
  await expect(page.locator(".score-float")).toContainText("+100");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.moves).toHaveLength(1);
  expect(saved.moves[0].actor).toBe("player");
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  const paused = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  await page.waitForTimeout(1000);
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(after.cpuRemaining).toBe(paused.cpuRemaining);
  expect(after.score).toEqual(paused.score);
});
for (const actor of ["player", "cpu"] as const)
  test(`no-move ${actor} ends the round without losing or changing the letter`, async ({
    page,
  }) => {
    const s = fixture("turns");
    s.actor = actor;
    s.phase = actor === "cpu" ? "cpuThinking" : "playerTurn";
    s.head = "ゔ";
    s.cpuRemaining = 1800;
    await restore(page, s);
    await expect(page.locator(".result-overlay")).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator(".rescue-overlay")).toHaveCount(0);
    await expect(page.locator(".result-overlay h2")).toHaveText(
      "ひらめき、つながった！",
    );
    await expect
      .poll(async () => {
        const n = await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!),
          SAVE_KEY,
        );
        return { played: n.stats.played, head: n.head, winner: n.winner };
      })
      .toEqual({ played: 1, head: "ゔ", winner: "player" });
  });

test("earned score ranks after terminal loss and survives reload; terminal card earns zero", async ({
  page,
}, info) => {
  const s = fixture(),
    umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
  const terminal = assets.find((a) =>
    a.readings.some(
      (r) =>
        r.kind === "basic" &&
        headKana(r.kana) === "さ" &&
        tailKana(r.kana) === "ん",
    ),
  )!;
  s.board!.ids = [
    umbrella.id,
    terminal.id,
    ...assets
      .filter((a) => ![umbrella.id, terminal.id].includes(a.id))
      .slice(0, 22)
      .map((a) => a.id),
  ];
  s.settings.mode = "standard";
  await restore(page, s);
  await page.locator(".picture-card").nth(0).click();
  await expect(page.locator(".answer-points")).toBeVisible();
  const earned = (
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    )
  ).score.points;
  expect(earned).toBeGreaterThanOrEqual(100);
  expect(earned).toBeLessThanOrEqual(200);
  await page.getByRole("button", { name: "正解演出を短縮" }).click();
  await page.locator(".picture-card").nth(1).click();
  await expect(page.locator(".result-overlay")).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText(String(earned));
  await page
    .getByRole("button", { name: "ランキングを見る", exact: true })
    .click();
  await expect(page.locator(".ranking-list")).toContainText(String(earned));
  await expect(page.locator(".ranking-list")).toContainText("1枚");
  await page.screenshot({
    path: `reports/race-score/ranking-${info.project.name}.png`,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "ランキングを見る", exact: true })
    .click();
  await expect(page.locator(".ranking-list")).toContainText(String(earned));
});
test("alternative input earns bonus with distinct score effect", async ({
  page,
}, info) => {
  const a = assets
    .slice(0, 24)
    .find((a) =>
      a.readings.some((r) => r.kind !== "basic" && tailKana(r.kana) !== "ん"),
    )!;
  const r = a.readings.find(
    (r) => r.kind !== "basic" && tailKana(r.kana) !== "ん",
  )!;
  const s = fixture();
  s.head = headKana(r.kana);
  await restore(page, s);
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: `札${s.board!.ids.indexOf(a.id) + 1}を拡大・読みを入力`,
      exact: true,
    })
    .click();
  await page.getByRole("textbox", { name: "かなで回答" }).fill(r.kana);
  await page.getByRole("textbox", { name: "かなで回答" }).press("Enter");
  await expect(page.locator(".answer-points")).toContainText("+250");
  await expect(page.locator(".answer-points")).toContainText("裏読み 150");
  await page.screenshot({
    path: `reports/race-score/bonus-${info.project.name}.png`,
  });
});
