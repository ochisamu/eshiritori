import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { activeAssets as assets } from "../../src/game/content";
import policyData from "../../content/reading-policy.json";
import { initialState, reducer } from "../../src/game/state";
import { loadGame, SAVE_KEY, validSave } from "../../src/storage/save";
import { collectionIndex } from "../../src/ui/collection";
import type { Asset } from "../../src/game/types";
const oldAssets = JSON.parse(
  readFileSync("tests/fixtures/reading-review-before.json", "utf8"),
) as Asset[];
const ids = assets.map((a) => a.id),
  readingIds = assets.flatMap((a) => a.readings.map((r) => r.id));
const words = (id: string) =>
  assets.find((a) => a.id === id)!.readings.map((r) => r.kana);
describe("full dictionary editorial revision", () => {
  it("covers every released panel and never packages a rejected or unsigned alternative", () => {
    expect(Object.keys(policyData.panels).sort()).toEqual([...ids].sort());
    for (const a of assets) {
      const p = (
        policyData.panels as Record<
          string,
          { alternatives: string[]; additions: { kana: string }[] }
        >
      )[a.id];
      const primary = oldAssets
        .find((x) => x.id === a.id)!
        .readings.find((r) => r.kind === "basic")!;
      expect(a.readings.find((r) => r.kind === "basic")).toEqual(primary);
      expect(words(a.id).sort()).toEqual(
        [
          primary.kana,
          ...p.alternatives,
          ...p.additions.map((r) => r.kana),
        ].sort(),
      );
      expect(a.readings.every((r) => r.reviewStatus === "approved")).toBe(true);
    }
  });
  it("rejects unremarkable animal parts while retaining distinguishing ones and understandable metaphors", () => {
    expect(words("card-1005")).toEqual(["かぴばら", "おにてんじくねずみ"]);
    expect(words("card-0996")).not.toEqual(
      expect.arrayContaining(["みみ", "あし"]),
    );
    expect(words("card-0010")).toContain("みみ");
    expect(words("card-0225")).toContain("はな");
    expect(words("card-0007")).toContain("あるくおうち");
    expect(words("card-0029")).toContain("かおのまど");
    expect(words("card-0722")).toContain("ほし");
  });
  it("preserves IDs and metadata for unchanged words and gives no discovery credit to replacements", () => {
    for (const a of assets)
      for (const reading of a.readings) {
        const old = oldAssets
          .find((x) => x.id === a.id)!
          .readings.find((r) => r.kana === reading.kana);
        if (old) expect(reading).toEqual(old);
      }
    const oldKnown = oldAssets
      .find((a) => a.id === "card-1005")!
      .readings.map((r) => r.id);
    const entry = collectionIndex(assets, new Set(oldKnown)).find(
      (e) => e.asset.id === "card-1005",
    )!;
    expect(entry.found).toBe(1);
    expect(entry.complete).toBe(false);
  });
  it("preserves records and valid discoveries when an old round used a removed reading, without rewriting storage", () => {
    let s = initialState();
    s = reducer(
      s,
      {
        type: "START",
        seed: "old-review",
        settings: {
          ...s.settings,
          mode: "practice",
          opponent: "solo",
          tutorialSeen: true,
        },
      },
      oldAssets,
    );
    const capybara = oldAssets.find((a) => a.id === "card-1005")!;
    const removed = capybara.readings.find((r) => r.kana === "みみ")!;
    s = reducer(
      s,
      {
        type: "BOARD",
        board: {
          ids: [...ids.slice(0, 23), capybara.id],
          head: "み",
          seed: "old-review",
          version: "fixture",
          fallback: false,
        },
      },
      oldAssets,
    );
    s = reducer(s, { type: "READY" }, oldAssets);
    s = reducer(
      s,
      {
        type: "SUBMIT",
        actor: "player",
        assetId: capybara.id,
        input: removed.kana,
        moveId: "old-answer",
      },
      oldAssets,
    );
    expect(s.moves).toHaveLength(1);
    expect(validSave(s)).toBe(true);
    s.contentVersion = "old-editorial";
    s.stats.played = 42;
    s.stats.wins = 20;
    s.discovered = [readingIds[0], removed.id];
    const raw = JSON.stringify(s),
      storage = {
        getItem: (key: string) => (key === SAVE_KEY ? raw : null),
        setItem: () => {
          throw Error("read-only");
        },
      };
    const loaded = loadGame(storage, ids, readingIds);
    expect(loaded.state?.phase).toBe("title");
    expect(loaded.state?.stats).toEqual(s.stats);
    expect(loaded.state?.discovered).toEqual([readingIds[0]]);
    expect(loaded.warning).toContain("成績と発見");
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });
});
