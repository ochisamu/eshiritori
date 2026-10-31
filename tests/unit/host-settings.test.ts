import { describe, it, expect } from "vitest";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage } from "node:http";
import { HostSettings, isHostRequest } from "../../server/voice/hostSettings";
import { Pairing } from "../../server/voice/pairing";
describe("host-only key settings and invite links", () => {
  it("requires both loopback socket and localhost host, without forwarded identity", () => {
    const request = (host: string, remoteAddress: string, extra = {}) =>
      ({
        headers: { host, ...extra },
        socket: { remoteAddress },
      }) as IncomingMessage;
    expect(isHostRequest(request("localhost:4173", "127.0.0.1"))).toBe(true);
    expect(isHostRequest(request("[::1]:4173", "::1"))).toBe(true);
    expect(isHostRequest(request("localhost:4173", "192.168.0.10"))).toBe(
      false,
    );
    expect(isHostRequest(request("192.168.0.10:4173", "127.0.0.1"))).toBe(
      false,
    );
    expect(
      isHostRequest(
        request("localhost:4173", "127.0.0.1", {
          "x-forwarded-for": "127.0.0.1",
        }),
      ),
    ).toBe(false);
  });
  it("persists keys only in the selected host file with restrictive POSIX permissions", async () => {
    const folder = await mkdtemp(join(tmpdir(), "eshiritori-host-test-"));
    try {
      const store = new HostSettings(join(folder, "private", "settings.json"));
      expect(await store.readKey()).toBeUndefined();
      await store.saveKey("sk-not-a-real-key-for-unit-tests");
      expect(await store.readKey()).toBe("sk-not-a-real-key-for-unit-tests");
      if (process.platform !== "win32")
        expect((await stat(store.path)).mode & 0o777).toBe(0o600);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
  it("authorizes local browsers without consuming a LAN invite and redeems links only once", () => {
    let now = 1000;
    const pair = new Pairing(() => now),
      token = pair.invite;
    const local = pair.issueDevice();
    expect(pair.device("eshiritori_voice=" + local.id)).toBeTruthy();
    expect(pair.expires).toBeGreaterThan(now);
    const remote = pair.pairInvite(token, "client");
    expect(pair.device("eshiritori_voice=" + remote.id)).toBeTruthy();
    expect(() => pair.pairInvite(token, "another")).toThrow();
    pair.rotate();
    now += 300001;
    expect(() => pair.pairInvite(pair.invite, "expired")).toThrow();
  });
});
