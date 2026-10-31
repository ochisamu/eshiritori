import { it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer } from "../../src/game/state";
import { cpuThinkDuration } from "../../src/game/cpuPresentation";
import { scoreKey } from "../../src/game/scoring";
const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
const ready = () => ({
  ...initialState(),
  phase: "playerTurn" as const,
  head: "か",
  board: {
    ids: assets.slice(0, 24).map((a) => a.id),
    head: "か",
    seed: "modes",
    version: "test",
    fallback: false,
  },
});
it("solo never inserts CPU turns, including odd rounds", () => {
  let s = ready();
  s.settings = { ...s.settings, opponent: "solo" };
  const n = reducer(
    s,
    { type: "SUBMIT", actor: "player", assetId: umbrella.id, moveId: "solo" },
    assets,
  );
  const r = reducer(n, { type: "RESOLVED" }, assets);
  expect(r.actor).toBe("player");
  expect(r.phase).toBe("playerTurn");
  const b = reducer(
    { ...s, round: 1, phase: "loadingRound" },
    { type: "BOARD", board: s.board },
    assets,
  );
  expect(b.actor).toBe("player");
});
it("race permits the first player or CPU claim and rejects the second claim", () => {
  for (const actor of ["player", "cpu"] as const) {
    const s = ready();
    s.settings = { ...s.settings, opponent: "race" };
    const ticked = reducer(s, { type: "TICK", elapsed: 500 }, assets);
    expect(ticked.cpuRemaining).toBe(s.cpuRemaining - 500);
    const action = {
      type: "SUBMIT" as const,
      actor,
      assetId: umbrella.id,
      moveId: "first",
    };
    const n = reducer(s, action, assets);
    expect(n.moves).toHaveLength(1);
    expect(n.moves[0].actor).toBe(actor);
    expect(
      reducer(
        n,
        {
          ...action,
          actor: actor === "cpu" ? "player" : "cpu",
          moveId: "second",
        },
        assets,
      ),
    ).toBe(n);
    expect(reducer(n, { type: "RESOLVED" }, assets).actor).toBe("player");
    expect(n.score?.panels).toBe(actor === "player" ? 1 : 0);
  }
});
it("rankings separate all three opponents; race search leaves time to compete", () => {
  const s = ready();
  const keys = ["turns", "solo", "race"].map((opponent) =>
    scoreKey({
      ...s,
      settings: {
        ...s.settings,
        opponent: opponent as "turns" | "solo" | "race",
      },
    }),
  );
  expect(new Set(keys).size).toBe(3);
  for (const difficulty of ["easy", "normal", "hard"] as const) {
    const ms = cpuThinkDuration({
      ...s,
      settings: { ...s.settings, difficulty, opponent: "race" },
    });
    expect(ms).toBeGreaterThanOrEqual(4500);
    expect(ms).toBeLessThan(10000);
  }
});
