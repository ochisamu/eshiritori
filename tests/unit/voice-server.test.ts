import { HostSettings } from "../../server/voice/hostSettings";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import http from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createVoiceServer } from "../../server/voice/index";
import { loadConfig } from "../../server/voice/config";
import {
  OpenAILiveAdapter,
  type LiveLink,
} from "../../server/voice/openaiLiveAdapter";
import type { ServerEvent } from "openai/resources/live/live";
function request(
  port: number,
  path: string,
  method = "GET",
  data?: unknown,
  headers: Record<string, string> = {},
) {
  return new Promise<{ status: number; body: any; cookie?: string }>(
    (resolve, reject) => {
      const bytes = data ? JSON.stringify(data) : "";
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            Host: "localhost:4174",
            ...(data
              ? {
                  "Content-Type": "application/json",
                  "Content-Length": String(Buffer.byteLength(bytes)),
                }
              : {}),
            ...headers,
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            let value: unknown;
            try {
              value = JSON.parse(body);
            } catch {
              value = body;
            }
            resolve({
              status: res.statusCode!,
              body: value,
              cookie: res.headers["set-cookie"]?.[0].split(";")[0],
            });
          });
        },
      );
      req.on("error", reject);
      req.end(bytes);
    },
  );
}
const view = {
  gameId: "g",
  boardEpoch: "b",
  revision: 1,
  turnId: "b:0:player",
  phase: "playerTurn",
  actor: "player",
  head: "あ",
  moveCount: 0,
  eligible: true,
  cards: [],
  hint: { level: 0, used: 0, canRequest: true },
  opponent: { variant: "cat" },
};
describe("voice host authorization and transport", () => {
  it("rejects unpaired/cross-origin/CSRF/duplicate ownership and never proxies arbitrary files", async () => {
    let calls = 0;
    const config = loadConfig({ OPENAI_API_KEY: "test-only-not-real" });
    const adapter = new OpenAILiveAdapter(config);
    adapter.create = async () => {
      calls++;
      return { id: "test-session", sdp: "answer" };
    };
    adapter.attach = async (_id, onEvent) => {
      return {
        send: () => {},
        close: async () => {
          onEvent({
            type: "session.closed",
            event_id: "closed",
            reason: "close_requested",
            session: { id: "test-session" } as never,
            usage: { seconds: 3 },
          } as ServerEvent);
          return true;
        },
      } as unknown as LiveLink;
    };
    const app = await createVoiceServer(config, { adapter });
    await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
    const port = (app.server.address() as { port: number }).port;
    let ws: WebSocket | undefined;
    try {
      expect((await request(port, "/voice-api/status")).body.paired).toBe(
        false,
      );
      expect(calls).toBe(0);
      expect((await request(port, "/.env")).status).toBe(404);
      expect((await request(port, "/../package.json")).status).toBe(404);
      expect(
        (await request(port, "/voice-api/session", "POST", { sdp: "v=0" }))
          .status,
      ).toBe(403);
      expect(
        (
          await request(
            port,
            "/voice-api/pair",
            "POST",
            { code: app.pairing.code },
            { Origin: "http://other.example" },
          )
        ).status,
      ).toBe(403);
      const code = app.pairing.code;
      const paired = await request(
        port,
        "/voice-api/pair",
        "POST",
        { code },
        { Origin: "http://localhost:4174" },
      );
      expect(paired.status).toBe(200);
      expect(paired.cookie).not.toContain("test-only");
      expect(
        (
          await request(
            port,
            "/voice-api/pair",
            "POST",
            { code },
            { Origin: "http://localhost:4174" },
          )
        ).status,
      ).toBe(403);
      const auth = {
        Origin: "http://localhost:4174",
        Cookie: paired.cookie!,
        "X-Voice-CSRF": paired.body.csrf,
      };
      expect(
        (
          await request(
            port,
            "/voice-api/session",
            "POST",
            { sdp: "v=0" },
            { ...auth, "X-Voice-CSRF": "bad" },
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            port,
            "/voice-api/session",
            "POST",
            { sdp: "v=0" },
            auth,
          )
        ).status,
      ).toBe(409);
      ws = new WebSocket(
        "ws://127.0.0.1:" + port + "/voice-api/events",
        ["eshiritori-voice", paired.body.csrf],
        {
          headers: {
            Host: "localhost:4174",
            Origin: auth.Origin,
            Cookie: auth.Cookie,
          },
        },
      );
      const slotPromise = once(ws, "message");
      await once(ws, "open");
      await slotPromise;
      ws.send(JSON.stringify({ type: "view", view }));
      await new Promise((r) => setTimeout(r, 30));
      const second = new WebSocket(
        "ws://127.0.0.1:" + port + "/voice-api/events",
        ["eshiritori-voice", paired.body.csrf],
        {
          headers: {
            Host: "localhost:4174",
            Origin: auth.Origin,
            Cookie: auth.Cookie,
          },
        },
      );
      const status = await new Promise<number>((resolve) => {
        second.on("unexpected-response", (_req, res) => {
          resolve(res.statusCode!);
          res.resume();
          second.terminate();
        });
        second.on("error", () => {});
      });
      expect(status).toBe(409);
      expect(calls).toBe(0);
      const created = await request(
        port,
        "/voice-api/session",
        "POST",
        { sdp: "v=0\r\n", model: "arbitrary" },
        auth,
      );
      expect(created.status).toBe(201);
      expect(created.body.sdp).toBe("answer");
      expect(created.body).not.toHaveProperty("apiKey");
      expect(calls).toBe(1);
      expect(
        (
          await request(
            port,
            "/voice-api/session",
            "POST",
            { sdp: "v=0\r\n" },
            auth,
          )
        ).status,
      ).toBe(409);
      const other = app.pairing.pair(app.pairing.code, "second-device");
      expect(
        (
          await request(port, "/voice-api/session", "DELETE", undefined, {
            Origin: auth.Origin,
            Cookie: "eshiritori_voice=" + other.id,
            "X-Voice-CSRF": other.csrf,
          })
        ).status,
      ).toBe(409);
      const closed = await request(
        port,
        "/voice-api/session",
        "DELETE",
        undefined,
        auth,
      );
      expect(closed.status).toBe(200);
      expect(closed.body.usage.finalized).toBe(true);
      expect(closed.body.usage.seconds).toBe(3);
    } finally {
      ws?.terminate();
      await app.stop();
    }
  }, 15000);
  it("bootstraps only the host GUI, requires CSRF for key writes, and never echoes the key", async () => {
    const folder = await mkdtemp(join(tmpdir(), "eshiritori-settings-http-"));
    const config = loadConfig({});
    config.origins.push("http://192.168.0.10:4174");
    const store = new HostSettings(join(folder, "settings.json"));
    const app = await createVoiceServer(config, { hostSettings: store });
    await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
    const port = (app.server.address() as { port: number }).port;
    try {
      const status = await request(port, "/voice-api/status");
      expect(status.body).toMatchObject({
        hostSettings: true,
        paired: false,
        available: false,
      });
      expect(
        (
          await request(
            port,
            "/voice-api/host-access",
            "POST",
            {},
            { Origin: "http://elsewhere.example" },
          )
        ).status,
      ).toBe(403);
      const local = await request(
        port,
        "/voice-api/host-access",
        "POST",
        {},
        { Origin: "http://localhost:4174" },
      );
      expect(local.status).toBe(200);
      const auth = {
        Cookie: local.cookie!,
        Origin: "http://localhost:4174",
        "X-Voice-CSRF": local.body.csrf,
      };
      const key = "sk-this-is-only-a-fake-unit-test-key";
      expect(
        (
          await request(
            port,
            "/voice-api/host-settings",
            "POST",
            { apiKey: key },
            { ...auth, "X-Voice-CSRF": "bad" },
          )
        ).status,
      ).toBe(403);
      const saved = await request(
        port,
        "/voice-api/host-settings",
        "POST",
        { apiKey: key, remember: true },
        auth,
      );
      expect(saved.status).toBe(200);
      expect(JSON.stringify(saved.body)).not.toContain(key);
      expect(await store.readKey()).toBe(key);
      expect(
        (
          await request(port, "/voice-api/status", "GET", undefined, {
            Cookie: local.cookie!,
          })
        ).body.available,
      ).toBe(true);
      const lan = {
        ...auth,
        Host: "192.168.0.10:4174",
        Origin: "http://192.168.0.10:4174",
      };
      expect(
        (await request(port, "/voice-api/host-access", "POST", {}, lan)).status,
      ).toBe(403);
      expect(
        (
          await request(
            port,
            "/voice-api/host-settings",
            "POST",
            { apiKey: key },
            lan,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            port,
            "/voice-api/host-settings",
            "GET",
            undefined,
            auth,
          )
        ).status,
      ).toBe(404);
      expect((await request(port, "/.voice/settings.json")).status).toBe(404);
      config.lan = true;
      config.origins.push("https://192.168.0.10:4174");
      const invite = await request(port, "/voice-api/invite", "POST", {}, auth);
      expect(invite.status).toBe(200);
      expect(invite.body.qr).toMatch(/^data:image\/png;base64,/);
      expect(invite.body.url).not.toContain(key);
      const token = new URL(invite.body.url).hash.slice(9);
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      const remoteAuth = {
        Host: "192.168.0.10:4174",
        Origin: "https://192.168.0.10:4174",
      };
      expect(
        (
          await request(
            port,
            "/voice-api/pair-invite",
            "POST",
            { token },
            remoteAuth,
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await request(
            port,
            "/voice-api/pair-invite",
            "POST",
            { token },
            remoteAuth,
          )
        ).status,
      ).toBe(403);
      expect(app.usageSummaries()).toHaveLength(0);
    } finally {
      await app.stop();
      await rm(folder, { recursive: true, force: true });
    }
  });
});
