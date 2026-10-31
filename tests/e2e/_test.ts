import { test as base, expect } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { CONTENT_VERSION } from "../../src/game/state";
// @ts-expect-error Shared dependency-free JavaScript release helper.
import { runtimeHash } from "../../tools/runtime-files.mjs";
export { expect };
export type { Page, CDPSession } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, use, info) => {
    const errors: { kind: string; message: string }[] = [];
    page.on("pageerror", (error) =>
      errors.push({ kind: "pageerror", message: error.message }),
    );
    page.on("console", (message) => {
      if (message.type() === "error")
        errors.push({
          kind: "console.error",
          message: message.text() + " " + message.location().url,
        });
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push({
          kind: "http",
          message: `${response.status()} ${response.url()}`,
        });
    });
    await use(page);
    const intentional = info.annotations.some(
      (a) => a.type === "intentional-fault",
    );
    appendFileSync(
      process.env.BROWSER_EVENTS_OUTPUT ?? "reports/browser-events.jsonl",
      JSON.stringify({
        at: new Date().toISOString(),
        runId: process.env.TEST_RUN_ID ?? "development",
        test: info.title,
        project: info.project.name,
        status: info.status,
        intentional,
        contentVersion: CONTENT_VERSION,
        buildHash: runtimeHash(),
        errors,
      }) + "\n",
    );
    if (!intentional)
      expect(errors, "Unexpected browser/runtime/resource errors").toEqual([]);
  },
});

export async function openGameControl(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.locator(".app").waitFor({ state: "visible" });
  const label = name === "発見ずかん" ? /^発見ずかん(?:[ ]*[0-9]+)?$/ : name;
  const control = page.getByRole("button", { name: label, exact: true });
  if (!(await control.isVisible()))
    await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await control.click();
}
export async function resumeFromMenu(page: import("@playwright/test").Page) {
  if (await page.locator(".pause-overlay").isVisible())
    await page
      .getByRole("button", { name: "つづきから遊ぶ", exact: true })
      .click();
}

export async function selectGameMode(
  page: import("@playwright/test").Page,
  mode: string,
) {
  await page
    .getByRole("group", { name: "パネル補充", exact: true })
    .getByRole("button", {
      name: mode.startsWith("refill") ? "補充あり" : "24枚",
      exact: true,
    })
    .click();
  await page
    .getByRole("group", { name: "制限時間", exact: true })
    .getByRole("button", {
      name: mode === "standard" || mode === "refill" ? "あり" : "なし",
      exact: true,
    })
    .click();
}
export async function completeRound(
  page: import("@playwright/test").Page,
  preferTerminal = true,
) {
  const { activeAssets } = await import("../../src/game/content");
  const { position } = await import("../../src/game/state");
  const { legalMoves, tapReading } = await import("../../src/game/rules");
  const { boardSlots, timedMode } = await import("../../src/game/refill");
  const { tailKana } = await import("../../src/game/normalization");
  for (let step = 0; step < 180; step++) {
    if (await page.locator(".result-overlay").isVisible()) return;
    const s = (await page.evaluate(() =>
      JSON.parse(localStorage.getItem("eshiritori.save.v1")!),
    )) as import("../../src/game/types").GameState;
    if (s.phase === "roundResult") return;
    if (s.phase === "paused") {
      const resume = page.getByRole("button", { name: "つづきから遊ぶ", exact: true });
      if (await resume.isVisible()) await resume.click();
      else await page.clock.runFor(100);
      continue;
    }
    if (s.phase === "resolvingMove") {
      await page.clock.runFor(2700);
      continue;
    }
    if (s.phase === "rescuing") {
      await page.clock.runFor(1700);
      continue;
    }
    if (s.phase === "cpuThinking") {
      await page.clock.runFor(6500);
      continue;
    }
    if (s.phase !== "playerTurn")
      throw Error("Unexpected round state " + s.phase);
    if (timedMode(s.settings.mode) && preferTerminal) {
      await page.clock.runFor(s.remaining + 2000);
      continue;
    }
    const p = position(s),
      slots = boardSlots(s.board, s.moves);
    const terminal = preferTerminal
      ? activeAssets.find((a) => {
          const r = tapReading(a, p);
          return r && tailKana(r.kana) === "ん";
        })
      : undefined;
    const id = terminal?.id ?? legalMoves(activeAssets, p)[0]?.assetId;
    if (!id) {
      await page.clock.runFor(2000);
      continue;
    }
    await page.locator(".picture-card").nth(slots.indexOf(id)).click();
    await page.clock.runFor(200);
  }
  throw Error("Round did not finish within bounded UI play");
}
