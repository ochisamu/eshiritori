import { it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer, position } from "../../src/game/state";
import { legalMoves } from "../../src/game/rules";
import { rescueHead } from "../../src/game/rescue";
import type { GameState } from "../../src/game/types";
const ready = (): GameState => ({
  ...initialState(),
  phase: "playerTurn",
  head: "ゔ",
  board: {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "rescue",
    version: "test",
    fallback: false,
  },
});
it("finds a safe remaining word without reusing consumed cards or words", () => {
  const s = ready(),
    p = position(s),
    head = rescueHead(assets, p, "rescue");
  expect(head).toBeTruthy();
  expect(legalMoves(assets, { ...p, head: head! }).length).toBeGreaterThan(0);
  expect(rescueHead(assets, p, "rescue")).toBe(head);
  expect(
    rescueHead(assets, { ...p, usedIds: p.ids }, "rescue"),
  ).toBeUndefined();
});
it("an exhausted starting board ends without recording a loss", () => {
  const s = ready();
  s.board = { ...s.board!, ids: [] };
  const n = reducer(s, { type: "TICK", elapsed: 100 }, assets);
  expect(n.phase).toBe("roundResult");
  expect(n.winner).toBe("player");
});

it("a wrong tap during a no-move position cannot cause a penalty loss", () => {
  const s = { ...ready(), remaining: 1000 };
  const n = reducer(
    s,
    {
      type: "SUBMIT",
      actor: "player",
      assetId: s.board!.ids[0],
      moveId: "no-choice",
    },
    assets,
  );
  expect(n.phase).toBe("roundResult");
  expect(n.stats.played).toBe(1);
  expect(n.remaining).toBe(1000);
});

it("restarts on a basic-word connection instead of another isolated answer, within the current slots", () => {
  const words = ["あか", "かき", "きく", "ぬの"];
  const fixture = assets.slice(0, 4).map((a, i) => ({
    ...a,
    readings: [
      {
        ...a.readings[0],
        kana: words[i],
        display: words[i],
        kind: "basic" as const,
        difficulty: "common" as const,
      },
    ],
  }));
  const p = {
    ids: fixture.map((a) => a.id),
    usedIds: [],
    usedWords: [],
    discovered: [] as string[],
    head: "ゔ",
  };
  for (let i = 0; i < 20; i++) {
    const head = rescueHead(fixture, p, `restart-${i}`)!;
    expect(["あ", "か"]).toContain(head);
    expect(rescueHead(fixture, p, `restart-${i}`)).toBe(head);
  }
  const terminal = {
    ...fixture[3],
    readings: [{ ...fixture[3].readings[0], kana: "ぬん", display: "ぬん" }],
  };
  expect(
    rescueHead([terminal], { ...p, ids: [terminal.id] }, "terminal"),
  ).toBeUndefined();
});
