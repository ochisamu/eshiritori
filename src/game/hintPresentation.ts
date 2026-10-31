import type { Asset, GameState } from "./types";
import type { Action } from "./state";
import type { HintMode } from "../voice/protocol";
import { position } from "./state";
import { legalMoves } from "./rules";
import { readingHint } from "../ui/readingHint";
export function hintActions(s: GameState, mode: HintMode): Action[] {
  if (s.phase !== "playerTurn") return [];
  const target =
    mode === "answer"
      ? 3
      : mode === "next"
        ? Math.min(3, s.hintLevel + 1)
        : Math.max(1, s.hintLevel);
  const count = Math.min(Math.max(0, target - s.hintLevel), 3 - s.hintUsed);
  return Array.from({ length: count }, () => ({ type: "HINT" }) as Action);
}
export function hintPresentation(s: GameState, assets: readonly Asset[]) {
  if (s.phase !== "playerTurn" || s.hintLevel < 1) return undefined;
  const move = legalMoves(assets, position(s))[0];
  if (!move) return undefined;
  const asset = assets.find((a) => a.id === move.assetId)!;
  return {
    level: s.hintLevel,
    used: s.hintUsed,
    targetId: asset.id,
    ...(s.hintLevel === 3 ? { explanation: move.reading.explanation } : {}),
    text:
      s.hintLevel === 1
        ? "この絵に注目：" + asset.description
        : s.hintLevel === 2
          ? readingHint(move.reading)
          : "ひとつの答えは「" + move.reading.display + "」です。",
  };
}
