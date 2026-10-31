import type {
  GameState,
  Points,
  RankEntry,
  ReadingKind,
  RoundScore,
} from "./types";
import { timedMode } from "./refill";
export const emptyScore = (): RoundScore => ({
  points: 0,
  panels: 0,
  alternatives: 0,
  elapsedMs: 0,
});
// Current-board scoring stays separate so saves and replays never double count a carry.
export function totalScore(
  s: Pick<GameState, "score" | "carriedScore">,
): RoundScore {
  const current = s.score ?? emptyScore(),
    carry = s.carriedScore ?? emptyScore();
  return {
    points: carry.points + current.points,
    panels: carry.panels + current.panels,
    alternatives: carry.alternatives + current.alternatives,
    elapsedMs: carry.elapsedMs + current.elapsedMs,
  };
}
// Earlier race saves did not award CPU points; recover their base/alternate awards.
export function cpuRoundScore(
  s: Pick<GameState, "cpuScore" | "moves">,
): RoundScore {
  if (s.cpuScore) return s.cpuScore;
  return s.moves
    .filter((m) => m.actor === "cpu" && m.tail !== "ん")
    .reduce((score, move) => {
      const points = move.points ?? answerPoints(move.kind, 0, 45, false);
      return {
        points: score.points + points.total,
        panels: score.panels + 1,
        alternatives: score.alternatives + Number(move.kind !== "basic"),
        elapsedMs: 0,
      };
    }, emptyScore());
}
export function scoreHelp(
  s: Pick<GameState, "hintUsed" | "answerReferenced" | "scoreHelp">,
): "clean" | "hint" | "reference" {
  return s.answerReferenced || s.scoreHelp === "reference"
    ? "reference"
    : s.hintUsed || s.scoreHelp === "hint"
      ? "hint"
      : "clean";
}
export function answerPoints(
  kind: ReadingKind,
  elapsedMs: number,
  limitSeconds: number,
  timed: boolean,
): Points {
  const base = 100,
    alternative = kind === "basic" ? 0 : 150;
  const speed = timed
    ? Math.floor(
        100 * Math.max(0, 1 - Math.max(0, elapsedMs) / (limitSeconds * 1000)),
      )
    : 0;
  return { base, alternative, speed, total: base + alternative + speed };
}
export function scoreKey(
  s: Pick<
    GameState,
    "settings" | "hintUsed" | "answerReferenced" | "replay" | "scoreHelp"
  >,
): string {
  return `chain-v1:${s.settings.opponent ?? "turns"}:${s.settings.mode}:${s.settings.difficulty}:${timedMode(s.settings.mode) ? s.settings.seconds : "untimed"}:${scoreHelp(s)}:${s.replay ? "replay" : "fresh"}`;
}
export function rankRound(s: GameState): RankEntry[] {
  if (!timedMode(s.settings.mode)) return s.stats.rankings ?? [];
  const key = scoreKey(s),
    score = totalScore(s);
  const id = `${s.seed}:${s.scoreStartRound ?? s.round}:${key}`;
  const previous = s.stats.rankings ?? [];
  const entry = { ...score, id, key, round: s.round, seed: s.seed };
  const same = previous.filter((r) => r.key === key && r.id !== id);
  const old = previous.find((r) => r.id === id);
  if (score.panels === 0) return previous;
  same.push(old && old.points >= entry.points ? old : entry);
  same.sort(
    (a, b) =>
      b.points - a.points ||
      b.panels - a.panels ||
      a.elapsedMs - b.elapsedMs ||
      a.id.localeCompare(b.id),
  );
  return [...same.slice(0, 10), ...previous.filter((r) => r.key !== key)].slice(
    0,
    200,
  );
}
