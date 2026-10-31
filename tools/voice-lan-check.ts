import { chromium, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { X509Certificate, createHash } from "node:crypto";
import https from "node:https";
import { initialState, reducer } from "../src/game/state";
import { generateBoard } from "../src/game/boardGenerator";
import { activeAssets as assets } from "../src/game/content";
import { SAVE_KEY } from "../src/storage/save";
if (process.env.VOICE_TEST_BUDGET_USD !== "5")
  throw Error("Explicit test budget required");
const origin = process.env.VOICE_TEST_LAN_URL;
if (!origin || new URL(origin).protocol !== "https:")
  throw Error("Set VOICE_TEST_LAN_URL to the host HTTPS origin");
const ca = readFileSync(".voice/certificates/local-ca.crt");
const cert = new X509Certificate(
  readFileSync(".voice/certificates/server.crt"),
);
const fingerprint = createHash("sha256")
  .update(cert.publicKey.export({ type: "spki", format: "der" }))
  .digest("base64");
async function getStatus(trust: boolean, overrideOrigin?: string) {
  return new Promise<{ status: number; body: Record<string, unknown> }>(
    (resolve, reject) => {
      https
        .get(
          origin + "/voice-api/status",
          {
            ...(trust ? { ca } : {}),
            headers: overrideOrigin ? { Origin: overrideOrigin } : {},
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () =>
              resolve({ status: res.statusCode!, body: JSON.parse(body) }),
            );
          },
        )
        .on("error", () => reject(Error("tls_rejected")));
    },
  );
}
const untrustedRejected = await getStatus(false).then(
  () => false,
  () => true,
);
const trusted = await getStatus(true);
const wrongOrigin = await getStatus(true, "https://other.invalid");
if (trusted.status !== 200 || wrongOrigin.status !== 403 || !untrustedRejected)
  throw Error("TLS/origin check failed");
// Supply the host GUI's one-use link in a private, ignored file, never logs.
const inviteFile =
  process.env.VOICE_TEST_INVITE_FILE ?? ".voice/lan-test-invite.txt";
let inviteUrl: string;
try {
  inviteUrl = readFileSync(inviteFile, "utf8").trim();
  const parsed = new URL(inviteUrl);
  if (parsed.origin !== origin || !/^#connect=[a-f0-9]{64}$/.test(parsed.hash))
    throw Error();
} catch {
  throw Error("Provide a fresh host-GUI invite in the private invite file");
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  ignoreDefaultArgs: ["--mute-audio"],
  args: [
    "--no-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--ignore-certificate-errors-spki-list=" + fingerprint,
  ],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
let s = initialState();
s = reducer(
  s,
  {
    type: "START",
    seed: "voice-lan-check",
    settings: {
      ...s.settings,
      mode: "refillPractice",
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
    const metrics = ((window as any).__lanVoice = {
      assistant: 0,
      user: 0,
      played: 0,
      voiced: 0,
    });
    const NativeSocket = window.WebSocket;
    (window as any).WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.addEventListener("message", (event) => {
          try {
            const m = JSON.parse(event.data);
            if (m.type === "caption") {
              if (m.direction === "assistant") metrics.assistant++;
              else metrics.user++;
            }
          } catch {}
        });
      }
    };
    const NativeNode = window.AudioWorkletNode;
    (window as any).AudioWorkletNode = class extends NativeNode {
      constructor(
        ctx: BaseAudioContext,
        name: string,
        options?: AudioWorkletNodeOptions,
      ) {
        super(ctx, name, options);
        if (name === "eshiritori-voice-output") {
          this.port.addEventListener("message", (event) => {
            if (event.data.type === "meter") {
              metrics.played = event.data.played;
              metrics.voiced = event.data.voiced;
            }
          });
          this.port.start();
        }
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext(),
        dest = audio.createMediaStreamDestination(),
        zero = audio.createConstantSource();
      zero.offset.value = 0;
      zero.connect(dest);
      zero.start();
      await audio.resume();
      (window as any).__lanSpeak = async (base64: string) => {
        const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const buffer = await audio.decodeAudioData(data.buffer),
          source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start();
        return buffer.duration;
      };
      return dest.stream;
    };
  },
  { state: s, key: SAVE_KEY },
);
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", () => errors.push("browser_exception"));
let result: Record<string, unknown> = {};
try {
  await page.goto(inviteUrl);
  expect(await page.evaluate(() => isSecureContext)).toBe(true);
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  await expect(page.locator(".picture-card:enabled").first()).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "ひとやすみ", exact: true }).click();
  await page.getByRole("button", { name: "会話する", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "会話を開始", exact: true }).click();
  await expect
    .poll(() => page.locator(".voice-session-row").textContent(), {
      timeout: 30000,
    })
    .toContain("聞いています");
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(origin);
  await otherPage
    .getByRole("button", { name: "会話する", exact: true })
    .click();
  await expect(otherPage.locator(".voice-panel")).toContainText(
    "別の端末で会話中",
  );
  await other.close();
  await page.getByRole("button", { name: "ゲームに戻る", exact: true }).click();
  await page
    .getByRole("button", { name: "つづきから遊ぶ", exact: true })
    .click();
  const audio = readFileSync(".cache/voice/hello.wav").toString("base64");
  const duration = await page.evaluate(
    async (value) => (window as any).__lanSpeak(value),
    audio,
  );
  await page.waitForTimeout(duration * 1000 + 7000);
  await expect
    .poll(() => page.evaluate(() => (window as any).__lanVoice.played), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);
  const metrics = await page.evaluate(() => (window as any).__lanVoice);
  await page.getByRole("button", { name: "会話の操作を開く" }).click();
  await page.getByRole("button", { name: "会話を終了", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "会話を開始", exact: true }),
  ).toBeVisible({ timeout: 25000 });
  const usage = await page.locator(".voice-usage").textContent();
  result = {
    passed: true,
    route: origin,
    host: "Windows Node.js",
    client: "WSL Linux Chromium",
    untrustedRejected,
    trustedCAAccepted: true,
    wrongOriginRejected: wrongOrigin.status === 403,
    secureBrowserContext: true,
    secondClientBusy: true,
    mode: "refillPractice",
    metrics,
    usage,
    errors,
    limitations: [
      "Virtualized client via host LAN IP, not a physical phone/tablet",
      "Local CA validated by Node; Chromium trusted only this certificate SPKI for the test; no OS trust settings modified",
      "Synthetic Japanese microphone, no human speaker audition",
    ],
  };
  console.log(JSON.stringify(result));
} finally {
  await context.close();
  await browser.close();
  mkdirSync("reports/voice", { recursive: true });
  writeFileSync(
    "reports/voice/lan-check.json",
    JSON.stringify(result, null, 2) + "\n",
  );
}
