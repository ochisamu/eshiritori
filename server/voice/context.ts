import type {
  GameVoiceView,
  GameVoiceEvent,
  VoiceMood,
} from "../../src/voice/protocol.js";
const phases = new Set([
  "title",
  "loadingRound",
  "playerTurn",
  "cpuThinking",
  "resolvingMove",
  "rescuing",
  "roundResult",
  "paused",
  "recoverableError",
  "finishedSession",
]);
const text = (value: unknown, max = 200): string => {
  if (typeof value !== "string" || value.length > max)
    throw Error("invalid_view");
  return value;
};
const num = (value: unknown, max = 100000): number => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > max
  )
    throw Error("invalid_view");
  return value;
};
const actor = (value: unknown): "player" | "cpu" => {
  if (value !== "player" && value !== "cpu") throw Error("invalid_view");
  return value;
};
export function parseView(value: unknown): GameVoiceView {
  if (!value || typeof value !== "object") throw Error("invalid_view");
  const v = value as Record<string, any>;
  if (
    !phases.has(v.phase) ||
    !Array.isArray(v.cards) ||
    v.cards.length > 24 ||
    typeof v.eligible !== "boolean"
  )
    throw Error("invalid_view");
  const view: GameVoiceView = {
    gameId: text(v.gameId, 80),
    boardEpoch: text(v.boardEpoch, 80),
    revision: num(v.revision),
    turnId: text(v.turnId, 160),
    phase: v.phase,
    actor: actor(v.actor),
    head: text(v.head, 4),
    moveCount: num(v.moveCount, 1000),
    eligible: v.eligible,
    cards: v.cards.map((a: Record<string, any>) => ({
      id: text(a.id, 80),
      slot: num(a.slot, 23),
      description: text(a.description, 300),
      available: a.available === true,
    })),
    hint: {
      level: num(v.hint?.level, 3),
      used: num(v.hint?.used, 3),
      canRequest: v.hint?.canRequest === true,
    },
    opponent: { variant: text(v.opponent?.variant, 30) },
  };
  if (new Set(view.cards.map((a) => a.id)).size !== view.cards.length)
    throw Error("invalid_view");
  if (
    v.selectedCardId !== undefined &&
    view.cards.some((a) => a.id === v.selectedCardId)
  )
    view.selectedCardId = text(v.selectedCardId, 80);
  if (["scan", "compare", "locked"].includes(v.opponent?.searchStage))
    view.opponent.searchStage = v.opponent.searchStage;
  if (v.lastMove) {
    const m = v.lastMove;
    view.lastMove = {
      id: text(m.id, 100),
      actor: actor(m.actor),
      assetId: text(m.assetId, 80),
      display: text(m.display, 100),
      kana: text(m.kana, 100),
      kind: text(m.kind, 30),
      explanation: text(m.explanation, 500),
    };
    if (["new", "complete"].includes(m.discovery))
      view.lastMove.discovery = m.discovery;
  }
  if (v.result) {
    view.result = {
      winner: v.result.winner === null ? null : actor(v.result.winner),
      reason: text(v.result.reason, 400),
    };
  }
  return view;
}
export const MOODS: VoiceMood[] = [
  "watching",
  "thinking",
  "surprised",
  "happy",
  "resting",
];
export function eventOpportunity(
  before: GameVoiceView | undefined,
  view: GameVoiceView,
): GameVoiceEvent | undefined {
  const base = view.boardEpoch + ":" + view.revision + ":";
  if (view.result && !before?.result)
    return { id: base + "complete", type: "board.completed" };
  if (view.lastMove && view.lastMove.id !== before?.lastMove?.id)
    return {
      id: base + "move",
      type: view.lastMove.discovery
        ? "reading.discovered"
        : view.lastMove.actor === "cpu"
          ? "cpu.move.committed"
          : "player.move.committed",
    };
  if (view.phase === "cpuThinking" && before?.phase !== "cpuThinking")
    return { id: base + "search", type: "cpu.search.started" };
  if (view.cards.length && (!before || view.boardEpoch !== before.boardEpoch))
    return { id: base + "board", type: "board.ready" };
}
export function contextDelta(
  before: GameVoiceView | undefined,
  view: GameVoiceView,
): string {
  const core = (v: GameVoiceView) => ({
    head: v.head,
    phase: v.phase,
    actor: v.actor,
    selected: v.selectedCardId ?? null,
    hint: v.hint,
    lastMove: v.lastMove ?? null,
    result: v.result ?? null,
  });
  const current = core(view),
    previous = before ? core(before) : undefined;
  const delta = Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) =>
        !previous ||
        JSON.stringify(previous[key as keyof typeof previous]) !==
          JSON.stringify(value),
    ),
  );
  const changed = view.cards.filter((card) => {
    const old = before?.cards.find((a) => a.slot === card.slot);
    return JSON.stringify(old) !== JSON.stringify(card);
  });
  return JSON.stringify({
    公開状態の更新: delta,
    ...(changed.length ? { 絵の変更: changed } : {}),
  });
}

export function byteChunks(value: string, max = 480): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const c of value) {
    if (Buffer.byteLength(chunk + c) > max) {
      chunks.push(chunk);
      chunk = "";
    }
    chunk += c;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
export function allowedIntent(
  text: string,
  level: number,
):
  | {
      action: "hint" | "pause" | "resume" | "stop" | "explain";
      mode?: "open" | "repeat" | "next" | "answer";
    }
  | undefined {
  const t = text.replace(/\s/g, "").replace(/ひんと/g, "ヒント");
  if (
    /(いらない|要らない|言わない|出さない|使わない|しないで|じゃなく|ではなく|やめ|不要|ヒントって|ヒントとは|ヒントの意味)/.test(
      t,
    )
  )
    return;
  if (/(会話|音声).*(終わ|終了|切って|止めて)/.test(t))
    return { action: "stop" };
  if (/(一時停止して|ポーズして|ゲームを止めて)/.test(t))
    return { action: "pause" };
  if (/(再開して|ゲームを続けて|ポーズ解除)/.test(t))
    return { action: "resume" };
  if (
    /(今|いま|直前|さっき).*(読み|言葉|答え).*(意味|理由|どういう|説明)|読み.*(意味|理由|説明)|どういう読み/.test(
      t,
    )
  )
    return { action: "explain" };
  if (/(答え|正解).*(教えて|見せて|知りたい|お願い)/.test(t))
    return { action: "hint", mode: "answer" };
  if (
    !/(考え|待って|時間|説明)/.test(t) &&
    /(もう少しヒント|もう少し教えて|もう少しお願い|^もう少し[。！!？?]*$|次のヒント|もう一段|もっとヒント)/.test(
      t,
    )
  )
    return level > 0 ? { action: "hint", mode: "next" } : undefined;
  if (
    !/(説明|遊|最初|初め)/.test(t) &&
    /(もう一度|もういちど|もっかい|繰り返して)/.test(t)
  )
    return level > 0 ? { action: "hint", mode: "repeat" } : undefined;
  if (
    /ヒント.*(ちょうだい|頂戴|ください|ほしい|欲しい|お願い|教えて|見せて)/.test(
      t,
    )
  )
    return { action: "hint", mode: "open" };
}

export function parseHintResult(value: unknown) {
  const hint = value as Record<string, unknown>;
  if (!hint || ![1, 2, 3].includes(Number(hint.level)))
    throw Error("invalid_hint");
  return {
    level: Number(hint.level),
    used: Math.max(0, Math.min(3, Number(hint.used) || 0)),
    text: String(hint.text ?? "").slice(0, 600),
    ...(typeof hint.targetId === "string"
      ? { targetId: hint.targetId.slice(0, 80) }
      : {}),
    ...(Number(hint.level) === 3 && typeof hint.explanation === "string"
      ? { explanation: hint.explanation.slice(0, 500) }
      : {}),
  };
}
