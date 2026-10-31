import type { Asset, Board, GameState, Settings } from "./types";
import { CONTENT_VERSION } from "./state";
import { RNG_VERSION } from "./rng";
import { SUPPORTED_GENERATOR_VERSIONS, verifyBoard } from "./boardGenerator";
import { SUPPORTED_CPU_VERSIONS, LEGACY_CPU_VERSION } from "./cpu";
import { BOARD_SIZE, RULES_VERSION } from "./config";
import { REFILL_COUNTS, refillMode } from "./refill";
export const REPLAY_RULES_VERSION = RULES_VERSION;
export interface ReplaySession {
  seed: string;
  round: number;
  settings: Settings;
  board: Board;
  recentBoards: Board[];
}
interface ReplayPayload extends ReplaySession {
  format: 1;
  content: string;
  rng: string;
  rules: string;
}
const failure = (detail: string): never => {
  throw Error(`再挑戦コードを読み込めません。${detail}`);
};
function compactBoard(b: Board): Board {
  return {
    ...(b.opening ? { opening: { ...b.opening } } : {}),
    ids: [...b.ids],
    head: b.head,
    seed: b.seed,
    version: b.version,
    cpuVersion: b.cpuVersion ?? LEGACY_CPU_VERSION,
    fallback: b.fallback,
    ...(b.reserve ? { reserve: [...b.reserve] } : {}),
  };
}
export function exportReplay(s: GameState): string {
  if (!s.board) return failure("盤面を開いてから作成してください。");
  const payload: ReplayPayload = {
    format: 1,
    content: CONTENT_VERSION,
    rng: RNG_VERSION,
    rules: REPLAY_RULES_VERSION,
    seed: s.seed,
    round: s.round,
    settings: s.settings,
    board: {
      ...compactBoard(s.board),
      initialDiscovered: [
        ...(s.board.initialDiscovered ?? s.replayDiscovery ?? s.discovered),
      ],
    },
    recentBoards: s.recentBoards.map(compactBoard),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return (
    "ESR1-" +
    btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
  );
}
export function importReplay(
  code: string,
  assets: readonly Asset[],
): ReplaySession {
  if (code.length > 500000) return failure("コードが長すぎます。");
  const clean = code.trim();
  if (!/^ESR1-[A-Za-z0-9_-]+$/.test(clean))
    return failure("形式を確認してください。");
  let p: ReplayPayload;
  try {
    const binary = atob(
      clean.slice(5).replaceAll("-", "+").replaceAll("_", "/"),
    );
    p = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(binary, (c) => c.charCodeAt(0)),
      ),
    );
  } catch {
    return failure("途中で欠けているか、形式が違います。");
  }
  if (
    !p ||
    p.format !== 1 ||
    ![REPLAY_RULES_VERSION, "alternating-24-terminal-loss-refill-v3"].includes(
      p.rules,
    ) ||
    p.rng !== RNG_VERSION
  )
    return failure("ルールまたは乱数の版が違います。");
  if (p.content !== CONTENT_VERSION)
    return failure(
      "絵・読み辞書の版が違います。このコードを作成した版で開いてください。",
    );
  if (
    typeof p.seed !== "string" ||
    !p.seed ||
    p.seed.length > 250 ||
    !Number.isSafeInteger(p.round) ||
    p.round < 0
  )
    return failure("連戦情報が不正です。");
  const s = p.settings;
  if (
    !s ||
    (s.opponent !== undefined &&
      !["turns", "solo", "race"].includes(s.opponent)) ||
    !["easy", "normal", "hard"].includes(s.difficulty) ||
    ![
      "standard",
      "refill",
      "refillPractice",
      "practice",
      "accessible",
    ].includes(s.mode) ||
    !Number.isSafeInteger(s.seconds) ||
    s.seconds < 1 ||
    s.seconds > 3600 ||
    typeof s.muted !== "boolean" ||
    typeof s.reducedMotion !== "boolean" ||
    typeof s.tutorialSeen !== "boolean"
  )
    return failure("対戦設定が不正です。");
  const ids = new Set(assets.map((a) => a.id)),
    readings = new Set(
      assets.flatMap((a) =>
        a.readings
          .filter((r) => r.reviewStatus === "approved")
          .map((r) => r.id),
      ),
    );
  const validBoard = (b: Board): boolean =>
    !!b &&
    Array.isArray(b.ids) &&
    b.ids.length === BOARD_SIZE &&
    new Set(b.ids).size === BOARD_SIZE &&
    b.ids.every((id) => ids.has(id)) &&
    typeof b.head === "string" &&
    /^[ぁ-ゖ]$/.test(b.head) &&
    typeof b.seed === "string" &&
    b.seed.length <= 250 &&
    SUPPORTED_GENERATOR_VERSIONS.includes(b.version) &&
    SUPPORTED_CPU_VERSIONS.includes(b.cpuVersion ?? "") &&
    typeof b.fallback === "boolean" &&
    (b.opening === undefined ||
      (b.opening.policy === "cpu-random-v1" &&
        b.ids.includes(b.opening.assetId) &&
        readings.has(b.opening.readingId))) &&
    (b.reserve === undefined ||
      (Array.isArray(b.reserve) &&
        b.reserve.length <= 48 &&
        b.reserve.every((id) => ids.has(id)) &&
        new Set([...b.ids, ...b.reserve]).size ===
          b.ids.length + b.reserve.length));
  if (
    !validBoard(p.board) ||
    !Array.isArray(p.recentBoards) ||
    p.recentBoards.length > 100 ||
    !p.recentBoards.every(validBoard)
  )
    return failure("盤面または生成方式の版が違います。");
  if (
    refillMode(s.mode)
      ? p.board.reserve?.length !== REFILL_COUNTS[s.difficulty]
      : p.board.reserve !== undefined
  )
    return failure("補充札の枚数とモードが一致しません。");
  const known = p.board.initialDiscovered;
  if (
    !Array.isArray(known) ||
    known.length > readings.size ||
    new Set(known).size !== known.length ||
    !known.every((id) => readings.has(id))
  )
    return failure("発見済みの読みが不正です。");
  const board = { ...compactBoard(p.board), initialDiscovered: [...known] };
  const proof = verifyBoard(assets, board, {
    round: p.round,
    difficulty: s.difficulty,
    discovered: known,
  });
  if (!proof) return failure("盤面の成立を確認できませんでした。");
  return {
    seed: p.seed,
    round: p.round,
    settings: { ...s },
    board: { ...board, proof },
    recentBoards: p.recentBoards.map(compactBoard),
  };
}
