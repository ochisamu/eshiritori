export type Difficulty = "easy" | "normal" | "hard";
export type Mode =
  "standard" | "refill" | "refillPractice" | "practice" | "accessible";
export type Actor = "player" | "cpu";
export type Phase =
  | "title"
  | "loadingRound"
  | "playerTurn"
  | "cpuThinking"
  | "resolvingMove"
  | "rescuing"
  | "roundResult"
  | "paused"
  | "recoverableError"
  | "finishedSession";
export type ReadingKind =
  "basic" | "synonym" | "part" | "action" | "scene" | "category" | "wordplay";
export interface Reading {
  difficulty?: "common" | "additional" | "advanced";
  id: string;
  display: string;
  kana: string;
  kind: ReadingKind;
  priority: number;
  explanation: string;
  evidence: string;
  hints: [string, string, string];
  aliases: string[];
  reviewStatus: "approved" | "draft";
  element?: { x: number; y: number; w: number; h: number };
}
export interface Asset {
  difficulty?: "common" | "advanced";
  id: string;
  conceptKey: string;
  category: string;
  description: string;
  image: string;
  thumbnail?: string;
  preview?: string;
  detail: string;
  readings: Reading[];
  status: "approved" | "provisional";
  sourceSize: number;
}
export type OpponentMode = "turns" | "solo" | "race";
export interface Settings {
  opponent?: OpponentMode;
  difficulty: Difficulty;
  mode: Mode;
  muted: boolean;
  reducedMotion: boolean;
  seconds: number;
  tutorialSeen: boolean;
}
export interface Points {
  base: number;
  alternative: number;
  speed: number;
  total: number;
}
export interface RoundScore {
  points: number;
  panels: number;
  alternatives: number;
  elapsedMs: number;
}
export interface RankEntry extends RoundScore {
  id: string;
  key: string;
  round: number;
  seed: string;
}
export interface Move {
  points?: Points;
  discovery?: "new" | "complete";
  id: string;
  assetId: string;
  readingId: string;
  word: string;
  actor: Actor;
  explanation: string;
  kind: ReadingKind;
  head: string;
  tail: string;
}
export interface Board {
  opening?: { policy: "cpu-random-v1"; assetId: string; readingId: string };
  reserve?: string[];
  fallbackFor?: { difficulty: Difficulty; parity: number };
  cpuVersion?: string;
  initialDiscovered?: string[];
  ids: string[];
  head: string;
  seed: string;
  version: string;
  fallback: boolean;
  proof?: {
    path: string[];
    reachable: number;
    branches: number;
    playerWin: string[];
    states: number;
    quality?: { samples: number; meanTurns: number; shortGames: number };
  };
}
export interface Stats {
  rankings?: RankEntry[];
  played: number;
  wins: number;
  streak: number;
  best: number;
  byMode: Record<
    string,
    { played: number; wins: number; streak?: number; best?: number }
  >;
}
export interface GameState {
  rulesVersion?: string;
  score?: RoundScore;
  carriedScore?: RoundScore;
  cpuScore?: RoundScore;
  scoreStartRound?: number;
  scoreHelp?: "clean" | "hint" | "reference";
  turnElapsedMs?: number;
  rescue?: { from: string; to: string; remaining: number; count: number };
  replay?: boolean;
  replayDiscovery?: string[];
  schema: 1;
  contentVersion: string;
  phase: Phase;
  resumePhase?: Phase;
  settings: Settings;
  seed: string;
  round: number;
  board: Board | null;
  head: string;
  actor: Actor;
  remaining: number;
  cpuRemaining: number;
  moves: Move[];
  discovered: string[];
  mistakes: string[];
  hintLevel: number;
  hintUsed: number;
  answerReferenced: boolean;
  message: string;
  lastMove: Move | null;
  winner: Actor | null;
  reason: string;
  stats: Stats;
  recentBoards: Board[];
  error: string | null;
}
export interface ExecutableMove {
  assetId: string;
  reading: Reading;
  explicit: boolean;
}
