import { describe, it, expect } from "vitest";
import { initialState, position, reducer } from "../../src/game/state";
import { assets } from "../../src/game/content";
import type { Action } from "../../src/game/state";
import type { GameState, Move } from "../../src/game/types";
const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
function ready(): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head: "か",
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      head: "か",
      seed: "fixture",
      version: "test",
      fallback: false,
    },
  };
}
const reduce = (s: GameState, a: Action) => reducer(s, a, assets);
describe("deterministic state transitions", () => {
  it("commits a terminal word and ends immediately for either actor in every mode, before the last-card win", () => {
    const lemon = assets.find((a) => a.conceptKey === "lemon")!;
    for (const mode of [
      "standard",
      "refill",
      "practice",
      "accessible",
    ] as const)
      for (const actor of ["player", "cpu"] as const) {
        const s = {
          ...ready(),
          head: "れ",
          actor,
          phase:
            actor === "player"
              ? ("playerTurn" as const)
              : ("cpuThinking" as const),
          settings: { ...ready().settings, mode },
        };
        // A one-panel ending proves terminal loss takes precedence over last-panel victory.
        s.board = { ...s.board!, ids: [lemon.id] };
        const n = reduce(s, {
          type: "SUBMIT",
          actor,
          assetId: lemon.id,
          input: mode === "practice" ? "レモン" : undefined,
          moveId: "terminal",
        });
        expect(n.phase).toBe("roundResult");
        expect(n.winner).toBe(actor === "player" ? "cpu" : "player");
        expect(n.moves).toHaveLength(1);
        expect(n.remaining).toBe(s.remaining);
        expect(n.reason).toContain("「ん」で終わる");
        expect(n.discovered).toContain(lemon.readings[0].id);
        expect(
          reduce(n, {
            type: "SUBMIT",
            actor,
            assetId: lemon.id,
            moveId: "terminal",
          }),
        ).toBe(n);
        expect(n.stats.played).toBe(1);
      }
  });
  it("settles elapsed time before pausing, and time expiry takes priority", () => {
    const s = ready();
    const paused = reduce(s, { type: "PAUSE", elapsed: 179 });
    expect(paused.remaining).toBe(44821);
    expect(paused.phase).toBe("paused");
    const expired = reduce(
      { ...s, remaining: 150 },
      { type: "PAUSE", elapsed: 200 },
    );
    expect(expired.phase).toBe("roundResult");
    expect(expired.remaining).toBe(0);
    expect(expired.winner).toBe("cpu");
  });
  it("starts, loads, waits for images and then admits input", () => {
    let s = reduce(initialState(), {
      type: "START",
      seed: "abc",
      settings: initialState().settings,
    });
    expect(s.phase).toBe("loadingRound");
    s = reduce(s, { type: "BOARD", board: ready().board! });
    expect(s.phase).toBe("loadingRound");
    s = reduce(s, { type: "READY" });
    expect(s.phase).toBe("playerTurn");
    expect(reduce(s, { type: "BOARD", board: ready().board! })).toBe(s);
    expect(reduce(s, { type: "READY" })).toBe(s);
  });
  it("requires correct actor, prevents duplicate success, pauses resolution timer", () => {
    const s = ready();
    const action: Action = {
      type: "SUBMIT",
      actor: "player",
      assetId: umbrella.id,
      moveId: "one",
    };
    expect(reduce(s, { ...action, actor: "cpu" })).toBe(s);
    const n = reduce(s, action);
    expect(n.moves).toHaveLength(1);
    expect(n.phase).toBe("resolvingMove");
    expect(reduce(n, action)).toBe(n);
    expect(reduce(n, { type: "TICK", elapsed: 10000 })).toBe(n);
    const r = reduce(n, { type: "RESOLVED" });
    expect(r.actor).toBe("cpu");
    expect(r.phase).toBe("cpuThinking");
    expect(r.remaining).toBe(45000);
  });
  it("charges exactly one penalty for repeated wrong card in a state", () => {
    const s = ready();
    const a: Action = {
      type: "SUBMIT",
      actor: "player",
      assetId: assets[0].id,
      moveId: "wrong",
    };
    const n = reduce(s, a);
    expect(n.remaining).toBe(40000);
    expect(n.moves).toHaveLength(0);
    expect(reduce(n, a)).toBe(n);
    expect(reduce({ ...s, remaining: 3000 }, a).phase).toBe("roundResult");
    expect(reduce({ ...s, remaining: 3000 }, a).remaining).toBe(0);
  });
  it("allows a correct retry on the same panel after a typo, while duplicate wrong submissions cost only once", () => {
    const s = ready(),
      bad: Action = {
        type: "SUBMIT",
        actor: "player",
        assetId: umbrella.id,
        input: "かささ",
        moveId: "typo",
      };
    const wrong = reduce(s, bad);
    expect(wrong.remaining).toBe(40000);
    expect(reduce(wrong, { ...bad, moveId: "duplicate-typo" })).toBe(wrong);
    const good = reduce(wrong, { ...bad, input: "かさ", moveId: "corrected" });
    expect(good.moves).toHaveLength(1);
    expect(good.moves[0].word).toBe("かさ");
    expect(good.remaining).toBe(40000);
    expect(reduce(good, { ...bad, input: "かさ", moveId: "corrected" })).toBe(
      good,
    );
  });
  it("ticks only active phases with monotonic positive deltas", () => {
    const s = ready();
    expect(reduce(s, { type: "TICK", elapsed: 1500 }).remaining).toBe(43500);
    expect(reduce(s, { type: "TICK", elapsed: -1 })).toBe(s);
    expect(reduce(s, { type: "TICK", elapsed: NaN })).toBe(s);
    expect(reduce(s, { type: "TICK", elapsed: 99999 }).winner).toBe("cpu");
    expect(
      reduce(
        { ...s, actor: "cpu", phase: "cpuThinking" },
        { type: "TICK", elapsed: 99999 },
      ).winner,
    ).toBe("player");
    const practice = {
      ...s,
      settings: { ...s.settings, mode: "practice" as const },
    };
    expect(reduce(practice, { type: "TICK", elapsed: 99999 }).remaining).toBe(
      s.remaining,
    );
  });
  it("preserves time across all pause/resume phases", () => {
    for (const phase of [
      "playerTurn",
      "cpuThinking",
      "resolvingMove",
      "loadingRound",
    ] as const) {
      const s = { ...ready(), phase };
      const paused = reduce(s, { type: "PAUSE" });
      expect(paused.phase).toBe("paused");
      expect(reduce(paused, { type: "TICK", elapsed: 99999 })).toBe(paused);
      expect(reduce(paused, { type: "RESUME" }).phase).toBe(phase);
      expect(reduce(paused, { type: "PAUSE" })).toBe(paused);
    }
    expect(reduce(initialState(), { type: "PAUSE" }).phase).toBe("title");
    expect(reduce(ready(), { type: "RESUME" })).toEqual(ready());
  });
  it("last card wins before next legal-move check", () => {
    const s = ready();
    s.moves = s
      .board!.ids.filter((id) => id !== umbrella.id)
      .map(
        (id, i) =>
          ({
            id: `old-${i}`,
            assetId: id,
            readingId: "r",
            word: `word${i}`,
            actor: "cpu",
            head: "あ",
            tail: "か",
            kind: "basic",
            explanation: "",
          }) as Move,
      );
    const n = reduce(s, {
      type: "SUBMIT",
      actor: "player",
      assetId: umbrella.id,
      moveId: "last",
    });
    expect(n.moves).toHaveLength(24);
    expect(n.winner).toBe("player");
    expect(n.stats.streak).toBe(1);
    expect(n.stats.played).toBe(1);
    expect(n.stats.byMode["standard:normal:45:clean:fresh"].wins).toBe(1);
  });
  it("next round is one action, alternates starter, bounded history, supports losses", () => {
    const lost = reduce(ready(), { type: "TICK", elapsed: 50000 });
    const next = reduce(lost, { type: "NEXT" });
    expect(next.round).toBe(1);
    expect(next.phase).toBe("loadingRound");
    expect(next.recentBoards).toHaveLength(1);
    const loaded = reduce(next, { type: "BOARD", board: ready().board! });
    expect(loaded.actor).toBe("cpu");
    expect(reduce(loaded, { type: "READY" }).phase).toBe("cpuThinking");
    expect(reduce(ready(), { type: "NEXT" })).toEqual(ready());
    expect(reduce(lost, { type: "REPLAY" }).round).toBe(0);
    expect(reduce(ready(), { type: "REPLAY" })).toEqual(ready());
  });
  it("handles hints, answer reference and separated records", () => {
    let s = ready();
    for (let i = 0; i < 5; i++) s = reduce(s, { type: "HINT" });
    expect(s.hintLevel).toBe(3);
    expect(s.hintUsed).toBe(3);
    s = reduce(s, { type: "REFERENCE" });
    expect(s.answerReferenced).toBe(true);
    s = reduce(s, { type: "TICK", elapsed: 50000 });
    expect(s.stats.byMode["standard:normal:45:reference:fresh"].played).toBe(1);
    expect(s.stats.streak).toBe(0);
    expect(reduce(s, { type: "HINT" })).toBe(s);
    expect(reduce(s, { type: "SURRENDER" })).toBe(s);
  });
  it("recoverable load failure is never a loss", () => {
    const s = reduce(ready(), { type: "LOAD_ERROR", message: "image failure" });
    expect(s.phase).toBe("recoverableError");
    expect(s.stats.played).toBe(0);
    expect(reduce(s, { type: "RETRY_LOAD" }).phase).toBe("loadingRound");
    expect(reduce(s, { type: "TITLE" }).phase).toBe("title");
    expect(reduce(s, { type: "FINISH" }).phase).toBe("finishedSession");
    expect(
      reduce(s, { type: "SETTINGS", settings: { ...s.settings, muted: true } })
        .settings.muted,
    ).toBe(true);
  });
  it("searches before ending no-move rounds and ends invalid starting heads without a loss", () => {
    const s = ready();
    s.board = { ...s.board!, ids: [umbrella.id, "absent"] };
    const n = reduce(s, {
      type: "SUBMIT",
      actor: "player",
      assetId: umbrella.id,
      moveId: "x",
    });
    const searching = reduce(n, { type: "RESOLVED" });
    expect(searching.phase).toBe("cpuThinking");
    expect(searching.winner).toBeNull();
    expect(
      reduce(searching, { type: "TICK", elapsed: searching.cpuRemaining - 1 })
        .winner,
    ).toBeNull();
    expect(
      reduce(searching, { type: "TICK", elapsed: searching.cpuRemaining })
        .phase,
    ).toBe("roundResult");
    expect(position(n).usedWords).toContain("かさ");
    expect(reduce(s, { type: "RESOLVED" })).toBe(s);
    expect(
      reduce({ ...s, phase: "loadingRound", head: "を" }, { type: "READY" })
        .phase,
    ).toBe("roundResult");
  });
});
