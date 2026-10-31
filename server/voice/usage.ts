import type { VoiceUsage } from "../../src/voice/protocol.js";
import type { VoiceConfig } from "./config.js";
type Tokens = {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
};
export class UsageBook {
  seconds: number | null = null;
  finalized = false;
  backend = { calls: 0, input: 0, output: 0, cached: 0, uncertain: 0 };
  decisions = { calls: 0, input: 0, output: 0, cached: 0, uncertain: 0 };
  private reservations = new Map<string, "backend" | "decisions">();
  private seen = new Set<string>();
  constructor(
    readonly config: VoiceConfig,
    readonly started = Date.now(),
  ) {}
  voice(seconds: number, final = false) {
    if (Number.isFinite(seconds) && seconds >= 0)
      this.seconds = Math.max(this.seconds ?? 0, seconds);
    this.finalized ||= final;
  }
  reserve(kind: "backend" | "decisions", id: string) {
    if (this.reservations.has(id) || this.seen.has(id)) return;
    this.reservations.set(id, kind);
    this[kind].calls++;
    this[kind].uncertain++;
  }
  tokens(kind: "backend" | "decisions", id: string, usage: Tokens) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    const u = this[kind];
    if (this.reservations.delete(id)) u.uncertain--;
    else u.calls++;
    u.input += usage.input_tokens ?? 0;
    u.output += usage.output_tokens ?? 0;
    u.cached += usage.input_tokens_details?.cached_tokens ?? 0;
  }
  estimate(now = Date.now()) {
    const seconds = this.finalized
      ? (this.seconds ?? 0)
      : Math.max(15, this.seconds ?? 0, (now - this.started) / 1000);
    return (
      this.reservations.size * 0.02 +
      (seconds / 60) * this.config.rates.liveMinute +
      ((this.backend.input + this.decisions.input) / 1e6) *
        this.config.rates.inputMillion +
      ((this.backend.output + this.decisions.output) / 1e6) *
        this.config.rates.outputMillion
    );
  }
  snapshot(): VoiceUsage {
    return {
      seconds: this.seconds,
      finalized: this.finalized,
      backend: { ...this.backend },
      decisions: { ...this.decisions },
      estimatedUSD: this.estimate(),
      priceDate: this.config.rates.date,
      liveModel: this.config.liveModel,
      backendModel: this.config.backendModel,
      decisionsModel: this.config.decisionsModel,
    };
  }
}
