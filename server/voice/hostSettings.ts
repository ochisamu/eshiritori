import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
export function isHostRequest(
  req: Pick<IncomingMessage, "headers" | "socket">,
) {
  const address = req.socket.remoteAddress;
  const host = new URL("http://" + (req.headers.host ?? "invalid")).hostname;
  return (
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address ?? "") &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host) &&
    !req.headers.forwarded &&
    !req.headers["x-forwarded-for"] &&
    !req.headers["x-forwarded-host"]
  );
}
export class HostSettings {
  constructor(readonly path = resolve(".voice/settings.json")) {}
  async readKey(): Promise<string | undefined> {
    try {
      const value = JSON.parse(await readFile(this.path, "utf8"));
      return typeof value.apiKey === "string" ? value.apiKey : undefined;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw Error("host_settings_unreadable");
    }
  }
  async saveKey(apiKey: string) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = this.path + "." + randomUUID() + ".tmp";
    await writeFile(temporary, JSON.stringify({ apiKey }) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, this.path);
  }
}
