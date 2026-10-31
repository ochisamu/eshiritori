import {
  chromium,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { activeAssets as assets } from "../src/game/content";
import { initialState, reducer, position } from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { chooseCpu } from "../src/game/cpu";
import { SAVE_KEY } from "../src/storage/save";
import type { GameState, OpponentMode } from "../src/game/types";
// @ts-expect-error Shared JavaScript build-fingerprint helper.
import { runtimeHash } from "./runtime-files.mjs";

const baseURL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:4173";
const output = "docs/screenshots";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.SCREENSHOT_CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
const contexts: BrowserContext[] = [],
  files: { name: string; width: number; height: number; bytes: number }[] = [];
const errors: string[] = [];
function game(opponent: OpponentMode): GameState {
  let s = initialState();
  s = reducer(
    s,
    {
      type: "START",
      seed: `readme-${opponent}-2026`,
      settings: { ...s.settings, opponent, muted: true, tutorialSeen: true },
    },
    assets,
  );
  const board = generateBoard(assets, {
    seed: s.seed,
    round: 0,
    difficulty: "normal",
    discovered: [],
    cpuOpening: opponent === "turns",
  });
  return reducer(
    reducer(s, { type: "BOARD", board }, assets),
    { type: "READY" },
    assets,
  );
}
async function open(
  s: GameState,
  width: number,
  height: number,
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  contexts.push(context);
  await context.addInitScript(
    ({ state, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(state));
    },
    { state: s, key: SAVE_KEY },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.clock.install({ time: new Date("2026-10-31T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T00:00:01Z"));
  await page.goto(baseURL);
  if (s.phase !== "title")
    await page
      .getByRole("button", { name: "つづきから遊ぶ", exact: true })
      .click();
  return page;
}
async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}
async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((img) => {
          const r = img.getBoundingClientRect();
          return r.width && r.height && r.top < innerHeight && r.bottom > 0;
        })
        .map((img) => img.decode()),
    );
  });
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth > innerWidth,
    y: document.documentElement.scrollHeight > innerHeight,
  }));
  if (overflow.x || overflow.y)
    throw Error(
      `Unexpected page scroll in ${name}: ${JSON.stringify(overflow)}`,
    );
  await page.screenshot({
    path: `${output}/${name}.png`,
    animations: "disabled",
    fullPage: false,
  });
  const viewport = page.viewportSize()!;
  files.push({
    name: `${name}.png`,
    ...viewport,
    bytes: statSync(`${output}/${name}.png`).size,
  });
  console.log(`Captured ${name} (${viewport.width}x${viewport.height})`);
}
try {
  const title = initialState();
  title.settings = { ...title.settings, muted: true, tutorialSeen: true };
  const titlePage = await open(title, 1440, 900);
  await expect(
    titlePage.getByRole("heading", { name: /絵をみて/ }),
  ).toBeVisible();
  await capture(titlePage, "title");

  const play = await open(game("turns"), 1440, 900);
  await expect(play.locator(".board-overlay")).toHaveCount(0);
  // Image decoding is real I/O; advance the frozen clock only after readiness.
  await play.evaluate(async () => {
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>(".picture-card img")].map(
        (img) => img.decode(),
      ),
    );
  });
  for (
    let step = 0;
    step < 12 && (await play.locator(".picture-card:enabled").count()) === 0;
    step++
  )
    await play.clock.runFor(1000);
  await expect(play.locator(".picture-card:enabled").first()).toBeEnabled();
  await play.clock.runFor(200);
  await capture(play, "game-desktop");
  const mobile = await open(await saved(play), 390, 844);
  await expect(mobile.locator(".board-overlay")).toHaveCount(0);
  await expect(mobile.locator(".picture-card:enabled").first()).toBeEnabled();
  await capture(mobile, "game-mobile");

  const race = await open(game("race"), 1280, 900);
  await expect(race.locator(".board-overlay")).toHaveCount(0);
  await expect(race.locator(".picture-card:enabled").first()).toBeEnabled();
  await race.clock.runFor(200);
  let state = await saved(race);
  const move = chooseCpu(
    assets,
    position(state),
    "normal",
    "readme-player",
  ).move!;
  await race.locator(`[data-asset-id="${move.assetId}"] .picture-card`).click();
  await expect(race.locator(".success-pop")).toBeVisible();
  await race
    .getByRole("button", { name: "正解演出を短縮", exact: true })
    .click();
  await race.clock.runFor(1200);
  await expect(race.locator(".picture-card:enabled").first()).toBeEnabled();
  await race.clock.runFor(1200);
  await expect.poll(async () => (await saved(race)).phase).toBe("playerTurn");
  state = await saved(race);
  await race.clock.runFor(state.cpuRemaining + 200);
  await expect(race.locator(".success-pop")).toBeVisible();
  await race
    .getByRole("button", { name: "正解演出を短縮", exact: true })
    .click();
  await race.clock.runFor(1200);
  await expect(race.locator(".picture-card:enabled").first()).toBeEnabled();
  await race.clock.runFor(1200);
  await expect.poll(async () => (await saved(race)).phase).toBe("playerTurn");
  state = await saved(race);
  if (
    !state.score?.points ||
    !state.cpuScore?.points ||
    state.phase !== "playerTurn"
  )
    throw Error(
      `Race capture state: ${JSON.stringify({ phase: state.phase, score: state.score, cpuScore: state.cpuScore, moves: state.moves.map((m) => ({ actor: m.actor, word: m.word })) })}`,
    );
  await capture(race, "race");

  const catalogState = initialState();
  catalogState.settings.muted = true;
  catalogState.discovered = assets
    .slice(0, 12)
    .flatMap((a) => a.readings.map((r) => r.id))
    .concat(assets.slice(12, 24).map((a) => a.readings[0].id));
  const catalog = await open(catalogState, 1440, 1000);
  await catalog
    .getByRole("button", { name: "発見ずかん", exact: true })
    .click();
  await expect(catalog.locator(".collection-tile")).toHaveCount(48);
  await capture(catalog, "collection");
  if (errors.length) throw Error(`Browser errors: ${errors.join("; ")}`);
  writeFileSync(
    `${output}/capture.json`,
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        buildHash: runtimeHash(),
        files,
        collectionNote:
          "Only the collection screenshot uses a sample discovery state to demonstrate missing/found/complete panels. Gameplay captures use production-generated boards and actual UI answers in isolated browser contexts.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
