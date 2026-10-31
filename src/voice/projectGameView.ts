import type { Asset, GameState } from "../game/types";
import { boardSlots, timedMode } from "../game/refill";
import type { GameVoiceView, VoiceStamp } from "./protocol";
export function voiceEligible(s: GameState) {
  return (
    (s.settings.opponent ?? "turns") === "turns" && !timedMode(s.settings.mode)
  );
}
export function projectGameView(
  s: GameState,
  assets: readonly Asset[],
  stamp: VoiceStamp,
  variant: string,
  selected?: string,
  stage?: "scan" | "compare" | "locked",
): GameVoiceView {
  const slots = boardSlots(
    s.board,
    s.phase === "resolvingMove" ? s.moves.slice(0, -1) : s.moves,
  );
  const used = new Set(s.moves.map((m) => m.assetId));
  const last = s.lastMove;
  const reading =
    last &&
    assets
      .find((a) => a.id === last.assetId)
      ?.readings.find((r) => r.id === last.readingId);
  return {
    ...stamp,
    phase: s.phase,
    actor: s.actor,
    head: s.head,
    moveCount: s.moves.length,
    eligible: voiceEligible(s),
    cards: slots.flatMap((id, slot) => {
      const a = assets.find((a) => a.id === id);
      return a
        ? [
            {
              id: a.id,
              slot,
              description: a.description,
              available: !used.has(id),
            },
          ]
        : [];
    }),
    ...(selected && slots.includes(selected)
      ? { selectedCardId: selected }
      : {}),
    ...(last
      ? {
          lastMove: {
            id: last.id,
            actor: last.actor,
            assetId: last.assetId,
            display: reading?.display ?? last.word,
            kana: last.word,
            kind: last.kind,
            explanation: last.explanation,
            ...(last.discovery ? { discovery: last.discovery } : {}),
          },
        }
      : {}),
    hint: {
      level: s.hintLevel,
      used: s.hintUsed,
      canRequest: s.phase === "playerTurn" && s.hintUsed < 3,
    },
    opponent: {
      variant,
      ...(s.phase === "cpuThinking" && stage ? { searchStage: stage } : {}),
    },
    ...(s.phase === "roundResult"
      ? { result: { winner: s.winner, reason: s.reason } }
      : {}),
  };
}
