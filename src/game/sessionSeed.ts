// Session randomness belongs at the start button; board generation stays seeded
// so saves and explicit retries still reproduce the same board.
let fallbackSequence = 0;
export function sessionSeed(override = ""): string {
  if (override.trim()) return override.trim();
  if (globalThis.crypto?.getRandomValues) {
    const words = globalThis.crypto.getRandomValues(new Uint32Array(4));
    return `random-${Array.from(words, (n) => n.toString(36)).join("-")}`;
  }
  return `random-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${++fallbackSequence}`;
}
