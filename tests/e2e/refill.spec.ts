import { selectGameMode } from "./_test";
import { openGameControl, test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position, reducer } from "../../src/game/state";
import { withReserve, boardSlots } from "../../src/game/refill";
import { legalMoves } from "../../src/game/rules";
import { SAVE_KEY } from "../../src/storage/save";
import { cpuThinkDuration } from "../../src/game/cpuPresentation";
import { CPU_VERSION } from "../../src/game/cpu";
import type { GameState } from "../../src/game/types";
const fixture = (): GameState => {
  const s = initialState();
  s.settings = {
    ...s.settings,
    mode: "refill",
    tutorialSeen: true,
    muted: true,
  };
  s.phase = "playerTurn";
  s.head = "か";
  s.board = withReserve(
    {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "か",
      seed: "refill-browser",
      version: "fixture",
      fallback: false,
      cpuVersion: CPU_VERSION,
      initialDiscovered: [],
    },
    "normal",
    assets,
  );
  return s;
};
test("replacement mode deals by difficulty and replaces in the same slot across save/reload", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto("/");
  await selectGameMode(page, "refill");
  await page.getByRole("button", { name: "むずかしい", exact: true }).click();
  // Opening preferences must preserve the mode/difficulty still pending on title.
  await openGameControl(page, "設定");
  await page
    .getByRole("combobox", { name: "次の連戦の制限時間", exact: true })
    .selectOption("90");
  await page
    .getByRole("checkbox", { name: "音を鳴らす", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "とじる", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "補充あり", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "むずかしい", exact: true }),
  ).toHaveClass(/selected/);
  await openGameControl(page, "設定");
  await expect(
    page.getByRole("combobox", { name: "次の連戦の制限時間", exact: true }),
  ).toHaveValue("90");
  await expect(
    page.getByRole("checkbox", { name: "音を鳴らす", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "とじる", exact: true }).click();
  await page
    .getByRole("button", { name: "さっそく、あそぶ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "さあ、はじめよう", exact: true })
    .click();
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
  await page.clock.runFor(6500);
  await expect(page.locator(".picture-card").first()).toBeEnabled();
  const s = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  )) as GameState;
  expect(s.board?.reserve).toHaveLength(48);
  expect(s.settings).toMatchObject({
    mode: "refill",
    difficulty: "hard",
    seconds: 90,
    muted: true,
  });
  const m = legalMoves(assets, position(s)).find((move) => {
    const committed = reducer(
      // The immediately saved loading snapshot can precede the live READY phase.
      // Probe the currently visible player turn, without changing the browser state.
      { ...s, phase: "playerTurn", actor: "player" },
      {
        type: "SUBMIT",
        actor: "player",
        assetId: move.assetId,
        readingId: move.reading.id,
        moveId: "fixture-probe",
      },
      assets,
    );
    return legalMoves(assets, position(committed)).length > 0;
  })!;
  expect(
    m,
    "Choose a continuing first move: a legal immediate win cannot exercise mid-turn restoration.",
  ).toBeDefined();
  const slot = boardSlots(s.board, s.moves).indexOf(m.assetId),
    replacement = s.board!.reserve![s.moves.length];
  await page.locator(".picture-card").nth(slot).click();
  await expect(page.locator(".used-word")).toHaveCount(1);
  await page.clock.fastForward(2600);
  await expect(page.locator(".picture-card").nth(slot)).toHaveAttribute(
    "aria-label",
    `札${slot + 1}。${assets.find((a) => a.id === replacement)!.description}`,
  );
  await expect(page.locator(".picture-card")).toHaveCount(24);
  await expect(page.locator(".remaining-badge b")).toHaveText(
    String(48 - s.moves.length - 1),
  );
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "つづきから遊ぶ" }),
  ).toBeVisible();
  const restored = (await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  )) as GameState;
  expect(boardSlots(restored.board, restored.moves)[slot]).toBe(replacement);
  expect(restored.board?.reserve).toEqual(s.board?.reserve);
  await page.screenshot({
    path: `reports/refill-restore-${info.project.name}.png`,
    fullPage: true,
  });
});
test("CPU searches several pictures before selecting and freezes on pause", async ({
  page,
}, info) => {
  const s = fixture();
  s.actor = "cpu";
  s.phase = "cpuThinking";
  s.cpuRemaining = cpuThinkDuration(s);
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
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
  const first = await page
    .locator(".cpu-searching .picture-card")
    .getAttribute("aria-label");
  await page.clock.runFor(600);
  const second = await page
    .locator(".cpu-searching .picture-card")
    .getAttribute("aria-label");
  expect(second).not.toBe(first);
  const saved = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    ) as Promise<GameState>;
  expect((await saved()).moves).toHaveLength(0);
  await page.screenshot({
    path: `reports/cpu-search-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  const frozen = (await saved()).cpuRemaining;
  await page.clock.runFor(2000);
  expect((await saved()).cpuRemaining).toBe(frozen);
  await openGameControl(page, "設定");
  await page.getByRole("checkbox", { name: "動きを減らす" }).check();
  await page.getByRole("button", { name: "とじる", exact: true }).click();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".cpu-searching")).toHaveCount(0);
  expect((await saved()).cpuRemaining).toBe(frozen);
  await page.clock.runFor(4000);
  await expect.poll(async () => (await saved()).moves.length).toBe(1);
  expect((await saved()).moves[0].actor).toBe("cpu");
});
test("catalog masks each unknown reading by its kana length and reveals only by explicit choice", async ({
  page,
}) => {
  await page.goto("/");
  await openGameControl(page, "発見ずかん");
  const a = assets.find((a) =>
    a.readings.some((r) => r.display === "あるくおうち"),
  )!;
  await page
    .getByRole("textbox", { name: "図鑑を検索" })
    .fill(String(assets.indexOf(a) + 1));
  await page.locator(".collection-tile").click();
  const values = await page.locator(".undiscovered").allTextContents();
  expect(values).toEqual(
    a.readings.map((r) => "？".repeat([...r.kana].length)),
  );
  await expect(page.getByText("あるくおうち", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: /答えも表示/ }).check();
  await expect(page.getByText("あるくおうち", { exact: true })).toBeVisible();
  const s = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(s.answerReferenced).toBe(true);
  expect(s.discovered).toEqual([]);
});
test("choosing a terminal word immediately loses and survives reload without double-counting", async ({
  page,
}, info) => {
  const s = fixture();
  s.settings.mode = "standard";
  s.board = { ...s.board!, reserve: undefined, head: "れ" };
  s.head = "れ";
  const lettuce = assets.find((a) =>
    a.readings.some((r) => r.kana === "れたす"),
  )!;
  s.board.ids[23] = lettuce.id;
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
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await page.locator(".picture-card").nth(8).click();
  await expect(
    page.getByRole("heading", {
      name: "つぎは、きっと見つかる。",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".result-overlay")).toContainText(
    "「れもん」は「ん」で終わる",
  );
  await expect(page.locator(".last-picked.terminal-picked")).toHaveCount(1);
  const saved = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    ) as Promise<GameState>;
  const end = await saved();
  expect(end.winner).toBe("cpu");
  expect(end.moves[0].word).toBe("れもん");
  expect(end.moves).toHaveLength(1);
  expect(end.stats.played).toBe(1);
  await page.screenshot({
    path: `reports/terminal-loss-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  expect((await saved()).stats.played).toBe(1);
  expect((await saved()).moves).toHaveLength(1);
});
test("alternative readings have their own effect and the most recent panel remains emphasized through CPU search", async ({
  page,
}, info) => {
  const s = fixture();
  s.settings.mode = "practice";
  s.head = "あ";
  s.board = {
    ...s.board!,
    reserve: undefined,
    head: "あ",
    ids: [
      ...s.board!.ids.slice(0, 23),
      assets.find((a) => a.conceptKey === "sleeping-cat")!.id,
    ],
  };
  await page.addInitScript(
    ({ key, s }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(s));
    },
    { key: SAVE_KEY, s },
  );
  // Freeze the test clock so screenshot/IPC time cannot consume the short CPU
  // search interval on slower engines. Only runFor below advances this fixture.
  await page.clock.install({ time: new Date("2026-10-23T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-23T12:00:01Z"));
  await page.goto("/");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".board-overlay")).toHaveCount(0);
  await page.locator(".picture-card").nth(14).click();
  await expect(page.locator(".alternative-success")).toBeVisible();
  await expect(page.locator(".success-pop .discovery-stamp")).toContainText(
    "NEW!",
  );
  await expect(page.locator(".alternative-particles i")).toHaveCount(24);
  await expect(page.locator(".last-picked .used-word")).toHaveText(
    "あめのやね",
  );
  await page.screenshot({
    path: `reports/alternative-effect-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "正解演出を短縮", exact: true })
    .click();
  await page.clock.runFor(400);
  await expect(page.locator(".last-picked")).toHaveCount(1);
  await expect(page.locator(".last-picked .used-word")).toHaveText(
    "あめのやね",
  );
  await expect(page.locator(".word-relay.has-last img")).toHaveCount(1);
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
});
