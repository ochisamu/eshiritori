import { describe, it, expect } from "vitest";
import {
  normalizeReading as n,
  headKana as h,
  tailKana as t,
} from "../../src/game/normalization";
describe("specification normalization vectors", () => {
  it.each([
    ["リンゴ", "りんご", "り", "ご"],
    [" ﾊﾞﾅﾅ ", "ばなな", "ば", "な"],
    ["コーヒー", "こーひー", "こ", "ひ"],
    ["タクシー", "たくしー", "た", "し"],
    ["キャンディー", "きゃんでぃー", "き", "い"],
    ["ちょうちょ", "ちょうちょ", "ち", "よ"],
    ["ロケット", "ろけっと", "ろ", "と"],
    ["バッグ", "ばっぐ", "ば", "ぐ"],
    ["ガラス", "がらす", "が", "す"],
    ["ペン", "ぺん", "ぺ", "ん"],
    ["ヴァイオリン", "ゔぁいおりん", "ゔ", "ん"],
    ["は\u3099なな", "ばなな", "ば", "な"],
    ["　りんご　", "りんご", "り", "ご"],
    ["あっ", "あっ", "あ", "つ"],
    ["コーヒーー", "こーひーー", "こ", "ひ"],
  ])("%s → %s %s→%s", (input, kana, head, tail) => {
    expect(n(input)).toBe(kana);
    expect(h(input)).toBe(head);
    expect(t(input)).toBe(tail);
  });
  it.each([
    "",
    "ー",
    "ーー",
    "り んご",
    "りんご!",
    "abc",
    "123",
    "ゕ",
    "ゖ",
    "🍎",
    "あ".repeat(33),
    "あ".repeat(10000),
    "か\u3099\u3099",
    "林檎",
  ])("rejects %s", (s) => expect(() => n(s)).toThrow());
  it("resolves explicit aliases without inventing words", () => {
    expect(n("林檎", { 林檎: "りんご" })).toBe("りんご");
    expect(() => n("林檎")).toThrow();
    expect(n("きゃんでぃー")).toContain("ゃ");
    expect(h("がらす")).not.toBe("か");
    expect(h("ぢ")).not.toBe(h("じ"));
    expect(h("を")).toBe("を");
  });
});
