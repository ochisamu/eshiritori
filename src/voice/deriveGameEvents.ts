import type { GameVoiceEvent, GameVoiceView, GameEventType } from "./protocol";
export function deriveGameEvents(
  before: GameVoiceView | undefined,
  after: GameVoiceView,
): GameVoiceEvent[] {
  const types: GameEventType[] = [];
  const newBoard = !before || before.boardEpoch !== after.boardEpoch;
  if (newBoard && after.cards.length && after.phase !== "loadingRound")
    types.push("board.ready");
  if (
    after.phase === "cpuThinking" &&
    (newBoard || before?.phase !== "cpuThinking")
  )
    types.push("cpu.search.started");
  if (
    after.lastMove &&
    before?.lastMove?.id !== after.lastMove.id &&
    !newBoard
  ) {
    types.push(
      after.lastMove.actor === "cpu"
        ? "cpu.move.committed"
        : "player.move.committed",
    );
    if (after.lastMove.discovery) types.push("reading.discovered");
  }
  if (after.result && (newBoard || !before?.result))
    types.push("board.completed");
  if (before && before.selectedCardId !== after.selectedCardId)
    types.push("selection.changed");
  if (after.phase === "paused" && before?.phase !== "paused")
    types.push("game.paused");
  if (before?.phase === "paused" && after.phase !== "paused")
    types.push("game.resumed");
  return types.map((type) => ({
    type,
    id: after.boardEpoch + ":" + after.revision + ":" + type,
  }));
}
