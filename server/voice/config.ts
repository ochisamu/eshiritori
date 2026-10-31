import { existsSync } from "node:fs";
import { resolve } from "node:path";
export interface VoiceConfig {
  apiKey: string;
  liveModel: string;
  backendModel: string;
  decisionsModel: string;
  voice: string;
  port: number;
  lan: boolean;
  cert?: string;
  key?: string;
  origins: string[];
  maxSeconds: number;
  idleSeconds: number;
  maxBackendMinute: number;
  maxBackend: number;
  maxDecisions: number;
  decisions: boolean;
  budget: number;
  rates: {
    date: string;
    liveMinute: number;
    inputMillion: number;
    outputMillion: number;
  };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): VoiceConfig {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isFinite(n) || n < min || n > max)
      throw Error("Invalid setting: " + key);
    return n;
  };
  const port = number("VOICE_PORT", 4174, 1024, 65535);
  const lan = env.VOICE_LAN === "true";
  const origins = (
    env.VOICE_ALLOWED_ORIGINS ??
    "http://localhost:" + port + ",http://127.0.0.1:" + port
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      !["http:", "https:"].includes(url.protocol)
    )
      throw Error("Invalid origin setting");
    if (lan && url.protocol !== "https:")
      throw Error("LAN requires HTTPS origins");
    if (!lan && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      throw Error("Local mode requires loopback origins");
  }
  if (lan && (!env.VOICE_TLS_CERT || !env.VOICE_TLS_KEY))
    throw Error("LAN requires VOICE_TLS_CERT and VOICE_TLS_KEY");
  return {
    apiKey: env.OPENAI_API_KEY ?? "",
    liveModel: env.OPENAI_LIVE_MODEL ?? "gpt-live-1",
    backendModel: env.OPENAI_BACKEND_MODEL ?? "gpt-6-luna",
    decisionsModel: env.OPENAI_DECISIONS_MODEL ?? "gpt-6-luna",
    voice: env.OPENAI_LIVE_VOICE ?? "marin",
    port,
    lan,
    origins,
    cert: env.VOICE_TLS_CERT && resolve(env.VOICE_TLS_CERT),
    key: env.VOICE_TLS_KEY && resolve(env.VOICE_TLS_KEY),
    maxSeconds: number("VOICE_MAX_SESSION_SECONDS", 900, 15, 3600),
    idleSeconds: number("VOICE_IDLE_CLOSE_SECONDS", 60, 15, 600),
    maxBackendMinute: number("VOICE_MAX_BACKEND_CALLS_PER_MINUTE", 12, 1, 60),
    maxBackend: number("VOICE_MAX_BACKEND_CALLS_PER_SESSION", 120, 1, 500),
    maxDecisions: number("VOICE_MAX_DECISIONS_CALLS_PER_SESSION", 300, 1, 1000),
    decisions: env.VOICE_DECISIONS_ENABLED !== "false",
    budget: number("VOICE_BUDGET_USD", 1, 0.02, 100),
    rates: {
      date: env.VOICE_PRICE_DATE ?? "2026-10-31",
      liveMinute: number("VOICE_PRICE_LIVE_MINUTE", 0.05, 0, 100),
      inputMillion: number("VOICE_PRICE_INPUT_MILLION", 0.1, 0, 1000),
      outputMillion: number("VOICE_PRICE_OUTPUT_MILLION", 0.5, 0, 1000),
    },
  };
}
export function loadHostEnv() {
  if (existsSync(".env")) process.loadEnvFile(".env");
}
