import { gzipSync } from "node:zlib";
import { HostSettings, isHostRequest } from "./hostSettings.js";
import http from "node:http";
import https from "node:https";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import QRCode from "qrcode";
import { loadConfig, loadHostEnv, type VoiceConfig } from "./config.js";
import { Pairing } from "./pairing.js";
import { OpenAILiveAdapter, safeError } from "./openaiLiveAdapter.js";
import { ConversationDirector } from "./conversationDirector.js";
import { parseHintResult, parseView } from "./context.js";
import {
  defaultVoiceOptions,
  type VoiceOptions,
} from "../../src/voice/protocol.js";
import { pathToFileURL } from "node:url";
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
function options(value: unknown): VoiceOptions {
  const v = value as Partial<VoiceOptions> | undefined;
  return {
    mic: v?.mic === true,
    output: v?.output === true,
    captions: v?.captions !== false,
    chatter:
      v?.chatter === "quiet"
        ? "quiet"
        : v?.chatter === "chatty"
          ? "chatty"
          : "normal",
    decisions: v?.decisions === true,
  };
}
async function body(
  req: http.IncomingMessage,
  max = 65536,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Error("body_too_large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("invalid_json");
  }
}
export async function createVoiceServer(
  config: VoiceConfig,
  settings: {
    adapter?: OpenAILiveAdapter;
    onPairCode?: (code: string) => void;
    dist?: string;
    hostSettings?: HostSettings;
  } = {},
) {
  const pairing = new Pairing();
  const hostSettings = settings.hostSettings ?? new HostSettings();
  let adapter = settings.adapter ?? new OpenAILiveAdapter(config);
  let active:
    | {
        owner: string;
        expires: number;
        socket: WebSocket;
        director: ConversationDirector;
        creating: boolean;
        created: boolean;
      }
    | undefined;
  let spent = 0;
  const metrics: Record<string, number>[] = [];
  const histories = new Map<
    string,
    ReturnType<ConversationDirector["usage"]["snapshot"]>
  >();
  const root = await realpath(settings.dist ?? "dist");
  const compressed = new Map<string, Buffer>();
  const allowedHosts = new Set(
    config.origins.map((origin) => new URL(origin).host),
  );
  const tls = !!config.cert && !!config.key;
  const originAllowed = (req: http.IncomingMessage, requireOrigin = true) => {
    const origin = req.headers.origin;
    return (
      allowedHosts.has(req.headers.host ?? "") &&
      ((!requireOrigin && !origin) ||
        (typeof origin === "string" && config.origins.includes(origin)))
    );
  };
  const json = (res: http.ServerResponse, status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  };
  const send = (socket: WebSocket, data: Record<string, unknown>) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    if (data.type === "audio" && socket.bufferedAmount > 128 * 1024) return;
    if (socket.bufferedAmount > 256 * 1024) {
      socket.close(1013);
      return;
    }
    socket.send(JSON.stringify(data));
  };
  const retire = async (slot: NonNullable<typeof active>) => {
    await slot.director.stop();
    if (active === slot) metrics.push({ ...slot.director.metrics });
    histories.set(slot.owner, slot.director.usage.snapshot());
    if (histories.size > 32) histories.delete(histories.keys().next().value!);
    if (active === slot) {
      spent += slot.director.usage.estimate();
      active = undefined;
    }
    slot.socket.close(1000);
  };
  const handler = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname.startsWith("/voice-api/")) {
        if (!originAllowed(req, req.method !== "GET"))
          return json(res, 403, { error: "unexpected_origin" });
        const device = pairing.device(req.headers.cookie);
        if (url.pathname === "/voice-api/status" && req.method === "GET")
          return json(res, 200, {
            available: !!config.apiKey,
            paired: !!device,
            busy: !!active && active.owner !== device?.id,
            lan: config.lan,
            maxSeconds: config.maxSeconds,
            hostSettings: isHostRequest(req),
            ...(device ? { csrf: device.csrf } : {}),
          });
        if (
          url.pathname === "/voice-api/host-access" &&
          req.method === "POST"
        ) {
          if (!isHostRequest(req))
            return json(res, 403, { error: "host_only" });
          const result = device ?? pairing.issueDevice();
          res.setHeader(
            "Set-Cookie",
            "eshiritori_voice=" +
              result.id +
              "; HttpOnly; SameSite=Strict; Path=/voice-api; Max-Age=3600" +
              (tls ? "; Secure" : ""),
          );
          return json(res, 200, { csrf: result.csrf });
        }
        if (
          url.pathname === "/voice-api/pair-invite" &&
          req.method === "POST"
        ) {
          const request = await body(req, 1024);
          const result = pairing.pairInvite(
            request.token,
            req.socket.remoteAddress ?? "unknown",
          );
          res.setHeader(
            "Set-Cookie",
            "eshiritori_voice=" +
              result.id +
              "; HttpOnly; SameSite=Strict; Path=/voice-api; Max-Age=3600" +
              (tls ? "; Secure" : ""),
          );
          json(res, 200, { csrf: result.csrf });
          settings.onPairCode?.(pairing.rotate());
          return;
        }
        if (url.pathname === "/voice-api/pair" && req.method === "POST") {
          const request = await body(req, 1024);
          const result = pairing.pair(
            request.code,
            req.socket.remoteAddress ?? "unknown",
          );
          res.setHeader(
            "Set-Cookie",
            "eshiritori_voice=" +
              result.id +
              "; HttpOnly; SameSite=Strict; Path=/voice-api; Max-Age=3600" +
              (tls ? "; Secure" : ""),
          );
          json(res, 200, { csrf: result.csrf });
          const code = pairing.rotate();
          settings.onPairCode?.(code);
          return;
        }
        if (!device) return json(res, 401, { error: "pair_required" });
        if (req.method !== "GET" && req.headers["x-voice-csrf"] !== device.csrf)
          return json(res, 403, { error: "csrf_required" });
        if (url.pathname === "/voice-api/invite" && req.method === "POST") {
          if (!isHostRequest(req))
            return json(res, 403, { error: "host_only" });
          if (!config.lan)
            return json(res, 409, { error: "lan_https_required" });
          const origin = config.origins.find(
            (o) =>
              !["localhost", "127.0.0.1", "[::1]"].includes(
                new URL(o).hostname,
              ),
          );
          if (!origin) return json(res, 409, { error: "lan_https_required" });
          pairing.rotate();
          const inviteUrl = origin + "/#connect=" + pairing.invite;
          return json(res, 200, {
            url: inviteUrl,
            qr: await QRCode.toDataURL(inviteUrl),
            expires: pairing.expires,
          });
        }
        if (
          url.pathname === "/voice-api/host-settings" &&
          req.method === "POST"
        ) {
          if (!isHostRequest(req))
            return json(res, 403, { error: "host_only" });
          if (active) return json(res, 409, { error: "settings_busy" });
          const request = await body(req, 2048);
          const key =
            typeof request.apiKey === "string" ? request.apiKey.trim() : "";
          if (!/^sk-[A-Za-z0-9_-]{16,500}$/.test(key))
            return json(res, 400, { error: "invalid_key_format" });
          if (request.remember === true) await hostSettings.saveKey(key);
          config.apiKey = key;
          adapter = new OpenAILiveAdapter(config);
          return json(res, 200, { configured: true });
        }
        if (url.pathname === "/voice-api/usage" && req.method === "GET")
          return json(res, 200, {
            usage:
              active?.owner === device.id
                ? active.director.usage.snapshot()
                : (histories.get(device.id) ?? null),
          });
        if (url.pathname === "/voice-api/session" && req.method === "POST") {
          if (!config.apiKey)
            return json(res, 503, { error: "key_not_configured" });
          if (!active || active.owner !== device.id)
            return json(res, 409, { error: "voice_slot_required" });
          const slot = active;
          if (slot.creating || slot.created)
            return json(res, 409, { error: "already_started" });
          if (spent + 0.03 >= config.budget)
            return json(res, 429, { error: "budget_limit" });
          const request = await body(req);
          if (
            typeof request.sdp !== "string" ||
            !request.sdp.startsWith("v=0") ||
            request.sdp.length > 60000
          )
            return json(res, 400, { error: "invalid_sdp" });
          if (!slot.director.view?.eligible)
            return json(res, 409, { error: "mode_unavailable" });
          slot.creating = true;
          try {
            const sdp = await slot.director.connect(request.sdp);
            slot.created = true;
            slot.creating = false;
            json(res, 201, { sdp, connectionEpoch: slot.director.epoch });
          } catch (error) {
            json(res, 502, { error: safeError(error) });
            await retire(slot);
          }
          return;
        }
        if (url.pathname === "/voice-api/session" && req.method === "DELETE") {
          if (active?.owner !== device.id)
            return json(res, 409, { error: "not_owner" });
          const slot = active;
          await retire(slot);
          return json(res, 200, { usage: slot.director.usage.snapshot() });
        }
        return json(res, 404, { error: "not_found" });
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        return json(res, 405, { error: "method_not_allowed" });
      if (
        decodeURIComponent(url.pathname)
          .split("/")
          .some((part) => part.startsWith("."))
      )
        return json(res, 404, { error: "not_found" });
      const path = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (!path.startsWith(root + sep) || !mime[extname(path)])
        return json(res, 404, { error: "not_found" });
      const actual = await realpath(path);
      if (!actual.startsWith(root + sep))
        return json(res, 404, { error: "not_found" });
      const info = await stat(actual);
      if (!info.isFile()) return json(res, 404, { error: "not_found" });
      const etag = '"' + info.size + "-" + info.mtimeMs + '"';
      const headers: Record<string, string> = {
        "Content-Type": mime[extname(actual)],
        "Cache-Control":
          actual.endsWith(".html") || actual.endsWith("sw.js")
            ? "no-cache"
            : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "Permissions-Policy": "microphone=(self)",
        "Cross-Origin-Resource-Policy": "same-origin",
        ETag: etag,
      };
      if (req.headers["if-none-match"] === etag) {
        res.writeHead(304, headers).end();
        return;
      }
      let data: Buffer | undefined =
        req.method === "HEAD" ? undefined : await readFile(actual);
      if (
        data &&
        /[.](js|css|json|html)$/.test(actual) &&
        req.headers["accept-encoding"]?.includes("gzip")
      ) {
        const key = actual + etag;
        data = compressed.get(key) ?? gzipSync(data);
        if (compressed.size >= 16) compressed.clear();
        compressed.set(key, data);
        headers["Content-Encoding"] = "gzip";
        headers.Vary = "Accept-Encoding";
      }
      res.writeHead(200, headers);
      res.end(data);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      )
        return json(res, 404, { error: "not_found" });
      const code = error instanceof Error ? error.message : "request_failed";
      json(
        res,
        code === "pair_rate_limit"
          ? 429
          : code === "invalid_pair_code"
            ? 403
            : code === "body_too_large"
              ? 413
              : 400,
        {
          error: [
            "pair_rate_limit",
            "invalid_pair_code",
            "body_too_large",
            "invalid_json",
            "host_settings_unreadable",
          ].includes(code)
            ? code
            : "request_failed",
        },
      );
    }
  };
  const server = tls
    ? https.createServer(
        {
          cert: await readFile(config.cert!),
          key: await readFile(config.key!),
        },
        (req, res) => {
          void handler(req, res);
        },
      )
    : http.createServer((req, res) => {
        void handler(req, res);
      });
  server.requestTimeout = 25000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 50;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32768,
    perMessageDeflate: false,
    handleProtocols: (protocols) =>
      protocols.has("eshiritori-voice") ? "eshiritori-voice" : false,
  });
  server.on("upgrade", (req, socket, head) => {
    const reject = (code: number) => {
      socket.write(
        "HTTP/1.1 " + code + " Rejected\r\nConnection: close\r\n\r\n",
      );
      socket.destroy();
    };
    const device = pairing.device(req.headers.cookie);
    const protocols =
      req.headers["sec-websocket-protocol"]?.split(",").map((s) => s.trim()) ??
      [];
    if (
      req.url !== "/voice-api/events" ||
      !originAllowed(req) ||
      !device ||
      !protocols.includes(device.csrf)
    )
      return reject(403);
    if (active) return reject(409);
    wss.handleUpgrade(req, socket, head, (ws) => {
      const director = new ConversationDirector(
        config,
        adapter,
        (data) => send(ws, data),
        defaultVoiceOptions,
        () => spent,
      );
      const slot = {
        owner: device.id,
        expires: device.expires,
        socket: ws,
        director,
        creating: false,
        created: false,
      };
      active = slot;
      send(ws, { type: "slot", connectionEpoch: director.epoch });
      let count = 0,
        windowStart = Date.now();
      ws.on("message", (raw) => {
        if (Date.now() >= device.expires) {
          send(ws, { type: "error", code: "pair_required" });
          ws.close(1008);
          return;
        }
        if (Date.now() - windowStart > 1000) {
          count = 0;
          windowStart = Date.now();
        }
        if (++count > 30) {
          ws.close(1008);
          return;
        }
        try {
          const message = JSON.parse(raw.toString());
          director.lastSeen = Date.now();
          if (message.type === "view") director.update(parseView(message.view));
          else if (message.type === "input.activity") {
            if (
              typeof message.active !== "boolean" ||
              !Number.isInteger(message.sequence) ||
              message.sequence < 1 ||
              message.sequence > 100000
            )
              throw Error("invalid_activity");
            director.inputActivity(message.active, message.sequence);
          } else if (message.type === "playback") {
            if (typeof message.active !== "boolean")
              throw Error("invalid_playback");
            director.playback(message.active);
          } else if (message.type === "media.ready")
            director.startConversation();
          else if (message.type === "options")
            director.setOptions(options(message.options));
          else if (message.type === "operation.result") {
            const value = message.result;
            if (
              typeof value?.requestId !== "string" ||
              value.requestId.length > 160 ||
              value.connectionEpoch !== director.epoch ||
              !["ok", "stale", "unavailable"].includes(value.status)
            )
              throw Error("invalid_operation");
            director.operationResult({
              requestId: value.requestId,
              connectionEpoch: director.epoch,
              status: value.status,
              view: parseView(value.view),
              ...(value.hint
                ? {
                    hint: parseHintResult(value.hint),
                  }
                : {}),
            });
          } else if (message.type !== "heartbeat")
            throw Error("invalid_message");
        } catch {
          send(ws, { type: "error", code: "invalid_message" });
        }
      });
      ws.on("error", () => {});
      ws.on("close", () => {
        void retire(slot);
      });
    });
  });
  const timer = setInterval(() => {
    if (active && Date.now() >= active.expires) void retire(active);
    else active?.director.tick();
  }, 1000);
  const stop = async () => {
    clearInterval(timer);
    if (active) await retire(active);
    wss.close();
    await new Promise<void>((r) => server.close(() => r()));
  };
  return {
    server,
    pairing,
    stop,
    usageSummaries: () => [...histories.values()],
    metricsSummaries: () => metrics,
    printPairing: () => settings.onPairCode?.(pairing.code),
  };
}
export async function main() {
  loadHostEnv();
  const config = loadConfig();
  try {
    const storedKey = await new HostSettings().readKey();
    if (storedKey !== undefined) config.apiKey = storedKey;
  } catch {
    config.apiKey = "";
    console.error(
      "Host key settings unavailable. Standard game remains available; configure the key in the host GUI.",
    );
  }
  const app = await createVoiceServer(config);
  app.server.listen(config.port, "0.0.0.0", async () => {
    console.log(
      "えしりとり: " +
        config.origins[0] +
        " (host API charges; start is explicit)",
    );
    console.log(
      config.apiKey
        ? "Host API key configured. Start voice in the game."
        : "Set the API key in the host game settings to enable voice.",
    );
    console.log(
      await QRCode.toString(config.origins[0], {
        type: "terminal",
        small: true,
      }),
    );
  });
  const rotate = setInterval(() => {
    if (Date.now() > app.pairing.expires) {
      app.pairing.rotate();
    }
  }, 60000);
  const shutdown = () => {
    clearInterval(rotate);
    void app.stop().then(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void main().catch(() => {
    console.error(
      "Voice server failed. Check local port, TLS paths and host configuration.",
    );
    process.exitCode = 1;
  });
