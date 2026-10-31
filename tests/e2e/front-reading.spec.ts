import { test, expect } from "./_test";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, position } from "../../src/game/state";
import { chooseCpu, CPU_VERSION } from "../../src/game/cpu";
import { legalMoves } from "../../src/game/rules";
import { withReserve } from "../../src/game/refill";
import { cpuThinkDuration } from "../../src/game/cpuPresentation";
import { SAVE_KEY, validSave } from "../../src/storage/save";
import type { GameState, Mode } from "../../src/game/types";
for (const mode of [
  "standard",
  "refill",
  "refillPractice",
  "practice",
  "accessible",
] as Mode[])
  for (const scenario of ["front", "fallback"] as const)
    test(`CPU ${scenario} reading priority is visible in ${mode}`, async ({
      page,
    }) => {
      let selected: GameState | undefined;
      for (
        let start = 0;
        start < assets.length - 24 && !selected;
        start += 24
      ) {
        const sample = assets.slice(start, start + 24);
        for (const head of new Set(
          sample.flatMap((a) => a.readings.map((r) => r.kana[0])),
        )) {
          const s = initialState();
          s.settings = { ...s.settings, mode, muted: true, tutorialSeen: true };
          s.phase = "cpuThinking";
          s.actor = "cpu";
          s.head = head;
          s.discovered = sample.flatMap((a) => a.readings.map((r) => r.id));
          s.board = {
            ids: sample.map((a) => a.id),
            head,
            seed: `front-ui-${scenario}`,
            version: "test",
            cpuVersion: CPU_VERSION,
            fallback: false,
            initialDiscovered: [...s.discovered],
          };
          const ms = legalMoves(assets, position(s)),
            front = ms.filter((m) => m.reading.kind === "basic"),
            alt = ms.filter((m) => m.reading.kind !== "basic");
          if (
            alt.length &&
            (scenario === "front" ? front.length : !front.length)
          ) {
            if (mode === "refill" || mode === "refillPractice")
              s.board = withReserve(s.board, s.settings.difficulty, assets);
            s.cpuRemaining = cpuThinkDuration(s);
            selected = s;
            break;
          }
        }
      }
      expect(selected).toBeDefined();
      const s = selected!;
      expect(validSave(s)).toBe(true);
      const expected = chooseCpu(
        assets,
        position(s),
        s.settings.difficulty,
        `${s.board!.seed}:cpu:0`,
      ).move!;
      expect(expected.reading.kind === "basic").toBe(scenario === "front");
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
      await page.clock.runFor(4200);
      await expect
        .poll(
          async () =>
            JSON.parse(
              (await page.evaluate(
                (key) => localStorage.getItem(key),
                SAVE_KEY,
              ))!,
            ).moves.length,
        )
        .toBe(1);
      const actual = (await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        SAVE_KEY,
      )) as GameState;
      expect(actual.moves[0].readingId).toBe(expected.reading.id);
      expect(actual.moves[0].assetId).toBe(expected.assetId);
    });
