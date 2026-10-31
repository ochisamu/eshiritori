import { completeRound } from "./_test";
import { test, expect, type Page } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position, reducer } from "../../src/game/state";
import { generateBoard } from "../../src/game/boardGenerator";
import { legalMoves } from "../../src/game/rules";
import { chooseCpu, CPU_VERSION } from "../../src/game/cpu";
import { headKana, tailKana } from "../../src/game/normalization";
import { SAVE_KEY } from "../../src/storage/save";
import { exportReplay } from "../../src/game/replay";
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
      tutorialSeen: true,
      muted: true,
    },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head,
      seed: "ui-fixture",
      version: "test",
      cpuVersion: CPU_VERSION,
      initialDiscovered: [],
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
  await expect(
    page.getByRole("button", { name: "つづきから遊ぶ", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await expect(page.locator(".picture-card").first()).toBeEnabled();
}
async function saved(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  ) as Promise<GameState>;
}
test("a double tap commits once, then shows the complete round review", async ({
  page,
}) => {
  await restore(page, fixture());
  await page.locator(".picture-card").nth(14).click({ clickCount: 2 });
  await expect(page.locator(".used-word")).toHaveCount(1);
  await expect.poll(async () => (await saved(page)).moves.length).toBe(1);
  expect((await saved(page)).moves[0].word).toBe("かさ");
  await page.clock.runFor(6000);
  await completeRound(page);
  await expect(
    page.getByRole("button", { name: "読みを見返す", exact: true }),
  ).toBeVisible();
  const moves = (await saved(page)).moves;
  await page.getByRole("button", { name: "読みを見返す", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "この対戦のことば" }),
  ).toBeVisible();
  await expect(page.locator(".round-review li")).toHaveCount(moves.length);
  for (const move of moves)
    await expect(page.locator(".round-review")).toContainText(move.explanation);
});
test("hidden kana answer respects IME composition and discovers the approved reading", async ({
  page,
}) => {
  await restore(page, fixture("あ"));
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", { name: "札15を拡大・読みを入力", exact: true })
    .click();
  await expect(page.locator(".detail-head")).toContainText("あ");
  const field = page.getByRole("textbox", { name: "かなで回答" });
  await field.fill("あまがささ");
  await field.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".feedback-bar")).toContainText(
    "もう一度、絵を見てみよう",
  );
  await expect(page.locator(".feedback-bar")).not.toContainText("−5秒");
  await page.clock.runFor(250);
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", { name: "札15を拡大・読みを入力", exact: true })
    .click();
  await field.fill("アマガサ");
  await field.dispatchEvent("compositionstart");
  await field.press("Enter");
  expect((await saved(page)).moves.length).toBe(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await field.dispatchEvent("compositionend");
  await field.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect
    .poll(async () => (await saved(page)).moves[0]?.word)
    .toBe("あまがさ");
  expect((await saved(page)).discovered).toContain(
    assets[14].readings.find((r) => r.kana === "あまがさ")!.id,
  );
});
test("known alternative with another tail is selected explicitly", async ({
  page,
}) => {
  const a = assets.find((a) =>
    a.readings.some(
      (r, i) =>
        tailKana(r.kana) !== "ん" &&
        a.readings
          .slice(i + 1)
          .some(
            (q) =>
              headKana(q.kana) === headKana(r.kana) &&
              tailKana(q.kana) !== tailKana(r.kana) &&
              tailKana(q.kana) !== "ん",
          ),
    ),
  )!;
  const pair = a.readings
    .filter((r) => tailKana(r.kana) !== "ん")
    .find((r) =>
      a.readings.some(
        (q) =>
          q !== r &&
          headKana(q.kana) === headKana(r.kana) &&
          tailKana(q.kana) !== tailKana(r.kana) &&
          tailKana(q.kana) !== "ん",
      ),
    )!;
  const other = a.readings.find(
    (r) =>
      r !== pair &&
      headKana(r.kana) === headKana(pair.kana) &&
      tailKana(r.kana) !== tailKana(pair.kana) &&
      tailKana(r.kana) !== "ん",
  )!;
  const s = fixture(headKana(pair.kana));
  s.board!.ids = [
    a.id,
    ...assets
      .filter((q) => q.id !== a.id)
      .slice(0, 23)
      .map((a) => a.id),
  ];
  s.discovered = [pair.id, other.id];
  s.board!.initialDiscovered = [...s.discovered];
  const normal = legalMoves(assets, position(s)).find(
    (m) => m.assetId === a.id && !m.explicit,
  )!;
  const alternate = normal.reading.id === pair.id ? other : pair;
  await restore(page, s);
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", { name: "札1を拡大・読みを入力", exact: true })
    .click();
  await page
    .locator(".known-readings button")
    .filter({ hasText: alternate.display })
    .click();
  await expect
    .poll(async () => (await saved(page)).moves[0]?.readingId)
    .toBe(alternate.id);
  expect((await saved(page)).head).toBe(tailKana(alternate.kana));
});
test("the generated safe route is playable through the real UI and replay keeps the board", async ({
  page,
}) => {
  test.setTimeout(90000);
  const s = fixture();
  const board = generateBoard(assets, {
    seed: "ui-winning-path-1",
    round: 0,
    difficulty: "normal",
    discovered: [],
  });
  s.board = board;
  s.head = board.head;
  const path = board.proof!.playerWin;
  expect(path.length).toBeGreaterThan(0);
  let sim = { ...s };
  const playerMoves: { assetId: string; word: string }[] = [];
  for (const id of path) {
    const p = position(sim);
    const move =
      sim.actor === "player"
        ? legalMoves(assets, p).find((m) => m.assetId === id)!
        : chooseCpu(
            assets,
            p,
            "normal",
            `${board.seed}:cpu:${sim.moves.length}`,
          ).move!;
    expect(move.assetId).toBe(id);
    if (sim.actor === "player")
      playerMoves.push({ assetId: id, word: move.reading.kana });
    sim = reducer(
      sim,
      {
        type: "SUBMIT",
        actor: sim.actor,
        assetId: id,
        readingId: move.reading.id,
        moveId: `w-${sim.moves.length}`,
      },
      assets,
    );
    if (sim.phase === "resolvingMove")
      sim = reducer(sim, { type: "RESOLVED" }, assets);
  }
  if (sim.phase === "cpuThinking" && !legalMoves(assets, position(sim)).length)
    sim = reducer(sim, { type: "TICK", elapsed: sim.cpuRemaining }, assets);
  expect(sim.winner === null || sim.winner === "player").toBe(true);
  await restore(page, s);
  for (const move of playerMoves) {
    await expect(page.locator(".hint-button")).toBeEnabled();
    await page
      .locator(".picture-card")
      .nth(board.ids.indexOf(move.assetId))
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".history-strip")).toContainText(move.word);
    for (let i = 0; i < 5; i++) {
      await page.clock.fastForward(1500);
      if (
        (await page
          .getByRole("button", { name: "つぎの対戦へ", exact: true })
          .isVisible()) ||
        (await page.locator(".hint-button").isEnabled())
      )
        break;
    }
  }
  await completeRound(page, false);
  await expect(page.locator(".result-overlay h2")).toHaveText(
    sim.winner === "player" ? "ひらめき、つながった！" : "つぎの盤面へ！",
  );
  expect((await saved(page)).winner).toBe(sim.winner);
  await page
    .getByRole("button", { name: "同じseedで再挑戦", exact: true })
    .click();
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  expect((await saved(page)).board!.ids).toEqual(board.ids);
  expect((await saved(page)).head).toBe(board.head);
  expect((await saved(page)).moves).toHaveLength(0);
});
test("packaged game remains playable with every external request blocked", async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseURL!).origin) return route.continue();
    external.push(url.href);
    return route.abort();
  });
  await restore(page, fixture());
  await page.locator(".picture-card").nth(14).click();
  await expect(page.locator(".used-word")).toHaveCount(1);
  expect(external).toEqual([]);
});
test("an additional reading shows its actual visual evidence after a successful answer", async ({
  page,
}, info) => {
  await restore(page, fixture("ゆ"));
  await page
    .getByRole("button", { name: "拡大・かな入力", exact: true })
    .click();
  await page
    .getByRole("button", { name: "札13を拡大・読みを入力", exact: true })
    .click();
  await page.getByRole("textbox", { name: "かなで回答" }).fill("ゆげ");
  await page.getByRole("button", { name: "回答", exact: true }).click();
  await expect(page.locator(".success-pop .evidence-box")).toBeVisible();
  await expect(page.locator(".success-pop")).toContainText("ゆげ");
  await page.screenshot({
    path: `reports/evidence-steam-${info.project.name}.png`,
    fullPage: true,
  });
  const box = await page.locator(".success-pop .evidence-box").boundingBox();
  const art = await page.locator(".success-pop .evidence-art").boundingBox();
  expect(box!.x).toBeGreaterThan(art!.x);
  expect(box!.y).toBeGreaterThan(art!.y);
  expect(box!.x + box!.width).toBeLessThan(art!.x + art!.width);
  expect(box!.y + box!.height).toBeLessThan(art!.y + art!.height);
});
test("a portable code restores the exact round and keeps replay records separate", async ({
  page,
}) => {
  const s = fixture();
  s.seed = "portable-ui-704";
  s.round = 1;
  s.board = generateBoard(assets, {
    seed: s.seed,
    round: s.round,
    difficulty: s.settings.difficulty,
    discovered: [],
  });
  s.head = s.board.head;
  s.actor = "cpu";
  const code = exportReplay(s);
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page
    .getByRole("button", { name: "再挑戦コードを開く", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "再挑戦コード", exact: true })
    .fill("ESR1-broken");
  await page
    .getByRole("button", { name: "このコードで再挑戦", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("読み込めません");
  await page
    .getByRole("textbox", { name: "再挑戦コード", exact: true })
    .fill(code);
  await page
    .getByRole("button", { name: "このコードで再挑戦", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await expect.poll(async () => (await saved(page))?.replay).toBe(true);
  const actual = await saved(page);
  expect(actual.board!.ids).toEqual(s.board.ids);
  expect(actual.board!.head).toBe(s.board.head);
  expect(actual.round).toBe(1);
  expect(actual.actor).toBe("cpu");
  expect(actual.replayDiscovery).toEqual([]);
  expect(actual.stats.played).toBe(0);
});
