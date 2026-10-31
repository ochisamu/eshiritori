import { describe, it, expect } from "vitest";
import {
  chooseCpu,
  CPU_VERSION,
  LONG_PLAY_CPU_VERSION,
  PREVIOUS_CPU_VERSION,
  CPU_STATE_LIMITS,
  LEGACY_CPU_VERSION,
} from "../../src/game/cpu";
import { winningPath } from "../../src/game/boardGenerator";
import { advance, legalMoves, type Position } from "../../src/game/rules";
import type { Asset } from "../../src/game/types";
function cards(words: string[]): Asset[] {
  return words.map((kana, i) => ({
    id: `fixture-${i}`,
    conceptKey: `fixture-${i}`,
    category: "fixture",
    description: "探索予算用のテストデータ",
    image: "fixture",
    detail: "fixture",
    status: "approved",
    sourceSize: 512,
    readings: [
      {
        id: `reading-${i}`,
        kana,
        display: kana,
        kind: "basic",
        priority: 0,
        explanation: "test",
        evidence: "test",
        hints: ["a", "b", kana],
        aliases: [],
        reviewStatus: "approved",
      },
    ],
  }));
}
function initial(assets: Asset[]): Position {
  return {
    ids: assets.map((a) => a.id),
    head: "あ",
    usedIds: [],
    usedWords: [],
    discovered: [],
  };
}
describe("bounded CPU decisions and versioned continuation", () => {
  it("returns a legal reproducible answer on an extremely branching board within 5000 states", () => {
    const a = cards(
      [..."あいうえおかきくけこさしすせそたちつてとなにぬね"].map(
        (k) => "あ" + k + "あ",
      ),
    );
    const p = initial(a);
    const first = chooseCpu(
      a,
      p,
      "hard",
      "dense",
      undefined,
      PREVIOUS_CPU_VERSION,
    );
    expect(first.limited).toBe(true);
    expect(first.states).toBe(5000);
    expect(first.move).not.toBeNull();
    expect(legalMoves(a, p)).toContainEqual(first.move);
    expect(
      chooseCpu(a, p, "hard", "dense", undefined, PREVIOUS_CPU_VERSION),
    ).toEqual(first);
  });
  it("marks externally cancelled evaluations and never uses one as proof of a winning board", () => {
    const a = cards(["あか", "あい", "いえ", "あう", "うえ"]);
    const p = initial(a);
    const budget = { states: 0, limit: 0 };
    const cancelled = chooseCpu(a, p, "hard", "cancel", budget);
    expect(cancelled.budgetExceeded).toBe(true);
    expect(cancelled.states).toBe(0);
    expect(legalMoves(a, p)).toContainEqual(cancelled.move);
    const proofBudget = { states: 0, limit: 2 };
    expect(winningPath(a, p, "cpu", "hard", "cancel", proofBudget)).toBeNull();
    expect(proofBudget.states).toBeLessThanOrEqual(2);
  });
  it("can keep an opening exchange alive while preserving the old policy for saved boards", () => {
    const a = cards(["あか", "あい", "いえ", "あう", "うえ"]);
    const p = initial(a);
    let continued = 0;
    for (let i = 0; i < 100; i++) {
      const old = chooseCpu(
        a,
        p,
        "normal",
        `opening-${i}`,
        undefined,
        LEGACY_CPU_VERSION,
      ).move!;
      expect(legalMoves(a, advance(p, old))).toHaveLength(0);
      const next = chooseCpu(
        a,
        p,
        "normal",
        `opening-${i}`,
        undefined,
        PREVIOUS_CPU_VERSION,
      ).move!;
      if (legalMoves(a, advance(p, next)).length) continued++;
    }
    expect(continued).toBeGreaterThan(40);
    expect(continued).toBeLessThan(100);
  });
  it("prefers a continuing chain over an immediate win at every difficulty and stage", () => {
    const a = cards(["あか", "あい", "いう", "うえ", "えお", "おく"]);
    for (const difficulty of ["easy", "normal", "hard"] as const)
      for (const usedIds of [[], ["already-used"]])
        for (let i = 0; i < 20; i++) {
          const p = { ...initial(a), usedIds };
          const decision = chooseCpu(
            a,
            p,
            difficulty,
            `long-${i}`,
            undefined,
            CPU_VERSION,
          );
          expect(decision.move?.reading.kana).toBe("あい");
          expect(decision.states).toBeLessThanOrEqual(
            CPU_STATE_LIMITS[difficulty],
          );
          expect(chooseCpu(a, p, difficulty, `long-${i}`)).toEqual(decision);
        }
  });
  it("bounds highly connected long-play probes without enumerating the state tree", () => {
    const a = cards(
      [..."あいうえおかきくけこさしすせそたちつてとなにぬね"].map(
        (k) => "あ" + k + "あ",
      ),
    );
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const p = initial(a),
        decision = chooseCpu(a, p, difficulty, "bounded-long");
      expect(decision.states).toBeLessThanOrEqual(CPU_STATE_LIMITS[difficulty]);
      expect(legalMoves(a, p)).toContainEqual(decision.move);
      expect(chooseCpu(a, p, difficulty, "bounded-long")).toEqual(decision);
    }
  });
  it("forecasts the scheduled reserve card before assessing continuation", () => {
    const a = cards(["あか", "あい", "いお", "おう"]);
    const p = {
      ...initial(a),
      ids: [a[0].id, a[1].id, a[3].id],
      reserve: [a[2].id],
    };
    const decision = chooseCpu(a, p, "normal", "reserve-long");
    expect(decision.move?.reading.kana).toBe("あい");
    const next = advance(p, decision.move!);
    expect(next.ids).toEqual([a[0].id, a[2].id, a[3].id]);
    expect(legalMoves(a, next).map((m) => m.reading.kana)).toEqual(["いお"]);
  });
  it("stops at the cap with 768 fallback alternative choices and none on the front", () => {
    const alphabet = [
      ..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ",
    ];
    const a = cards(Array(24).fill("ああ"));
    for (let card = 0; card < a.length; card++)
      a[card].readings = Array.from({ length: 32 }, (_, i) => ({
        ...a[card].readings[0],
        id: `dense-${card}-${i}`,
        kana: `あ${alphabet[card]}${alphabet[i]}あ`,
        kind: "synonym" as const,
      }));
    const p = {
      ...initial(a),
      discovered: a.flatMap((c) => c.readings.map((r) => r.id)),
    };
    const legal = legalMoves(a, p);
    expect(legal).toHaveLength(768);
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      const decision = chooseCpu(a, p, difficulty, "extreme-branching");
      expect(decision.states).toBe(CPU_STATE_LIMITS[difficulty]);
      expect(decision.limited).toBe(true);
      expect(legal).toContainEqual(decision.move);
      expect(chooseCpu(a, p, difficulty, "extreme-branching")).toEqual(
        decision,
      );
    }
  });
  it("uses front readings at every difficulty, including when an alternative would prolong play", () => {
    const a = cards(["あか", "あい", "いう", "うえ"]);
    a[1].readings[0].kind = "synonym";
    const p = initial(a);
    for (const difficulty of ["easy", "normal", "hard"] as const)
      for (let i = 0; i < 20; i++) {
        const d = chooseCpu(a, p, difficulty, `front-${i}`);
        expect(d.move?.reading.kana).toBe("あか");
        expect(
          chooseCpu(
            a,
            p,
            difficulty,
            `front-${i}`,
            undefined,
            LONG_PLAY_CPU_VERSION,
          ).move?.reading.kana,
        ).toBe("あい");
      }
    const exhausted = { ...p, usedWords: ["あか"] };
    expect(
      chooseCpu(a, exhausted, "normal", "fallback").move?.reading.kana,
    ).toBe("あい");
    const removed = { ...p, usedIds: [a[0].id] };
    expect(chooseCpu(a, removed, "normal", "fallback").move?.reading.kana).toBe(
      "あい",
    );
  });
  it("treats synonym as an alternative and excludes terminal front readings", () => {
    const a = cards(["あん", "あい", "いう"]);
    a[1].readings[0].kind = "synonym";
    expect(
      chooseCpu(a, initial(a), "hard", "terminal").move?.reading.kana,
    ).toBe("あい");
  });
  it("does not let discovered explicit alternatives override a legal front reading", () => {
    const a = cards(["あか", "あお", "いう", "うえ"]);
    a[1].readings.push({
      ...a[1].readings[0],
      id: "known-alt",
      kana: "あい",
      kind: "wordplay",
      priority: 1,
    });
    const p = { ...initial(a), discovered: ["known-alt"] };
    for (const difficulty of ["easy", "normal", "hard"] as const)
      expect(chooseCpu(a, p, difficulty, "discovered").move?.reading.kind).toBe(
        "basic",
      );
    expect(
      chooseCpu(
        a,
        { ...p, usedIds: [a[0].id], usedWords: ["あお"] },
        "hard",
        "discovered",
      ).move?.reading.id,
    ).toBe("known-alt");
  });
});
