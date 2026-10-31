const small: Record<string, string> = Object.fromEntries(
  [..."ぁぃぅぇぉゃゅょっゎ"].map((s, i) => [
    s,
    [..."あいうえおやゆよつわ"][i],
  ]),
);
export function normalizeReading(
  value: string,
  aliases: Record<string, string> = {},
): string {
  if (value.length > 256) throw new Error("32かな以内で入力してください");
  let s = value
    .normalize("NFKC")
    .trim()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .normalize("NFC");
  s = aliases[s] ?? s;
  if (!s || s.length > 32 || !/^[ぁ-ゔー]+$/.test(s) || s.startsWith("ー"))
    throw new Error("ひらがな・カタカナで入力してください");
  return s;
}
export function headKana(value: string): string {
  const s = normalizeReading(value);
  return small[s[0]] ?? s[0];
}
export function tailKana(value: string): string {
  const s = normalizeReading(value).replace(/ー+$/, "");
  return small[s.at(-1)!] ?? s.at(-1)!;
}
