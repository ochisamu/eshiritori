import { SUPPORTED_CPU_VERSIONS } from "../game/cpu";
import type { GameState } from "../game/types";
import { CONTENT_VERSION, initialState } from "../game/state";
import { BOARD_SIZE, RULES_VERSION } from "../game/config";
import { totalScore, cpuRoundScore } from "../game/scoring";
import { MAX_ROUND_MOVES, REFILL_COUNTS, refillMode } from "../game/refill";
import migrationData from "../generated/reading-migrations.json" with { type: "json" };
const migrations = migrationData as Record<string, string>;
function migrateReadingId(id: string): string {
  let current = id;
  for (let i = 0; i < 8 && migrations[current]; i++) {
    const next = migrations[current];
    if (next === current) break;
    current = next;
  }
  return current;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const SAVE_KEY = "eshiritori.save.v1";
const phases = [
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
];
const integer = (n: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= max;
const text = (v: unknown, max = 1000) =>
  typeof v === "string" && v.length <= max;
const strings = (v: unknown, max: number) =>
  Array.isArray(v) && v.length <= max && v.every((s) => text(s, 250));
function validScore(
  v: NonNullable<GameState["score"]>,
  maxPanels = Number.MAX_SAFE_INTEGER,
): boolean {
  return (
    !!v &&
    integer(v.points) &&
    integer(v.panels, maxPanels) &&
    integer(v.alternatives, maxPanels) &&
    v.alternatives <= v.panels &&
    Number.isFinite(v.elapsedMs) &&
    v.elapsedMs >= 0
  );
}
function validMove(m: GameState["lastMove"]): boolean {
  return (
    !!m &&
    (m.points === undefined ||
      (integer(m.points.base, 100) &&
        integer(m.points.alternative, 150) &&
        integer(m.points.speed, 100) &&
        m.points.total ===
          m.points.base + m.points.alternative + m.points.speed)) &&
    (m.discovery === undefined || ["new", "complete"].includes(m.discovery)) &&
    text(m.id, 250) &&
    text(m.assetId, 100) &&
    text(m.readingId, 150) &&
    text(m.word, 32) &&
    text(m.explanation, 500) &&
    text(m.head, 2) &&
    text(m.tail, 2) &&
    ["player", "cpu"].includes(m.actor) &&
    [
      "basic",
      "synonym",
      "part",
      "action",
      "scene",
      "category",
      "wordplay",
    ].includes(m.kind)
  );
}
function validBoard(b: GameState["board"]): boolean {
  return (
    !!b &&
    strings(b.ids, BOARD_SIZE) &&
    [16, BOARD_SIZE].includes(b.ids.length) &&
    new Set(b.ids).size === b.ids.length &&
    text(b.head, 2) &&
    !!b.head &&
    text(b.seed, 250) &&
    text(b.version, 150) &&
    typeof b.fallback === "boolean" &&
    (b.opening === undefined ||
      (b.opening.policy === "cpu-random-v1" &&
        b.ids.includes(b.opening.assetId) &&
        text(b.opening.readingId, 150))) &&
    (b.reserve === undefined ||
      (strings(b.reserve, 48) &&
        new Set([...b.ids, ...b.reserve]).size ===
          b.ids.length + b.reserve.length)) &&
    (!b.initialDiscovered || strings(b.initialDiscovered, 100000)) &&
    (!b.cpuVersion || SUPPORTED_CPU_VERSIONS.includes(b.cpuVersion))
  );
}
export function validSave(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const s = value as GameState;
  return (
    s.schema === 1 &&
    (s.score === undefined || validScore(s.score, 72)) &&
    (s.cpuScore === undefined || validScore(s.cpuScore, 72)) &&
    (s.carriedScore === undefined || validScore(s.carriedScore)) &&
    validScore(totalScore(s)) &&
    (s.scoreStartRound === undefined ||
      (integer(s.scoreStartRound) && s.scoreStartRound <= s.round)) &&
    (s.scoreHelp === undefined ||
      ["clean", "hint", "reference"].includes(s.scoreHelp)) &&
    (s.turnElapsedMs === undefined ||
      (Number.isFinite(s.turnElapsedMs) && s.turnElapsedMs >= 0)) &&
    (s.rescue === undefined ||
      (text(s.rescue.from, 2) &&
        text(s.rescue.to, 2) &&
        Number.isFinite(s.rescue.remaining) &&
        s.rescue.remaining >= 0 &&
        s.rescue.remaining <= 1500 &&
        integer(s.rescue.count))) &&
    (s.phase !== "rescuing" || !!s.rescue) &&
    (s.resumePhase !== "rescuing" || !!s.rescue) &&
    (s.stats?.rankings === undefined ||
      (Array.isArray(s.stats.rankings) &&
        s.stats.rankings.length <= 200 &&
        s.stats.rankings.every(
          (r) =>
            validScore(r) &&
            text(r.id, 600) &&
            text(r.key, 200) &&
            integer(r.round) &&
            text(r.seed, 250),
        ))) &&
    (s.rulesVersion === undefined || text(s.rulesVersion, 150)) &&
    (s.replay === undefined || typeof s.replay === "boolean") &&
    (s.replayDiscovery === undefined || strings(s.replayDiscovery, 100000)) &&
    text(s.seed, 250) &&
    text(s.contentVersion, 150) &&
    Number.isSafeInteger(s.round) &&
    s.round >= 0 &&
    Number.isFinite(s.remaining) &&
    s.remaining >= 0 &&
    ["player", "cpu"].includes(s.actor) &&
    text(s.head, 2) &&
    Number.isFinite(s.cpuRemaining) &&
    s.cpuRemaining >= 0 &&
    s.cpuRemaining <= 10000 &&
    Array.isArray(s.moves) &&
    s.moves.every(validMove) &&
    s.moves.length <=
      (s.board?.reserve ? BOARD_SIZE + s.board.reserve.length : BOARD_SIZE) &&
    s.moves.length <= MAX_ROUND_MOVES &&
    new Set(s.moves.map((m) => m.id)).size === s.moves.length &&
    strings(s.discovered, 100000) &&
    strings(s.mistakes, BOARD_SIZE) &&
    integer(s.hintLevel, 3) &&
    integer(s.hintUsed, 3) &&
    typeof s.answerReferenced === "boolean" &&
    text(s.message) &&
    text(s.reason) &&
    (s.error === null || text(s.error)) &&
    (s.winner === null || ["player", "cpu"].includes(s.winner)) &&
    (s.lastMove === null || validMove(s.lastMove)) &&
    Array.isArray(s.recentBoards) &&
    s.recentBoards.length <= 100 &&
    s.recentBoards.every(validBoard) &&
    !!s.stats &&
    integer(s.stats.played) &&
    integer(s.stats.wins) &&
    s.stats.wins <= s.stats.played &&
    integer(s.stats.streak) &&
    integer(s.stats.best) &&
    !!s.stats.byMode &&
    typeof s.stats.byMode === "object" &&
    Object.keys(s.stats.byMode).length <= 1000 &&
    Object.values(s.stats.byMode).every(
      (v) =>
        !!v &&
        integer(v.played) &&
        integer(v.wins) &&
        v.wins <= v.played &&
        (v.streak === undefined || integer(v.streak)) &&
        (v.best === undefined || integer(v.best)),
    ) &&
    !!s.settings &&
    (s.settings.opponent === undefined ||
      ["turns", "solo", "race"].includes(s.settings.opponent)) &&
    ["easy", "normal", "hard"].includes(s.settings.difficulty) &&
    ["standard", "refill", "refillPractice", "practice", "accessible"].includes(
      s.settings.mode,
    ) &&
    (!s.board ||
      (refillMode(s.settings.mode)
        ? s.board.reserve?.length === REFILL_COUNTS[s.settings.difficulty]
        : s.board.reserve === undefined)) &&
    integer(s.settings.seconds, 3600) &&
    s.settings.seconds > 0 &&
    typeof s.settings.muted === "boolean" &&
    typeof s.settings.reducedMotion === "boolean" &&
    typeof s.settings.tutorialSeen === "boolean" &&
    phases.includes(s.phase) &&
    (!s.resumePhase ||
      [
        "loadingRound",
        "playerTurn",
        "cpuThinking",
        "resolvingMove",
        "rescuing",
      ].includes(s.resumePhase)) &&
    (s.phase !== "paused" || !!s.resumePhase) &&
    (s.board !== null ||
      ![
        "playerTurn",
        "cpuThinking",
        "resolvingMove",
        "rescuing",
        "roundResult",
      ].includes(s.phase === "paused" ? s.resumePhase! : s.phase)) &&
    (s.board === null || validBoard(s.board))
  );
}
export function saveGame(storage: StorageLike, s: GameState): string | null {
  try {
    const old = storage.getItem(SAVE_KEY);
    if (old) {
      let healthy = false;
      try {
        healthy = validSave(JSON.parse(old));
      } catch {
        /* keep last healthy backup */
      }
      if (healthy) storage.setItem(`${SAVE_KEY}.backup`, old);
      else {
        let preserved = false;
        for (let i = 0; i < 20; i++) {
          const key = `${SAVE_KEY}.damaged${i ? "." + i : ""}`,
            existing = storage.getItem(key);
          if (existing === old) {
            preserved = true;
            break;
          }
          if (existing === null) {
            storage.setItem(key, old);
            preserved = true;
            break;
          }
        }
        if (!preserved)
          return "元の保存データを保護するため、新しい保存を止めています。この画面を閉じるまで遊べます。";
      }
    }
    storage.setItem(`${SAVE_KEY}.pending`, JSON.stringify(s));
    storage.setItem(SAVE_KEY, JSON.stringify(s));
    return null;
  } catch {
    return "この環境では保存できません。この画面を閉じるまで遊べます。";
  }
}
export function loadGame(
  storage: StorageLike,
  assetIds: string[],
  readingIds: string[],
): { state: GameState | null; warning: string | null } {
  let hadData = false;
  for (const suffix of ["", ".backup", ".pending"]) {
    try {
      const raw = storage.getItem(SAVE_KEY + suffix);
      if (!raw) continue;
      hadData = true;
      const data: unknown = JSON.parse(raw);
      if (!validSave(data)) continue;
      const s = data;
      s.discovered = [...new Set(s.discovered.map(migrateReadingId))];
      if (s.replayDiscovery)
        s.replayDiscovery = [
          ...new Set(s.replayDiscovery.map(migrateReadingId)),
        ].filter((id) => readingIds.includes(id));
      if (s.board?.initialDiscovered)
        s.board.initialDiscovered = [
          ...new Set(s.board.initialDiscovered.map(migrateReadingId)),
        ];
      s.moves = s.moves.map((m) => ({
        ...m,
        readingId: migrateReadingId(m.readingId),
      }));
      if (s.lastMove)
        s.lastMove = {
          ...s.lastMove,
          readingId: migrateReadingId(s.lastMove.readingId),
        };
      const missing =
        (s.board && s.board.ids.length !== BOARD_SIZE) ||
        s.board?.ids.some((id) => !assetIds.includes(id)) ||
        s.board?.reserve?.some((id) => !assetIds.includes(id)) ||
        s.moves.some(
          (m) =>
            !readingIds.includes(m.readingId) ||
            !assetIds.includes(m.assetId) ||
            !m.readingId.startsWith(m.assetId + "-r-"),
        ) ||
        (s.lastMove &&
          (!readingIds.includes(s.lastMove.readingId) ||
            !s.lastMove.readingId.startsWith(s.lastMove.assetId + "-r-")));
      if (missing) {
        return {
          state: {
            ...initialState(),
            settings: s.settings,
            seed: s.seed,
            stats: s.stats,
            discovered: s.discovered.filter((id) => readingIds.includes(id)),
          },
          warning:
            "素材の更新があり、成績と発見を保ってタイトルへ戻りました。進行中の盤面は再配布します。",
        };
      }
      const updated = s.contentVersion !== CONTENT_VERSION;
      const rulesUpdated = s.rulesVersion !== RULES_VERSION;
      if (s.cpuScore === undefined && s.settings.opponent === "race")
        s.cpuScore = cpuRoundScore(s);
      s.rulesVersion = RULES_VERSION;
      if (s.scoreStartRound === undefined) s.scoreStartRound = s.round;
      if (updated) {
        s.contentVersion = CONTENT_VERSION;
        s.discovered = s.discovered.filter((id) => readingIds.includes(id));
        if (s.board?.initialDiscovered)
          s.board.initialDiscovered = s.board.initialDiscovered.filter((id) =>
            readingIds.includes(id),
          );
      }
      if (
        [
          "playerTurn",
          "cpuThinking",
          "resolvingMove",
          "rescuing",
          "loadingRound",
        ].includes(s.phase)
      ) {
        s.resumePhase = s.phase;
        s.phase = "paused";
      }
      return {
        state: s,
        warning: suffix
          ? "前の正常な保存データから復旧しました。"
          : rulesUpdated
            ? "連勝と早押しの得点ルールを更新しました。時間なしは練習になり、ランキング対象外です。盤面・成績・図鑑は引き継いでいます。"
            : updated
              ? "素材の更新を反映しました。盤面と成績を引き継ぎました。"
              : null,
      };
    } catch {
      hadData = true;
    }
  }
  return {
    state: null,
    warning: hadData
      ? "保存データを読み出せませんでした。既存データを残して新しいセッションを開きます。"
      : null,
  };
}
