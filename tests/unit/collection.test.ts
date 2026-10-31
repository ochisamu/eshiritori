import { it, expect } from "vitest";
import { activeAssets as assets } from "../../src/game/content";
import { collectionIndex, filterCollection } from "../../src/ui/collection";
it("distinguishes missing, partial and completed pictures using approved discoveries only", () => {
  const known = new Set([
    assets[1].readings[0].id,
    ...assets[2].readings.map((r) => r.id),
    "invalid",
  ]);
  const index = collectionIndex(assets, known);
  expect(index[0].status).toBe("missing");
  expect(index[1].status).toBe("found");
  expect(index[2].status).toBe("complete");
  expect(
    filterCollection(index, "complete", "", known).map((e) => e.asset.id),
  ).toEqual([assets[2].id]);
  expect(filterCollection(index, "missing", "", known)).toHaveLength(
    assets.length - 2,
  );
  expect(filterCollection(index, "found", "", known)).toHaveLength(2);
  expect(collectionIndex(assets, new Set()).every((e) => e.found === 0)).toBe(
    true,
  );
});
it("search cannot reveal unknown words; explicit reference reveals without earning them", () => {
  const known = new Set<string>(),
    index = collectionIndex(assets, known),
    word = assets[0].readings[0].kana;
  expect(filterCollection(index, "all", word, known)).toHaveLength(0);
  expect(
    filterCollection(index, "all", word, known, true).some(
      (e) => e.asset.id === assets[0].id,
    ),
  ).toBe(true);
  expect(index[0].found).toBe(0);
  expect(index[0].complete).toBe(false);
  expect(known.size).toBe(0);
  expect(filterCollection(index, "all", "１０２４", known)[0].asset.id).toBe(
    assets[1023].id,
  );
  expect(filterCollection(index, "all", "99999", known)).toHaveLength(0);
});
it("the one-left shelf excludes untouched pictures and completed pictures", () => {
  const a = assets.find((a) => a.readings.length > 2)!;
  const known = new Set(a.readings.slice(1).map((r) => r.id));
  expect(
    filterCollection(collectionIndex(assets, known), "near", "", known).map(
      (e) => e.asset.id,
    ),
  ).toEqual([a.id]);
  known.add(a.readings[0].id);
  expect(
    filterCollection(collectionIndex(assets, known), "near", "", known),
  ).toHaveLength(0);
});
