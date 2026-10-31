import type { Actor, Asset, Board, GameState, Move, Settings } from "./types";
import { headKana, normalizeReading, tailKana } from "./normalization";
import { legalMoves, validateMove, type Position } from "./rules";
import contentMetadata from "../generated/version.json" with { type: "json" };
import { boardSlots, timedMode, refillMode, withReserve } from "./refill";
import { cpuThinkDuration } from "./cpuPresentation";
import { CPU_VERSION, LONG_PLAY_CPU_VERSION } from "./cpu";
import { RULES_VERSION } from "./config";
import {
  emptyScore,
  answerPoints,
  rankRound,
  totalScore,
  scoreHelp,
  cpuRoundScore,
} from "./scoring";
export const CONTENT_VERSION = contentMetadata.version;
export const defaults: Settings = {
  opponent: "turns",
  difficulty: "normal",
  mode: "standard",
  muted: false,
  reducedMotion: false,
  seconds: 45,
  tutorialSeen: false,
};
export function initialState(): GameState {
  return {
    schema: 1,
    score: emptyScore(),
    cpuScore: emptyScore(),
    scoreStartRound: 0,
    scoreHelp: "clean",
    turnElapsedMs: 0,
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
    phase: "title",
    settings: { ...defaults },
    seed: "garden-01",
    round: 0,
    board: null,
    head: "",
    actor: "player",
    remaining: 45000,
    cpuRemaining: 1400,
    moves: [],
    discovered: [],
    mistakes: [],
    hintLevel: 0,
    hintUsed: 0,
    answerReferenced: false,
    message: "絵の中に、つぎの言葉がかくれてる。",
    lastMove: null,
    winner: null,
    reason: "",
    stats: { played: 0, wins: 0, streak: 0, best: 0, byMode: {} },
    recentBoards: [],
    error: null,
  };
}
export function position(s: GameState): Position {
  return {
    ids: boardSlots(s.board, s.moves),
    ...(s.board &&
    [CPU_VERSION, LONG_PLAY_CPU_VERSION].includes(s.board.cpuVersion ?? "") &&
    s.board.reserve
      ? { reserve: s.board.reserve }
      : {}),
    head: s.head,
    usedIds: s.moves.map((m) => m.assetId),
    usedWords: s.moves.map((m) => m.word),
    discovered: [
      ...new Set([
        ...(s.board?.initialDiscovered ?? s.discovered),
        ...s.moves.map((m) => m.readingId),
      ]),
    ],
  };
}
export type Action =
  | {
      type: "IMPORT_REPLAY";
      session: Pick<
        GameState,
        "seed" | "round" | "settings" | "recentBoards"
      > & { board: Board };
    }
  | {
      type: "START";
      seed: string;
      settings: Settings;
      preserveRecent?: boolean;
    }
  | { type: "BOARD"; board: Board }
  | { type: "READY" }
  | { type: "LOAD_ERROR"; message: string }
  | { type: "RETRY_LOAD" }
  | {
      type: "SUBMIT";
      actor: Actor;
      assetId: string;
      readingId?: string;
      input?: string;
      moveId: string;
    }
  | { type: "TICK"; elapsed: number }
  | { type: "RESOLVED" }
  | { type: "PAUSE"; elapsed?: number }
  | { type: "RESUME" }
  | { type: "NEXT" }
  | { type: "REPLAY" }
  | { type: "HINT" }
  | { type: "REFERENCE" }
  | { type: "SURRENDER" }
  | { type: "TITLE" }
  | { type: "SETTINGS"; settings: Settings }
  | { type: "FINISH" };
export function recordKey(s: GameState): string {
  return `${s.settings.opponent && s.settings.opponent !== "turns" ? s.settings.opponent + ":" : ""}${s.settings.mode}:${s.settings.difficulty}:${s.settings.seconds}:${s.answerReferenced ? "reference" : s.hintUsed ? "hint" : "clean"}:${s.replay ? "replay" : "fresh"}`;
}
export function currentRecord(s: GameState) {
  return {
    ...(s.stats.byMode[recordKey(s)] ?? { played: 0, wins: 0, best: 0 }),
    streak: s.stats.streak,
  };
}
function finish(s: GameState, winner: Actor | null, reason: string): GameState {
  const won = winner === "player";
  const sessionStreak = won
    ? s.stats.streak + 1
    : winner === "cpu"
      ? 0
      : s.stats.streak;
  const key = recordKey(s);
  const previous = s.stats.byMode[key] ?? { played: 0, wins: 0 };
  const streak = won
    ? (previous.streak ?? 0) + 1
    : winner === null
      ? (previous.streak ?? 0)
      : 0;
  return {
    ...s,
    phase: "roundResult",
    rescue: undefined,
    resumePhase: undefined,
    winner,
    reason,
    message: reason,
    stats: {
      rankings: rankRound(s),
      played: s.stats.played + 1,
      wins: s.stats.wins + Number(won),
      streak: sessionStreak,
      best: Math.max(s.stats.best, sessionStreak),
      byMode: {
        ...s.stats.byMode,
        [key]: {
          played: previous.played + 1,
          wins: previous.wins + Number(won),
          streak,
          best: Math.max(previous.best ?? 0, streak),
        },
      },
    },
  };
}
function completeBoard(s: GameState, reason: string): GameState {
  if (s.settings.opponent !== "race") return finish(s, "player", reason);
  const player = s.score?.points ?? 0,
    cpu = cpuRoundScore(s).points;
  return finish(
    s,
    player > cpu ? "player" : cpu > player ? "cpu" : null,
    player === cpu
      ? "同点！ つぎの盤面で決着をつけよう。"
      : `${player > cpu ? "あなた" : "CPU"}のポイント勝ち！`,
  );
}
function noMoves(s: GameState): GameState {
  return completeBoard(s, "つながる札がなくなった！ この盤面はクリア！");
}
export function reducer(
  s: GameState,
  a: Action,
  assets: readonly Asset[],
): GameState {
  switch (a.type) {
    case "IMPORT_REPLAY":
      return reducer(
        {
          ...initialState(),
          ...a.session,
          discovered: s.discovered,
          stats: { ...s.stats, streak: 0 },
          replay: true,
          scoreStartRound: a.session.round,
          replayDiscovery: [...(a.session.board.initialDiscovered ?? [])],
          phase: "loadingRound",
        },
        { type: "BOARD", board: a.session.board },
        assets,
      );
    case "START":
      return {
        ...initialState(),
        settings: a.settings,
        seed: a.seed || "garden-01",
        recentBoards:
          a.preserveRecent === false
            ? []
            : [
                ...s.recentBoards,
                ...(s.board
                  ? [
                      {
                        ...s.board,
                        proof: undefined,
                        initialDiscovered: undefined,
                      },
                    ]
                  : []),
              ].slice(-100),
        discovered: s.discovered,
        stats: { ...s.stats, streak: 0 },
        phase: "loadingRound",
      };
    case "BOARD":
      if (s.phase !== "loadingRound") return s;
      return {
        ...s,
        board: refillMode(s.settings.mode)
          ? withReserve(a.board, s.settings.difficulty, assets)
          : a.board,
        head: a.board.head,
        score: emptyScore(),
        cpuScore: emptyScore(),
        turnElapsedMs: 0,
        moves: [],
        rescue: undefined,
        remaining: s.settings.seconds * 1000,
        actor:
          s.settings.opponent === "solo" || s.settings.opponent === "race"
            ? "player"
            : a.board.opening
              ? "cpu"
              : s.round % 2 === 0
                ? "player"
                : "cpu",
        mistakes: [],
        winner: null,
        lastMove: null,
        hintLevel: 0,
        hintUsed: 0,
        error: null,
        message: "",
      };
    case "READY":
      if (s.phase !== "loadingRound" || !s.board) return s;
      return legalMoves(assets, position(s)).length
        ? {
            ...s,
            phase: s.actor === "player" ? "playerTurn" : "cpuThinking",
            cpuRemaining: cpuThinkDuration(s),
          }
        : noMoves(s);
    case "LOAD_ERROR":
      return { ...s, phase: "recoverableError", error: a.message };
    case "RETRY_LOAD":
      if (s.phase !== "recoverableError") return s;
      return {
        ...s,
        round: s.round + 1,
        carriedScore: totalScore(s),
        score: emptyScore(),
        cpuScore: emptyScore(),
        scoreStartRound: s.scoreStartRound ?? s.round,
        scoreHelp: scoreHelp(s),
        phase: "loadingRound",
        board: null,
        error: null,
      };
    case "SUBMIT": {
      if (
        (s.phase !== "playerTurn" && s.phase !== "cpuThinking") ||
        (s.actor !== a.actor &&
          !(
            s.settings.opponent === "race" &&
            s.phase === "playerTurn" &&
            a.actor === "cpu"
          )) ||
        s.moves.some((m) => m.id === a.moveId)
      )
        return s;
      const key = `${s.round}:${s.moves.length}:${s.head}:${a.assetId}`;
      const asset = assets.find((c) => c.id === a.assetId);
      const v = validateMove(asset, position(s), a);
      if (!v.ok) {
        if (!legalMoves(assets, position(s)).length) return noMoves(s);
        if (s.mistakes.includes(key)) return s;
        const next = {
          ...s,
          remaining: timedMode(s.settings.mode)
            ? Math.max(0, s.remaining - 5000)
            : s.remaining,
          mistakes: [...s.mistakes, key],
          message: `${v.reason}　${timedMode(s.settings.mode) ? "−5秒" : "もう一度、絵を見てみよう"}`,
        };
        return next.remaining === 0 && timedMode(s.settings.mode)
          ? finish(next, a.actor === "player" ? "cpu" : "player", "時間切れ")
          : next;
      }
      const r = v.reading;
      const fresh = !s.discovered.includes(r.id);
      const complete =
        fresh &&
        asset!.readings
          .filter((reading) => reading.reviewStatus === "approved")
          .every(
            (reading) =>
              reading.id === r.id || s.discovered.includes(reading.id),
          );
      const points =
        (a.actor === "player" || s.settings.opponent === "race") && !v.terminal
          ? answerPoints(
              r.kind,
              Math.max(
                s.turnElapsedMs ?? 0,
                s.settings.seconds * 1000 - s.remaining,
              ),
              s.settings.seconds,
              timedMode(s.settings.mode),
            )
          : undefined;
      const score = s.score ?? emptyScore();
      const cpuScore = cpuRoundScore(s);
      const move: Move = {
        ...(points ? { points } : {}),
        ...(a.actor === "player" && fresh && (r.kind !== "basic" || complete)
          ? { discovery: complete ? ("complete" as const) : ("new" as const) }
          : {}),
        id: a.moveId,
        assetId: a.assetId,
        readingId: r.id,
        word: normalizeReading(r.kana),
        actor: a.actor,
        explanation: r.explanation,
        kind: r.kind,
        head: headKana(r.kana),
        tail: tailKana(r.kana),
      };
      const next = {
        ...s,
        phase: "resolvingMove" as const,
        moves: [...s.moves, move],
        cpuScore:
          points && a.actor === "cpu"
            ? {
                ...cpuScore,
                points: cpuScore.points + points.total,
                panels: cpuScore.panels + 1,
                alternatives:
                  cpuScore.alternatives + Number(r.kind !== "basic"),
              }
            : s.cpuScore,
        score:
          points && a.actor === "player"
            ? {
                ...score,
                points: score.points + points.total,
                panels: score.panels + 1,
                alternatives: score.alternatives + Number(r.kind !== "basic"),
              }
            : score,
        head: move.tail,
        lastMove: move,
        mistakes: [],
        hintLevel: 0,
        message: `${r.display}！ ${r.explanation}`,
        discovered: s.discovered.includes(r.id)
          ? s.discovered
          : [...s.discovered, r.id],
        replayDiscovery: s.replayDiscovery
          ? [...new Set([...s.replayDiscovery, r.id])]
          : undefined,
      };
      // A terminal word is a committed choice, not a wrong-answer penalty.
      // This takes precedence even over consuming the very last panel.
      if (v.terminal)
        return finish(
          next,
          a.actor === "player" ? "cpu" : "player",
          `「${r.display}」は「ん」で終わるため、${a.actor === "player" ? "あなた" : "CPU"}の負けです`,
        );
      if (
        next.moves.length ===
        s.board!.ids.length + (s.board!.reserve?.length ?? 0)
      )
        return completeBoard(next, "最後の札まで、つながった！");
      return next;
    }
    case "RESOLVED": {
      if (s.phase !== "resolvingMove") return s;
      const actor: Actor =
        s.settings.opponent === "solo" || s.settings.opponent === "race"
          ? "player"
          : s.actor === "player"
            ? "cpu"
            : "player";
      const next = {
        ...s,
        actor,
        remaining: s.settings.seconds * 1000,
        turnElapsedMs: 0,
        cpuRemaining: cpuThinkDuration(s),
        phase:
          actor === "player"
            ? ("playerTurn" as const)
            : ("cpuThinking" as const),
      };
      return actor === "cpu" || legalMoves(assets, position(next)).length
        ? next
        : noMoves(next);
    }
    case "TICK":
      // Old saves may still be inside the former reconnect animation.
      if (s.phase === "rescuing") {
        if (!Number.isFinite(a.elapsed) || a.elapsed < 0) return s;
        return noMoves({ ...s, head: s.rescue?.from ?? s.head });
      }
      if (s.phase !== "playerTurn" && s.phase !== "cpuThinking") return s;
      {
        if (!Number.isFinite(a.elapsed) || a.elapsed < 0) return s;
        if (s.actor === "player" && !legalMoves(assets, position(s)).length)
          return noMoves(s);
        const remaining = timedMode(s.settings.mode)
          ? Math.max(0, s.remaining - a.elapsed)
          : s.remaining;
        const next = {
          ...s,
          remaining,
          turnElapsedMs:
            (s.turnElapsedMs ?? 0) + (s.actor === "player" ? a.elapsed : 0),
          score:
            s.actor === "player"
              ? {
                  ...(s.score ?? emptyScore()),
                  elapsedMs: (s.score?.elapsedMs ?? 0) + a.elapsed,
                }
              : s.score,
          cpuScore:
            s.settings.opponent === "race"
              ? {
                  ...cpuRoundScore(s),
                  elapsedMs: cpuRoundScore(s).elapsedMs + a.elapsed,
                }
              : s.cpuScore,
          cpuRemaining:
            s.phase === "cpuThinking" || s.settings.opponent === "race"
              ? Math.max(0, s.cpuRemaining - a.elapsed)
              : s.cpuRemaining,
        };
        if (
          s.phase === "cpuThinking" &&
          next.cpuRemaining === 0 &&
          !legalMoves(assets, position(next)).length
        )
          return noMoves(next);
        if (s.actor === "player" && !legalMoves(assets, position(next)).length)
          return noMoves(next);
        return remaining === 0 && timedMode(s.settings.mode)
          ? finish(next, s.actor === "player" ? "cpu" : "player", "時間切れ")
          : next;
      }
    case "PAUSE":
      if (a.elapsed !== undefined) {
        const current = reducer(
          s,
          { type: "TICK", elapsed: a.elapsed },
          assets,
        );
        return reducer(current, { type: "PAUSE" }, assets);
      }
      if (
        ![
          "playerTurn",
          "cpuThinking",
          "resolvingMove",
          "rescuing",
          "loadingRound",
        ].includes(s.phase)
      )
        return s;
      return { ...s, resumePhase: s.phase, phase: "paused" };
    case "RESUME":
      if (s.phase === "paused" && s.resumePhase === "rescuing")
        return noMoves({ ...s, head: s.rescue?.from ?? s.head });
      return s.phase === "paused"
        ? { ...s, phase: s.resumePhase ?? "playerTurn", resumePhase: undefined }
        : s;
    case "NEXT":
      if (s.phase !== "roundResult") return s;
      return {
        ...s,
        round: s.round + 1,
        score: emptyScore(),
        cpuScore: emptyScore(),
        hintUsed: 0,
        hintLevel: 0,
        carriedScore: s.winner === "cpu" ? undefined : totalScore(s),
        scoreStartRound:
          s.winner === "cpu" ? s.round + 1 : (s.scoreStartRound ?? s.round),
        scoreHelp: s.winner === "cpu" ? "clean" : scoreHelp(s),
        answerReferenced: s.winner === "cpu" ? false : s.answerReferenced,
        phase: "loadingRound",
        board: null,
        recentBoards: [
          ...s.recentBoards,
          ...(s.board
            ? [{ ...s.board, initialDiscovered: undefined, proof: undefined }]
            : []),
        ].slice(-100),
      };
    case "REPLAY":
      if (s.phase !== "roundResult") return s;
      return s.board
        ? reducer(
            {
              ...s,
              replay: true,
              stats: { ...s.stats, streak: 0 },
              carriedScore: undefined,
              scoreStartRound: s.round,
              scoreHelp: "clean",
              answerReferenced: false,
              replayDiscovery: [...(s.board.initialDiscovered ?? [])],
              phase: "loadingRound",
            },
            { type: "BOARD", board: s.board },
            assets,
          )
        : s;
    case "HINT":
      return s.phase === "playerTurn" && s.hintUsed < 3
        ? { ...s, hintLevel: s.hintUsed + 1, hintUsed: s.hintUsed + 1 }
        : s;
    case "REFERENCE":
      return { ...s, answerReferenced: true };
    case "SURRENDER":
      return s.phase === "playerTurn"
        ? legalMoves(assets, position(s)).length
          ? { ...s, phase: "paused", resumePhase: "playerTurn" }
          : noMoves(s)
        : s;
    case "TITLE":
      return { ...s, phase: "title" };
    case "FINISH":
      return { ...s, phase: "finishedSession" };
    case "SETTINGS":
      return { ...s, settings: a.settings };
  }
}
