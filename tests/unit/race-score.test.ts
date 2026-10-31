import { describe, it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { initialState, reducer, currentRecord } from "../../src/game/state";
import {
  emptyScore,
  totalScore,
  cpuRoundScore,
  rankRound,
} from "../../src/game/scoring";
import {
  cpuSearchCard,
  raceCursorProgress,
  RACE_APPROACH_MS,
} from "../../src/game/cpuPresentation";
import {
  loadGame,
  saveGame,
  validSave,
  SAVE_KEY,
} from "../../src/storage/save";
import type { GameState, Mode } from "../../src/game/types";
const reduce = (s: GameState, a: Parameters<typeof reducer>[1]) =>
  reducer(s, a, assets);
const points = (n: number) => ({
  ...emptyScore(),
  points: n,
  panels: n ? 1 : 0,
});
function ready(
  opponent: "turns" | "solo" | "race" = "race",
  mode: Mode = "standard",
): GameState {
  const s = initialState();
  return {
    ...s,
    phase: "playerTurn",
    head: "か",
    settings: { ...s.settings, opponent, mode },
    board: {
      ids: assets.slice(0, 24).map((a) => a.id),
      seed: "race-score",
      version: "test",
      fallback: false,
      head: "か",
    },
  };
}
describe("race score and visible win streak", () => {
  for (const [player, cpu, winner] of [
    [300, 200, "player"],
    [200, 300, "cpu"],
    [200, 200, null],
  ] as const)
    it(`settles ${player}:${cpu} using only current-board points`, () => {
      const s = {
        ...ready(),
        head: "ゔ",
        score: points(player),
        cpuScore: points(cpu),
        carriedScore: points(100000),
        stats: {
          ...initialState().stats,
          played: 5,
          wins: 3,
          streak: 2,
          best: 2,
        },
      };
      const n = reduce(s, { type: "TICK", elapsed: 20 });
      expect(n.phase).toBe("roundResult");
      expect(n.winner).toBe(winner);
      expect(n.stats.streak).toBe(
        winner === "player" ? 3 : winner === "cpu" ? 0 : 2,
      );
      expect(currentRecord(n).streak).toBe(n.stats.streak);
      expect(totalScore(n).points).toBe(100000 + player);
      expect(n.stats.rankings![0].points).toBe(100000 + player);
      const next = reduce(n, { type: "NEXT" });
      expect(totalScore(next).points).toBe(
        winner === "cpu" ? 0 : 100000 + player,
      );
      expect(cpuRoundScore(next)).toEqual(emptyScore());
      expect(reduce(n, { type: "TICK", elapsed: 999 })).toBe(n);
    });
  it("awards identical CPU/player speed and alternate points once without mixing totals", () => {
    const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
    for (const actor of ["player", "cpu"] as const) {
      const s = reduce(ready(), { type: "TICK", elapsed: 9000 });
      const action = {
        type: "SUBMIT" as const,
        actor,
        assetId: umbrella.id,
        moveId: "claim",
      };
      const n = reduce(s, action),
        score = actor === "cpu" ? cpuRoundScore(n) : n.score!;
      expect(score.points).toBe(180);
      expect(score.panels).toBe(1);
      expect(actor === "cpu" ? n.score!.points : cpuRoundScore(n).points).toBe(
        0,
      );
      expect(n.moves[0].points?.total).toBe(180);
      expect(reduce(n, action)).toBe(n);
    }
    const s = ready();
    s.head = "あ";
    const n = reduce(s, {
      type: "SUBMIT",
      actor: "cpu",
      assetId: umbrella.id,
      input: "あまがさ",
      moveId: "alternate",
    });
    expect(cpuRoundScore(n).points).toBe(350);
    expect(cpuRoundScore(n).alternatives).toBe(1);
  });
  it("also compares race scores on the last card rather than giving an automatic player win", () => {
    const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
    const s = ready();
    s.board!.ids = [umbrella.id];
    s.cpuScore = points(500);
    const n = reduce(s, {
      type: "SUBMIT",
      actor: "player",
      assetId: umbrella.id,
      moveId: "last",
    });
    expect(n.phase).toBe("roundResult");
    expect(n.winner).toBe("cpu");
    expect(n.score?.points).toBe(200);
  });
  it("terminal words and timeout override a lead, and CPU terminal answers earn no points", () => {
    const lemon = assets.find((a) => a.conceptKey === "lemon")!;
    for (const actor of ["player", "cpu"] as const) {
      const s = {
        ...ready(),
        head: "れ",
        score: points(5000),
        cpuScore: points(8000),
      };
      s.board!.ids = [
        lemon.id,
        ...s.board!.ids.filter((id) => id !== lemon.id).slice(0, 23),
      ];
      const n = reduce(s, {
        type: "SUBMIT",
        actor,
        assetId: lemon.id,
        moveId: "terminal",
      });
      expect(n.winner).toBe(actor === "player" ? "cpu" : "player");
      expect(n.score).toEqual(s.score);
      expect(n.cpuScore).toEqual(s.cpuScore);
    }
    const s = { ...ready(), score: points(5000), remaining: 1 };
    expect(reduce(s, { type: "TICK", elapsed: 2 }).winner).toBe("cpu");
  });
  it("counts successive cleared boards despite hint/reference category changes and reload", () => {
    let s = { ...ready("solo"), head: "ゔ" };
    for (let i = 1; i <= 3; i++) {
      s = reduce(s, { type: "TICK", elapsed: 1 });
      expect(s.stats.streak).toBe(i);
      expect(currentRecord(s).streak).toBe(i);
      expect(s.stats.wins).toBe(i);
      if (i < 3) {
        s = reduce(s, { type: "NEXT" });
        s = reduce(s, {
          type: "BOARD",
          board: { ...s.recentBoards[0], head: "ゔ" },
        });
        s = { ...s, hintUsed: i === 1 ? 1 : 0, answerReferenced: i === 2 };
        s = reduce(s, { type: "READY" });
      }
    }
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
    };
    expect(saveGame(storage, s)).toBeNull();
    expect(
      loadGame(
        storage,
        assets.map((a) => a.id),
        assets.flatMap((a) => a.readings.map((r) => r.id)),
      ).state?.stats.streak,
    ).toBe(3);
    const fresh = reduce(s, {
      type: "START",
      seed: "new",
      settings: s.settings,
    });
    expect(fresh.stats.streak).toBe(0);
    expect(fresh.stats.best).toBe(3);
  });
  for (const mode of ["practice", "refillPractice", "accessible"] as const)
    it(`${mode} never inserts or clears ranking records`, () => {
      const s = ready("solo", mode);
      s.score = points(200);
      const old = rankRound({
        ...s,
        settings: { ...s.settings, mode: "standard" },
      });
      s.stats.rankings = old;
      expect(rankRound(s)).toBe(old);
      const n = reduce({ ...s, head: "ゔ" }, { type: "TICK", elapsed: 1 });
      expect(n.stats.rankings).toEqual(old);
      expect(n.stats.streak).toBe(1);
    });
  it("recovers old CPU claims and validates CPU score saves without changing player carry", () => {
    const s = ready();
    s.cpuScore = undefined;
    const umbrella = assets.find((a) => a.conceptKey === "umbrella")!;
    const n = reduce(s, {
      type: "SUBMIT",
      actor: "cpu",
      assetId: umbrella.id,
      moveId: "old",
    });
    delete n.cpuScore;
    delete n.moves[0].points;
    expect(cpuRoundScore(n).points).toBe(100);
    const data = new Map([[SAVE_KEY, JSON.stringify(n)]]);
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
    };
    const restored = loadGame(
      storage,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    ).state!;
    expect(restored.cpuScore?.points).toBe(100);
    expect(totalScore(restored).points).toBe(0);
    expect(
      validSave({ ...restored, cpuScore: { ...points(100), panels: 73 } }),
    ).toBe(false);
  });
  it("keeps race cards unmarked while thinking and advances a bounded direct approach", () => {
    const s = ready();
    for (const ms of [6500, 2000, 650, 200, 0])
      expect(
        cpuSearchCard({ ...s, cpuRemaining: ms }, s.board!.ids[0]),
      ).toBeUndefined();
    expect(raceCursorProgress(9000)).toBe(0);
    expect(raceCursorProgress(RACE_APPROACH_MS)).toBe(0);
    expect(raceCursorProgress(325)).toBe(0.5);
    expect(raceCursorProgress(0)).toBe(1);
  });
});
