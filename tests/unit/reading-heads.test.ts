import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { activeAssets as assets } from "../../src/game/content";
import { validateDistinctReadingHeads } from "../../src/game/contentSchema";
import { headKana } from "../../src/game/normalization";
import { initialState, reducer } from "../../src/game/state";
import { collectionIndex } from "../../src/ui/collection";
import { loadGame, SAVE_KEY } from "../../src/storage/save";
import type { Asset } from "../../src/game/types";
const words = (id: string) =>
  assets.find((a) => a.id === id)!.readings.map((r) => r.kana);
describe("one approved reading per panel initial", () => {
  it("covers every released panel with distinct normalized heads and replenishes the removed vocabulary", () => {
    for (const a of assets)
      expect(new Set(a.readings.map((r) => headKana(r.kana))).size, a.id).toBe(
        a.readings.length,
      );
    expect(assets).toHaveLength(1024);
    expect(assets.flatMap((a) => a.readings).length).toBeGreaterThanOrEqual(
      3122,
    );
    expect(words("card-0057")).toContain("にぎりめし");
    expect(words("card-0057")).not.toContain("おむすび");
    expect(words("card-0112")).toContain("ばっくぱっく");
    expect(words("card-0112")).not.toContain("りゅっくさっく");
    expect(words("card-0648")).toContain("きもの");
    expect(words("card-0648")).not.toContain("たま");
  });
  it("rejects two different readings with the same initial even when their endings differ", () => {
    const asset = {
      ...assets[0],
      readings: [
        { ...assets[0].readings[0], kana: "きゃべつ" },
        { ...assets[0].readings[1], kana: "きゅうり" },
      ],
    };
    expect(() => validateDistinctReadingHeads([asset])).toThrow(
      "Duplicate reading head",
    );
    const small = {
      ...asset,
      readings: asset.readings.map((r, i) => ({
        ...r,
        kana: i ? "やく" : "ゃく",
      })),
    };
    expect(() => validateDistinctReadingHeads([small])).toThrow(
      "Duplicate reading head",
    );
  });
  it("allows the same initial on different panels and preserves voiced kana as separate game heads", () => {
    const a = {
      ...assets[0],
      readings: [{ ...assets[0].readings[0], kana: "かさ" }],
    };
    const b = {
      ...assets[1],
      readings: [{ ...assets[1].readings[0], kana: "かめ" }],
    };
    expect(() => validateDistinctReadingHeads([a, b])).not.toThrow();
    expect(() =>
      validateDistinctReadingHeads([
        { ...a, readings: [a.readings[0], { ...a.readings[0], kana: "がま" }] },
      ]),
    ).not.toThrow();
  });
  it("does not turn a removed discovery into credit for its replacement, and recovers old rounds without losing records", () => {
    const old = JSON.parse(
      readFileSync("tests/fixtures/reading-review-before.json", "utf8"),
    ) as Asset[];
    const panel = old.find((a) => a.id === "card-0057")!;
    const removed = panel.readings.find((r) => r.kana === "おむすび")!;
    const current = assets.find((a) => a.id === panel.id)!;
    const entry = collectionIndex(assets, new Set([removed.id])).find(
      (e) => e.asset.id === panel.id,
    )!;
    expect(entry.found).toBe(0);
    let s = initialState();
    s = reducer(
      s,
      {
        type: "START",
        seed: "head-revision-save",
        settings: {
          ...s.settings,
          mode: "practice",
          opponent: "solo",
          tutorialSeen: true,
        },
      },
      old,
    );
    s = reducer(
      s,
      {
        type: "BOARD",
        board: {
          ids: [...old.slice(0, 23).map((a) => a.id), panel.id],
          head: "お",
          seed: "head-revision-save",
          version: "fixture",
          fallback: false,
        },
      },
      old,
    );
    s = reducer(s, { type: "READY" }, old);
    s = reducer(
      s,
      {
        type: "SUBMIT",
        actor: "player",
        assetId: panel.id,
        input: removed.kana,
        moveId: "old-alias",
      },
      old,
    );
    expect(s.moves).toHaveLength(1);
    s.contentVersion = "before-unique-heads";
    s.stats.played = 42;
    s.stats.wins = 20;
    s.discovered = [assets[0].readings[0].id, removed.id];
    const raw = JSON.stringify(s),
      store = {
        getItem: (k: string) => (k === SAVE_KEY ? raw : null),
        setItem: () => {
          throw Error("read only");
        },
      };
    const restored = loadGame(
      store,
      assets.map((a) => a.id),
      assets.flatMap((a) => a.readings.map((r) => r.id)),
    );
    expect(restored.state?.phase).toBe("title");
    expect(restored.state?.stats).toEqual(s.stats);
    expect(restored.state?.discovered).toEqual([assets[0].readings[0].id]);
    expect(restored.state?.discovered).not.toContain(
      current.readings.find((r) => r.kana === "にぎりめし")!.id,
    );
    expect(store.getItem(SAVE_KEY)).toBe(raw);
  });
});
