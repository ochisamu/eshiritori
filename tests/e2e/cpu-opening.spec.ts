import { selectGameMode } from "./_test";
import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position, reducer } from "../../src/game/state";
import { legalMoves } from "../../src/game/rules";
import { boardSlots } from "../../src/game/refill";
import { SAVE_KEY } from "../../src/storage/save";

test("untimed refill starts with a CPU pick, then waits without consuming player time", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await selectGameMode(page, "refillPractice");
  await page.getByRole("button", { name: "さっそく、あそぶ" }).click();
  await page.getByRole("button", { name: "さあ、はじめよう" }).click();
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
  await expect(page.locator(".picture-card").first()).toBeDisabled();
  await page.clock.runFor(6500);
  await expect(page.locator(".hint-button")).toBeEnabled();
  let s = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(s.moves).toHaveLength(1);
  expect(s.moves[0].actor).toBe("cpu");
  expect(s.moves[0].readingId).toBe(s.board.opening.readingId);
  expect(s.board.reserve).toHaveLength(24);
  await expect(page.locator(".remaining-badge")).toContainText("23");
  await expect(page.locator(".picture-card").first()).toBeEnabled();
  const remaining = s.remaining;
  await page.clock.runFor(65000);
  await expect(page.locator(".hint-button")).toBeEnabled();
  s = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(s.remaining).toBe(remaining);
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  const move = legalMoves(assets, position(s))[0];
  const slot = boardSlots(s.board, s.moves).indexOf(move.assetId);
  await page
    .getByRole("button", { name: `札${slot + 1}。`, exact: false })
    .click();
  await page.clock.runFor(3000);
  await expect(page.locator(".remaining-badge")).toContainText("22");
  await expect(page.locator(".picture-card").nth(slot)).toHaveAttribute(
    "aria-label",
    `札${slot + 1}。${assets.find((a) => a.id === s.board.reserve[1])!.description}`,
  );
  await page.screenshot({
    path: `reports/hints/untimed-refill-${info.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "つづきから遊ぶ" }),
  ).toBeVisible();
});

test("a trapped CPU searches, pauses, looks puzzled and then ends without a loss", async ({
  page,
}, info) => {
  const s = initialState();
  s.settings = {
    ...s.settings,
    mode: "practice",
    muted: true,
    tutorialSeen: true,
  };
  s.phase = "playerTurn";
  s.head = "か";
  const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
  const other = assets
    .filter(
      (a) =>
        a.id !== umbrella.id &&
        !a.readings.some((r) => r.kana.startsWith("さ")),
    )
    .slice(0, 23);
  s.board = {
    ids: [umbrella.id, ...other.map((a) => a.id)],
    head: "か",
    seed: "trapped-cpu",
    version: "test",
    fallback: false,
  };
  const moved = reducer(
    s,
    { type: "SUBMIT", actor: "player", assetId: umbrella.id, moveId: "trap" },
    assets,
  );
  const searching = reducer(moved, { type: "RESOLVED" }, assets);
  expect(legalMoves(assets, position(searching))).toHaveLength(0);
  await page.addInitScript(
    ({ key, s }) => {
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key: SAVE_KEY, s: moved },
  );
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "つづきから遊ぶ" }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".cpu-searching")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "あなたの勝ち！" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.clock.runFor(4000);
  await expect(
    page.getByRole("heading", { name: "あなたの勝ち！" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await page.clock.runFor(searching.cpuRemaining - 650);
  await expect(page.locator(".cpu-stumped")).toHaveCount(1);
  await page.screenshot({
    path: `reports/hints/trapped-cpu-${info.project.name}.png`,
    fullPage: true,
  });
  await page.clock.runFor(900);
  await expect(page.locator(".rescue-overlay")).toHaveCount(0);
  await expect(page.locator(".result-overlay")).toBeVisible();
  await page.clock.runFor(500);
  const ended = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(ended.stats.played).toBe(1);
  expect(ended.head).toBe("さ");
  expect(ended.winner).toBe("player");
});
