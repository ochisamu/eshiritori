import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardClient } from "../../src/game/boardClient";
import type { Board } from "../../src/game/types";
class WorkerStub {
  static instances: WorkerStub[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  messages: { requestId: number; options: unknown }[] = [];
  terminated = false;
  constructor() {
    WorkerStub.instances.push(this);
  }
  postMessage(message: { requestId: number; options: unknown }) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  answer(index: number, board: Board) {
    this.onmessage?.({
      data: { requestId: this.messages[index].requestId, board },
    });
  }
}
const options = {
  seed: "same-condition",
  round: 0,
  difficulty: "normal" as const,
  discovered: [],
};
const board = {
  ids: [],
  head: "か",
  seed: "test",
  version: "test",
  fallback: false,
};
afterEach(() => {
  vi.unstubAllGlobals();
  WorkerStub.instances = [];
  vi.useRealTimers();
});
describe("shared board preparation", () => {
  it("reuses in-flight preparation across next-round transition and ignores cancelled recipients", async () => {
    vi.stubGlobal("Worker", WorkerStub);
    const client = new BoardClient(),
      old = vi.fn(),
      next = vi.fn();
    const cancel = client.request(options, old);
    cancel();
    client.request({ ...options }, next);
    const worker = WorkerStub.instances[0];
    expect(worker.messages).toHaveLength(1);
    worker.answer(0, board);
    expect(old).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ board }));
    const cached = vi.fn();
    client.request(options, cached);
    await Promise.resolve();
    expect(cached).toHaveBeenCalledWith(expect.objectContaining({ board }));
    expect(worker.messages).toHaveLength(1);
    client.stop();
    expect(worker.terminated).toBe(true);
  });
  it("keeps different discovery conditions separate and stopping prevents late delivery", () => {
    vi.stubGlobal("Worker", WorkerStub);
    const client = new BoardClient(),
      a = vi.fn(),
      b = vi.fn();
    client.request(options, a);
    client.request({ ...options, discovered: ["new-reading"] }, b);
    const worker = WorkerStub.instances[0];
    expect(worker.messages).toHaveLength(2);
    worker.answer(0, board);
    expect(a).toHaveBeenCalledOnce();
    expect(b).not.toHaveBeenCalled();
    client.stop();
    worker.answer(1, board);
    expect(b).not.toHaveBeenCalled();
    client.request(options, b);
    expect(WorkerStub.instances).toHaveLength(2);
    client.stop();
  });
  it("bounds waits and reports actual worker failures to every live request", () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", WorkerStub);
    const client = new BoardClient(),
      timeout = vi.fn(),
      error = vi.fn();
    client.request(options, timeout);
    vi.advanceTimersByTime(10000);
    expect(timeout).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    client.request({ ...options, round: 1 }, error);
    const worker = WorkerStub.instances[0];
    worker.onerror?.({ preventDefault: vi.fn() });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(worker.terminated).toBe(true);
    client.stop();
  });
});
