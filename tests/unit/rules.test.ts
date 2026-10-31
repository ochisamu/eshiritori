import { describe, it, expect } from "vitest";
import {
  advance,
  legalMoves,
  tapReading,
  validateMove,
  type Position,
} from "../../src/game/rules";
import { assets } from "../../src/game/content";
import type { Asset, Reading } from "../../src/game/types";
const p = (head = "か"): Position => ({
  ids: assets.map((a) => a.id),
  head,
  usedIds: [],
  usedWords: [],
  discovered: [],
});
const find = (key: string) => assets.find((a) => a.conceptKey === key)!;
describe("shared move validation", () => {
  it("tap selects fixed editorial order, including terminal choices, while CPU/hints enumerate only continuations", () => {
    const a = find("umbrella");
    expect(tapReading(a, p("か"))?.kana).toBe("かさ");
    expect(tapReading(a, p("あ"))?.kana).toBe("あまがさ");
    expect(tapReading(find("lemon"), p("れ"))?.kana).toBe("れもん");
    expect(
      legalMoves(assets, p("れ")).some((m) => m.reading.kana === "れもん"),
    ).toBe(false);
    expect(tapReading(find("lemon"), p("か"))?.kana).toBe("かんきつ");
    expect(tapReading(find('baseball-glove'),p('て'))?.kana).toBe('てぶくろ');
  });
  it("never enumerates hidden explicit readings", () => {
    const a = find("sleeping-cat");
    const pos = p("ね");
    expect(
      legalMoves(assets, pos).filter((m) => m.assetId === a.id),
    ).toHaveLength(1);
    pos.discovered = [a.readings[1].id];
    expect(
      legalMoves(assets, pos).filter((m) => m.assetId === a.id),
    ).toHaveLength(2);
    expect(tapReading(a, pos)?.kana).toBe("ねこ");
  });
  it("a known safe alternative can escape a terminal primary, but the tap never silently changes the primary name", () => {
    const lemon = find("lemon"),
      alt = {
        ...lemon.readings[0],
        id: "safe-lemonade",
        kana: "れもねーど",
        display: "れもねーど",
        kind: "synonym" as const,
      };
    const card = { ...lemon, readings: [...lemon.readings, alt] },
      pos = p("れ");
    expect(tapReading(card, pos)?.kana).toBe("れもん");
    expect(legalMoves([card], pos)).toEqual([]);
    const known = { ...pos, discovered: [alt.id] };
    expect(legalMoves([card], known)).toEqual([
      { assetId: lemon.id, reading: alt, explicit: true },
    ]);
    expect(validateMove(card, known, { readingId: alt.id })).toEqual({
      ok: true,
      reading: alt,
      terminal: false,
    });
  });
  it("revalidates explicit and typed words", () => {
    const a = find("umbrella");
    expect(validateMove(a, p(), { input: "カサ" }).ok).toBe(true);
    expect(validateMove(a, p(), { input: "かえる" }).ok).toBe(false);
    expect(validateMove(a, p(), { input: "か さ" }).ok).toBe(false);
    expect(validateMove(a, p(), { readingId: a.readings[1].id }).ok).toBe(
      false,
    );
    expect(
      validateMove(
        a,
        { ...p("あ"), discovered: [a.readings[1].id] },
        { readingId: a.readings[1].id },
      ).ok,
    ).toBe(true);
    expect(
      validateMove(a, p("あ"), { readingId: a.readings[1].id }, true).ok,
    ).toBe(true);
  });
  it("rejects reused cards/words, mismatch and absent cards; identifies a committed terminal reading", () => {
    const a = find("umbrella");
    expect(validateMove(undefined, p()).ok).toBe(false);
    expect(validateMove(a, { ...p(), ids: [] }).ok).toBe(false);
    expect(validateMove(a, { ...p(), usedIds: [a.id] }).ok).toBe(false);
    expect(
      validateMove(a, { ...p(), usedWords: ["かさ"] }, { input: "かさ" }).ok,
    ).toBe(false);
    expect(validateMove(a, p("あ"), { input: "かさ" }).ok).toBe(false);
    const terminal = validateMove(find("lemon"), p("れ"), { input: "れもん" });
    expect(terminal.ok && terminal.terminal).toBe(true);
  });
  it("aliases cannot bypass reuse", () => {
    const a: Asset = {
      ...find("apple"),
      readings: [{ ...find("apple").readings[0], aliases: ["林檎"] }],
    };
    expect(validateMove(a, p("り"), { input: "林檎" }).ok).toBe(true);
    expect(
      validateMove(a, { ...p("り"), usedWords: ["りんご"] }, { input: "林檎" })
        .ok,
    ).toBe(false);
  });
  it("stable priority across input and discovery history", () => {
    const base = find("umbrella");
    const r: Reading = {
      ...base.readings[0],
      id: "alt",
      kana: "かさね",
      priority: 0,
      kind: "synonym",
    };
    const a = { ...base, readings: [r, ...base.readings] };
    expect(tapReading(a, p())?.id).toBe(base.readings[0].id);
    const other = { ...r, kind: "basic" as const, priority: -1 };
    expect(
      tapReading({ ...a, readings: [...a.readings, other] }, p())?.id,
    ).toBe("alt");
  });
  it("advances card, normalized word and shared discoveries together", () => {
    const pos = p();
    const m = legalMoves(assets, pos)[0];
    const next = advance(pos, m);
    expect(next.usedIds).toContain(m.assetId);
    expect(next.usedWords).toContain(m.reading.kana);
    expect(next.discovered).toContain(m.reading.id);
    expect(pos.usedIds).toHaveLength(0);
    expect(
      advance({ ...pos, discovered: [m.reading.id] }, m).discovered,
    ).toHaveLength(1);
  });
});
