// Explicit, billable smoke test; never started by the game or the normal test suite.
import { LiveWS } from "openai/resources/live/ws";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadConfig, loadHostEnv } from "../server/voice/config";
import {
  OpenAILiveAdapter,
  LIVE_INSTRUCTIONS,
} from "../server/voice/openaiLiveAdapter";
loadHostEnv();
if (process.env.VOICE_TEST_BUDGET_USD !== "5")
  throw Error(
    "Set VOICE_TEST_BUDGET_USD=5 to acknowledge the authorized test budget",
  );
const config = loadConfig();
if (!config.apiKey) throw Error("Host key missing");
const adapter = new OpenAILiveAdapter(config);
const socket = new LiveWS(adapter.client, {
  maxPayload: 2 * 1024 * 1024,
  reconnect: null,
});
let usage: number | null = null,
  finalized = false,
  audioBytes = 0,
  audioPeak = 0,
  inputDeltas = 0,
  outputDeltas = 0,
  started = false;
const errors: string[] = [];
const events: Record<string, number> = {};
const begin = Date.now();
const stop = () => {
  if (started) socket.send({ type: "session.close" });
  else socket.close();
};
const hard = setTimeout(stop, 20000);
let silence: ReturnType<typeof setInterval> | undefined;
const done = new Promise<void>((resolve) => {
  socket.on("event", (event) => {
    events[event.type] = (events[event.type] ?? 0) + 1;
    if (event.type === "session.started") {
      started = true;
      silence = setInterval(
        () =>
          socket.send({
            type: "session.input_audio.append",
            audio: Buffer.alloc(4800).toString("base64"),
          }),
        100,
      );
      socket.send({
        type: "session.commentary.append",
        delegation_id: null,
        content:
          "短い日本語の挨拶を一言。この接続試験では絵しりとりを一緒に遊ぶ相手として、聞こえますかとだけ確認する。",
      });
    }
    if (event.type === "session.output_audio.delta") {
      const pcm = Buffer.from(event.delta, "base64");
      audioBytes += pcm.length;
      for (let offset = 0; offset + 1 < pcm.length; offset += 2)
        audioPeak = Math.max(audioPeak, Math.abs(pcm.readInt16LE(offset)));
    }
    if (event.type === "session.output_transcript.delta") outputDeltas++;
    if (event.type === "session.input_transcript.delta") inputDeltas++;
    if (event.type === "session.usage.updated") usage = event.usage.seconds;
    if (event.type === "session.closed") {
      usage = event.usage.seconds;
      finalized = true;
      socket.close();
      resolve();
    }
  });
  socket.on("error", (error) => {
    const code = error.error?.error?.code;
    errors.push(
      typeof code === "string" && /^[a-z_]+$/.test(code) ? code : "live_error",
    );
    if (!started) {
      socket.close();
      resolve();
    }
  });
  socket.on("close", () => resolve());
  setTimeout(() => {
    socket.close();
    resolve();
  }, 38000).unref();
});
socket.socket.on("open", () =>
  socket.send({
    type: "session.start",
    session: {
      model: config.liveModel,
      store: false,
      instructions: LIVE_INSTRUCTIONS,
      audio: {
        format: { type: "audio/pcm", rate: 24000 },
        output: { voice: config.voice },
      },
      delegation: { type: "client" },
    },
  }),
);
await done;
clearTimeout(hard);
if (silence) clearInterval(silence);
mkdirSync("reports/voice", { recursive: true });
const report = {
  started,
  finalized,
  usageSeconds: usage,
  wallSeconds: (Date.now() - begin) / 1000,
  audioBytes,
  audioPeak,
  inputDeltas,
  outputDeltas,
  events,
  errors,
  models: { live: config.liveModel },
  estimatedUSD: usage === null ? null : (usage / 60) * config.rates.liveMinute,
  priceDate: config.rates.date,
  note: "No conversation text/audio stored. Initial transport and generated greeting only; bidirectional test follows.",
};
writeFileSync(
  "reports/voice/live-smoke.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
