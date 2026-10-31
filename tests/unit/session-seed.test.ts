import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionSeed } from "../../src/game/sessionSeed";

afterEach(() => vi.unstubAllGlobals());
describe("new session seed selection", () => {
  it("uses fresh entropy even when randomUUID is unavailable on a LAN HTTP page", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const seeds = Array.from({ length: 100 }, () => sessionSeed());
    expect(new Set(seeds).size).toBe(100);
    expect(seeds.every((seed) => seed.length > 10 && seed.length <= 80)).toBe(
      true,
    );
  });
  it("keeps a manually specified seed reproducible and treats whitespace as automatic", () => {
    expect(sessionSeed("  garden-01  ")).toBe("garden-01");
    expect(sessionSeed("garden-01")).toBe("garden-01");
    expect(sessionSeed("   ")).not.toBe(sessionSeed("   "));
  });
  it("can start a different session when the platform has no crypto API", () => {
    vi.stubGlobal("crypto", undefined);
    expect(sessionSeed()).not.toBe(sessionSeed());
  });
});
