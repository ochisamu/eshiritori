export type Chatter = "quiet" | "normal" | "chatty";
export type VoiceMood =
  "watching" | "thinking" | "surprised" | "happy" | "resting";
export type HintMode = "open" | "repeat" | "next" | "answer";
export interface VoiceStamp {
  gameId: string;
  boardEpoch: string;
  revision: number;
  turnId: string;
}
export interface GameVoiceView extends VoiceStamp {
  phase: string;
  actor: "player" | "cpu";
  head: string;
  moveCount: number;
  eligible: boolean;
  cards: {
    id: string;
    slot: number;
    description: string;
    available: boolean;
  }[];
  selectedCardId?: string;
  lastMove?: {
    id: string;
    actor: "player" | "cpu";
    assetId: string;
    display: string;
    kana: string;
    kind: string;
    explanation: string;
    discovery?: string;
  };
  hint: { level: number; used: number; canRequest: boolean };
  opponent: { variant: string; searchStage?: "scan" | "compare" | "locked" };
  result?: { winner: "player" | "cpu" | null; reason: string };
}
export interface VoiceOptions {
  mic: boolean;
  output: boolean;
  captions: boolean;
  chatter: Chatter;
  decisions: boolean;
}
export const defaultVoiceOptions: VoiceOptions = {
  mic: true,
  output: true,
  captions: true,
  chatter: "normal",
  decisions: true,
};
export interface VoiceUsage {
  seconds: number | null;
  finalized: boolean;
  backend: {
    calls: number;
    input: number;
    output: number;
    cached: number;
    uncertain?: number;
  };
  decisions: {
    calls: number;
    input: number;
    output: number;
    cached: number;
    uncertain?: number;
  };
  estimatedUSD: number;
  priceDate: string;
  liveModel: string;
  backendModel: string;
  decisionsModel: string;
}
export interface VoiceOperation {
  requestId: string;
  connectionEpoch: string;
  expected: VoiceStamp;
  action: "hint" | "pause" | "resume";
  mode?: HintMode;
}
export interface VoiceOperationResult {
  requestId: string;
  connectionEpoch: string;
  status: "ok" | "stale" | "unavailable";
  view: GameVoiceView;
  hint?: {
    level: number;
    used: number;
    text: string;
    targetId?: string;
    explanation?: string;
  };
}
export type GameEventType =
  | "board.ready"
  | "cpu.search.started"
  | "cpu.move.committed"
  | "player.move.committed"
  | "reading.discovered"
  | "board.completed"
  | "selection.changed"
  | "game.paused"
  | "game.resumed";
export interface GameVoiceEvent {
  id: string;
  type: GameEventType;
}
export interface VoiceStatus {
  available: boolean;
  paired: boolean;
  busy: boolean;
  lan: boolean;
  maxSeconds: number;
  csrf?: string;
}
export function sameStamp(a: VoiceStamp, b: VoiceStamp) {
  return (
    a.gameId === b.gameId &&
    a.boardEpoch === b.boardEpoch &&
    a.revision === b.revision &&
    a.turnId === b.turnId
  );
}
