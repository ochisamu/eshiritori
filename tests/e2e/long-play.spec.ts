import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { chooseCpu, CPU_VERSION } from "../../src/game/cpu";
import { cpuThinkDuration } from "../../src/game/cpuPresentation";
import { legalMoves, advance } from "../../src/game/rules";
import { headKana } from "../../src/game/normalization";
import { SAVE_KEY } from "../../src/storage/save";
import type { GameState } from "../../src/game/types";
test("CPU visibly continues the exchange when it could end the game immediately", async ({
  page,
}, info) => {
  const s: GameState = {
    ...initialState(),
    phase: "cpuThinking",
    actor: "cpu",
    settings: {
      ...initialState().settings,
      mode: "practice",
      muted: true,
      tutorialSeen: true,
    },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "か",
      seed: "long-play-ui",
      version: "test",
      cpuVersion: CPU_VERSION,
      initialDiscovered: [],
      fallback: false,
    },
  };
  const heads = [
    ...new Set(
      assets
        .slice(0, 24)
        .flatMap((a) => a.readings.map((r) => headKana(r.kana))),
    ),
  ];
  const head = heads.find((head) => {
    const p = { ...position(s), head },
      moves = legalMoves(assets, p);
    return (
      moves.some(
        (m) =>
          m.reading.kind === "basic" &&
          !legalMoves(assets, advance(p, m)).length,
      ) &&
      moves.some(
        (m) =>
          m.reading.kind === "basic" &&
          legalMoves(assets, advance(p, m)).length,
      )
    );
  });
  expect(head).toBeDefined();
  s.head = head!;
  s.board!.head = head!;
  s.cpuRemaining = cpuThinkDuration(s);
  const p = position(s),
    expected = chooseCpu(
      assets,
      p,
      s.settings.difficulty,
      `${s.board!.seed}:cpu:0`,
    ).move!;
  expect(legalMoves(assets, advance(p, expected)).length).toBeGreaterThan(0);
  await page.addInitScript(
    ({ key, s }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { key: SAVE_KEY, s },
  );
  await page.clock.install();
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
  await page.clock.runFor(6500);
  await expect(page.locator(".turn-indicator")).toContainText("あなたの番");
  const actual = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  )) as GameState;
  expect(actual.moves).toHaveLength(1);
  expect(actual.moves[0].assetId).toBe(expected.assetId);
  expect(actual.moves[0].readingId).toBe(expected.reading.id);
  expect(actual.phase).toBe("playerTurn");
  await page.screenshot({
    path: `reports/continuation/long-play-${info.project.name}.png`,
    fullPage: true,
  });
});
