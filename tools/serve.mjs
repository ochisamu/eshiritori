import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { gzipSync } from "node:zlib";
if (process.argv.includes("--dev"))
  throw Error("Use npm run dev. This server only serves dist.");
const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const compressed = new Map();
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const decoded = decodeURIComponent(url.pathname);
    if (
      decoded.split("/").some((part) => part.startsWith(".")) ||
      /[.](key|pem|crt|cer|p12|pfx)$/i.test(decoded)
    ) {
      res.writeHead(404).end();
      return;
    }
    const path = resolve(root, "." + decoded);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    let file = path;
    let s = await stat(file);
    if (s.isDirectory()) {
      file = resolve(file, "index.html");
      s = await stat(file);
    }
    const etag = `"${s.size}-${s.mtimeMs}"`;
    const headers = {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Cache-Control":
        url.searchParams.has("v") || /[-][\w-]{8,}\.(js|css)$/.test(file)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    };
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers).end();
      return;
    }
    let body = await readFile(file);
    if (
      /\.(html|js|css|json)$/.test(file) &&
      req.headers["accept-encoding"]?.includes("gzip")
    ) {
      const key = file + etag;
      body = compressed.get(key) ?? gzipSync(body);
      if (compressed.size > 16) compressed.clear();
      compressed.set(key, body);
      headers["Content-Encoding"] = "gzip";
      headers["Vary"] = "Accept-Encoding";
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`えしりとり連戦: http://localhost:${port}`),
);
