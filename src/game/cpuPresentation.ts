import { rng, shuffle } from "./rng";
import type { GameState } from "./types";
import { boardSlots } from "./refill";

export function cpuThinkDuration(
  s: Pick<GameState, "board" | "moves" | "settings">,
): number {
  if (s.settings.opponent === "race")
    return (
      { easy: 9000, normal: 6500, hard: 4500 }[s.settings.difficulty] +
      Math.floor(rng(`${s.board?.seed}:race:${s.moves.length}`)() * 601)
    );
  const base = { easy: 2800, normal: 2500, hard: 2200 }[s.settings.difficulty];
  return (
    base + Math.floor(rng(`${s.board?.seed}:look:${s.moves.length}`)() * 601)
  );
}
export function cpuSelectionStage(
  s: Pick<GameState, "cpuRemaining">,
): "scan" | "compare" | "locked" {
  return s.cpuRemaining <= 420
    ? "locked"
    : s.cpuRemaining <= 1000
      ? "compare"
      : "scan";
}
export const RACE_APPROACH_MS = 650;
export function raceCursorProgress(remaining: number): number {
  return Math.min(1, Math.max(0, 1 - remaining / RACE_APPROACH_MS));
}
export function cpuSearchCard(
  s: GameState,
  target?: string,
): string | undefined {
  if (s.settings.opponent === "race") return;
  const available = boardSlots(s.board, s.moves).filter(
    (id) => !s.moves.some((m) => m.assetId === id),
  );
  if (!available.length) return;
  const duration = cpuThinkDuration(s);
  const elapsed = Math.max(0, duration - s.cpuRemaining);
  if (s.cpuRemaining < 420 && target) return target;
  const route = shuffle(
    available,
    rng(`${s.board?.seed}:scan:${s.moves.length}`),
  );
  if (
    s.board?.opening &&
    s.moves.length === 0 &&
    target &&
    s.cpuRemaining < 1000
  )
    return s.cpuRemaining > 700
      ? target
      : (route.find((id) => id !== target) ?? target);
  // Pause on a few pictures, retrace one step, then commit. Never mark legal cards.
  const steps = [0, 1, 2, 2, 3, 4, 3, 5, 6, 7, 7, 8];
  return route[steps[Math.floor(elapsed / 260) % steps.length] % route.length];
}
