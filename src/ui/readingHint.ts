import { normalizeReading } from "../game/normalization";
import type { Reading } from "../game/types";

const labels: Record<Reading["kind"], string> = {
  basic: "絵の名前",
  synonym: "別の呼び名",
  part: "絵の一部分",
  action: "動作",
  scene: "場面",
  category: "仲間の名前",
  wordplay: "見立て・ことば遊び",
};

// Reveal the ending, which the current head does not already give away.
// Short words can become deducible; the third hint still gives the explicit answer.
export function readingHint(reading: Reading): string {
  const kana = [...normalizeReading(reading.kana)];
  let last = kana.length - 1;
  while (last > 0 && kana[last] === "ー") last--;
  const masked = kana
    .map((c, i) =>
      i === last || (i === 0 && kana.length > 2) || i > last ? c : "？",
    )
    .join("");
  return `${labels[reading.kind]}・${kana.length}文字「${masked}」`;
}
