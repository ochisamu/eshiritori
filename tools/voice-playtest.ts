import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
// @ts-expect-error Shared JavaScript runtime fingerprint helper.
import { runtimeHash } from "./runtime-files.mjs";
// Explicit real-API evaluation with locally synthesized Japanese speech. No personal conversations are captured.
import { chromium, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createVoiceServer } from "../server/voice/index";
import { loadConfig, loadHostEnv } from "../server/voice/config";
import { initialState, reducer, position } from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { activeAssets as assets } from "../src/game/content";
import { chooseCpu } from "../src/game/cpu";
import { legalMoves } from "../src/game/rules";
import { tailKana } from "../src/game/normalization";
import { SAVE_KEY } from "../src/storage/save";
import type { GameState } from "../src/game/types";
const buildHash = runtimeHash();
function sourceFingerprint() {
  const folder = "dist-voice/server/voice";
  return createHash("sha256")
    .update(
      Buffer.concat(
        readdirSync(folder)
          .filter((name) => name.endsWith(".js"))
          .sort()
          .flatMap((name) => [
            Buffer.from(name),
            readFileSync(folder + "/" + name),
          ]),
      ),
    )
    .digest("hex");
}
const voiceServerHash = sourceFingerprint();
loadHostEnv();
if (process.env.VOICE_TEST_BUDGET_USD !== "5")
  throw Error("Authorized test budget acknowledgment required");
const config = loadConfig({
  ...process.env,
  VOICE_PORT: "4177",
  VOICE_ALLOWED_ORIGINS: "http://127.0.0.1:4177",
  VOICE_MAX_SESSION_SECONDS: "720",
  VOICE_BUDGET_USD: "2",
});
const app = await createVoiceServer(config);
await new Promise<void>((r) => app.server.listen(config.port, "127.0.0.1", r));
const browser = await chromium.launch({
  ignoreDefaultArgs: ["--mute-audio"],
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
let s = initialState();
s = reducer(
  s,
  {
    type: "START",
    seed: "voice-real-play-2026",
    settings: {
      ...s.settings,
      mode: "practice",
      opponent: "turns",
      tutorialSeen: true,
      muted: false,
    },
  },
  assets,
);
s = reducer(
  reducer(
    s,
    {
      type: "BOARD",
      board: generateBoard(assets, {
        seed: s.seed,
        round: 0,
        difficulty: "normal",
        discovered: [],
        cpuOpening: true,
      }),
    },
    assets,
  ),
  { type: "READY" },
  assets,
);
await context.addInitScript(
  ({ state, key }) => {
    if (!localStorage.getItem(key))
      localStorage.setItem(key, JSON.stringify(state));
    const test = ((window as any).__voiceTest = {
      assistant: 0,
      user: 0,
      moods: 0,
      operations: 0,
      playing: 0,
      audioVoiced: 0,
      audioPlayed: 0,
      audioPeak: 0,
      lastAssistant: "",
      lastUser: "",
      samples: [] as string[],
    });
    const NativeWorklet = window.AudioWorkletNode;
    (window as any).AudioWorkletNode = class extends NativeWorklet {
      constructor(
        audio: BaseAudioContext,
        name: string,
        opts?: AudioWorkletNodeOptions,
      ) {
        super(audio, name, opts);
        if (name === "eshiritori-voice-output") {
          this.port.addEventListener("message", (event) => {
            if (event.data.type === "meter") {
              test.audioVoiced = event.data.voiced;
              test.audioPlayed = event.data.played;
              test.audioPeak = event.data.peak;
            }
          });
          this.port.start();
        }
      }
    };
    const NativePeer = window.RTCPeerConnection;
    (window as any).RTCPeerConnection = class extends NativePeer {
      constructor(config?: RTCConfiguration) {
        super(config);
        (window as any).__voiceTestPeer = this;
      }
    };
    const Native = window.WebSocket;
    (window as any).WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "caption") {
              if (data.direction === "assistant") {
                test.assistant++;
                test.lastAssistant = data.text;
              } else {
                test.user++;
                test.lastUser = data.text;
              }
            }
            if (data.type === "mood" && data.mood) test.moods++;
            if (data.type === "operation") test.operations++;
          } catch {
            /* only app metadata */
          }
        });
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext(),
        dest = audio.createMediaStreamDestination(),
        silence = audio.createConstantSource();
      silence.offset.value = 0;
      silence.connect(dest);
      silence.start();
      await audio.resume();
      (window as any).__speakTest = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const buffer = await audio.decodeAudioData(bytes.buffer);
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start();
        return buffer.duration;
      };
      return dest.stream;
    };
    new MutationObserver(() => {
      if (document.querySelector(".voice-speaking")) test.playing++;
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  },
  { state: s, key: SAVE_KEY },
);
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", () => errors.push("browser_exception"));
const begin = Date.now(),
  checks: Record<string, unknown> = {},
  samples: { scenario: string; assistant: string }[] = [];
let boards = 0,
  moves = 0,
  alternative = false,
  phaseIndex = 0,
  lastPlay = 0,
  lastProgress = 0,
  usage: string | null = null;
async function saved(): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}
async function phrase(name: string) {
  const wav = readFileSync(".cache/voice/" + name + ".wav").toString("base64");
  const duration = await page.evaluate(
    async (data) => (window as any).__speakTest(data),
    wav,
  );
  await page.waitForTimeout(duration * 1000 + 2500);
}
async function waitHint(level: number, timeout = 16000) {
  await expect
    .poll(async () => (await saved()).hintLevel, { timeout })
    .toBe(level);
}
async function sample(scenario: string) {
  const text = await page.evaluate(
    () => (window as any).__voiceTest.lastAssistant as string,
  );
  if (text) samples.push({ scenario, assistant: text.slice(0, 240) });
}
try {
  await page.goto("http://127.0.0.1:4177");
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await page
    .getByLabel("ホストのターミナルに表示された接続コード")
    .fill(app.pairing.code);
  await page.getByRole("button", { name: "ペアリング", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "会話を開始", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ゲームに戻る", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () => page.locator(".voice-session-row").textContent(), {
      timeout: 30000,
    })
    .toContain("聞いています");
  await page.getByRole("button", { name: "ゲームに戻る", exact: true }).click();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await page.waitForTimeout(5000);
  await phrase("hello");
  await page.waitForTimeout(4000);
  await sample("greeting");
  await expect
    .poll(
      async () => page.evaluate(() => (window as any).__voiceTest.audioPlayed),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
  await phrase("reject");
  await page.waitForTimeout(3500);
  checks.rejectNoConsume = (await saved()).hintUsed === 0;
  await phrase("hint");
  try {
    await waitHint(1, 8000);
  } catch {
    checks.clippedShortRequestAskedForConfirmation = true;
    await phrase("confirm");
    await waitHint(1);
    await page.waitForTimeout(3500);
  }
  await sample("hint1");
  await phrase("repeat");
  await page.waitForTimeout(4500);
  checks.repeatNoConsume = (await saved()).hintUsed === 1;
  await sample("repeat");
  await phrase("next");
  await waitHint(2);
  await page.waitForTimeout(3500);
  await sample("hint2");
  await phrase("answer");
  await waitHint(3);
  await page.waitForTimeout(3500);
  checks.answerLevel3 = true;
  checks.referenceUnchanged = !(await saved()).answerReferenced;
  await sample("hint3");
  await phrase("explain");
  await page.waitForTimeout(4000);
  await sample("explanation");
  await page.mouse.click(15, 100);
  const targetSeconds = Number(process.env.VOICE_PLAYTEST_SECONDS ?? 600);
  while (
    (Date.now() - begin) / 1000 < targetSeconds ||
    boards < Number(process.env.VOICE_PLAYTEST_BOARDS ?? 3)
  ) {
    if ((Date.now() - begin) / 1000 > 680)
      throw Error("playtest_duration_limit");
    const state = await saved();
    if (state.phase === "roundResult") {
      boards++;
      await page.waitForTimeout(3200);
      await sample("board" + boards + "-result");
      if (
        boards >= Number(process.env.VOICE_PLAYTEST_BOARDS ?? 3) &&
        (Date.now() - begin) / 1000 >= targetSeconds
      )
        break;
      await page
        .getByRole("button", { name: "つぎの対戦へ", exact: true })
        .click();
      lastPlay = Date.now();
      continue;
    }
    if (
      state.phase === "playerTurn" &&
      Date.now() - lastPlay > 10000 &&
      (await page.locator(".picture-card:enabled").first().isVisible())
    ) {
      const safe = legalMoves(assets, position(state)).filter(
        (m) => tailKana(m.reading.kana) !== "ん",
      );
      const move =
        (!alternative
          ? safe.find((m) => m.reading.kind !== "basic")
          : undefined) ??
        chooseCpu(assets, position(state), "normal", "voice-playtest").move;
      if (move) {
        const card = page.locator(
          '[data-asset-id="' + move.assetId + '"] .picture-card',
        );
        if (move.reading.kind !== "basic") {
          await card.press("Shift+Enter");
          await page
            .getByRole("textbox", { name: "かなで回答" })
            .fill(move.reading.kana);
          await page.getByRole("button", { name: "回答", exact: true }).click();
          alternative = true;
        } else await card.click();
        moves++;
        lastPlay = Date.now();
        if (moves === 2) {
          await phrase("memory");
          await page.waitForTimeout(2000);
          await sample("memory");
        }
        if (moves === 4) {
          await phrase("correction");
          checks.correctionDuringPlay = true;
        }
        if (moves % 6 === 0) {
          await phrase("explain");
          await sample("later-explanation");
        }
      }
    }
    if (Date.now() - lastProgress > 60000) {
      lastProgress = Date.now();
      console.log(
        JSON.stringify({
          progress: "real_playtest",
          seconds: Math.floor((Date.now() - begin) / 1000),
          boards,
          moves,
        }),
      );
    }
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: "会話の操作を開く" }).click();
  await page.screenshot({ path: "reports/voice/live-panel.png" });
  await page.getByRole("button", { name: "会話を終了", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  usage = await page.locator(".voice-usage").textContent();
  const metrics = await page.evaluate(() => {
    const t = (window as any).__voiceTest;
    return {
      assistantDeltas: t.assistant,
      userDeltas: t.user,
      moodUpdates: t.moods,
      operations: t.operations,
      playingObservations: t.playing,
      audioVoicedFrames: t.audioVoiced,
      audioPlayedFrames: t.audioPlayed,
      audioPeak: t.audioPeak,
    };
  });
  const result = {
    completed: true,
    buildHash,
    voiceServerHash,
    wallSeconds: (Date.now() - begin) / 1000,
    boards,
    playerMoves: moves,
    alternative,
    checks,
    metrics,
    usage,
    errors,
    syntheticOnly: true,
    samples,
    limitations: [
      "Synthetic Japanese audio through a browser MediaStream, not a human microphone",
      "No speaker audition or physical mobile-device test",
    ],
  };
  mkdirSync("reports/voice", { recursive: true });
  writeFileSync(
    "reports/voice/real-playtest.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify({ ...result, samples: undefined }));
} catch (error) {
  const metrics = await page
    .evaluate(() => {
      const t = (window as any).__voiceTest;
      return t
        ? {
            assistant: t.assistant,
            user: t.user,
            moods: t.moods,
            operations: t.operations,
            audioVoiced: t.audioVoiced,
            audioPlayed: t.audioPlayed,
            audioPeak: t.audioPeak,
            lastUser: t.lastUser,
            lastAssistant: t.lastAssistant,
          }
        : null;
    })
    .catch(() => null);
  const rtp = await page
    .evaluate(async () => {
      const peer = (window as any).__voiceTestPeer as
        RTCPeerConnection | undefined;
      const results: Record<string, unknown>[] = [];
      if (peer) {
        const stats = await peer.getStats();
        stats.forEach((value) => {
          if (value.type === "inbound-rtp" && value.kind === "audio")
            results.push({
              bytesReceived: value.bytesReceived,
              packetsReceived: value.packetsReceived,
              totalAudioEnergy: value.totalAudioEnergy,
              audioLevel: value.audioLevel,
            });
        });
      }
      return results;
    })
    .catch(() => []);
  console.log(JSON.stringify({ audioTransport: rtp }));
  await page
    .screenshot({ path: "reports/voice/playtest-failure.png" })
    .catch(() => {});
  // These bounded examples originate only from this scripted synthetic test.
  mkdirSync("reports/voice", { recursive: true });
  writeFileSync(
    "reports/voice/playtest-incomplete.json",
    JSON.stringify(
      {
        syntheticOnly: true,
        stage: phaseIndex,
        boards,
        moves,
        checks,
        metrics,
        error: error instanceof Error ? error.name : "test_error",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ progress: "incomplete", boards, moves, checks, metrics }),
  );
  throw error;
} finally {
  await context.close();
  await browser.close();
  await app.stop();
  writeFileSync(
    "reports/voice/playtest-usage.json",
    JSON.stringify(
      {
        attemptAt: new Date().toISOString(),
        usage: app.usageSummaries(),
        metrics: app.metricsSummaries(),
        syntheticOnly: true,
      },
      null,
      2,
    ) + "\n",
  );
}
