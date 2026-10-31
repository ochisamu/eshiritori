import type { Board } from "./types";
import type { GenerationOptions } from "./boardGenerator";
type Reply = { board?: Board; error?: string };
// One bounded worker per mounted game. Keep its parsed dictionary between rounds.
export class BoardClient {
  private worker: Worker | null = null;
  private serial = 0;
  private pending = new Map<
    number,
    {
      key: string;
      replies: Set<(value: Reply) => void>;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private cache = new Map<string, Reply>();
  request(options: GenerationOptions, reply: (value: Reply) => void) {
    const key = JSON.stringify(options);
    const cached = this.cache.get(key);
    if (cached) {
      let canceled = false;
      queueMicrotask(() => {
        if (!canceled) reply(cached);
      });
      return () => {
        canceled = true;
      };
    }
    const inFlight = [...this.pending.values()].find(
      (entry) => entry.key === key,
    );
    if (inFlight) {
      inFlight.replies.add(reply);
      return () => {
        inFlight.replies.delete(reply);
      };
    }
    if (!this.worker) {
      this.worker = new Worker(new URL("./board.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (
        event: MessageEvent<Reply & { requestId: number }>,
      ) => {
        const entry = this.pending.get(event.data.requestId);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(event.data.requestId);
        if (event.data.board) {
          this.cache.set(entry.key, event.data);
          if (this.cache.size > 2)
            this.cache.delete(this.cache.keys().next().value!);
        }
        for (const receiver of entry.replies) receiver(event.data);
      };
      this.worker.onerror = (event) => {
        event.preventDefault();
        const entries = [...this.pending.values()];
        this.stop();
        for (const entry of entries)
          for (const receiver of entry.replies)
            receiver({ error: "盤面の準備を再試行してください。" });
      };
    }
    const requestId = ++this.serial;
    const timer = setTimeout(() => {
      const entry = this.pending.get(requestId);
      this.pending.delete(requestId);
      if (entry)
        for (const receiver of entry.replies)
          receiver({
            error: "盤面の準備が完了しませんでした。再試行してください。",
          });
    }, 10000);
    this.pending.set(requestId, { key, replies: new Set([reply]), timer });
    this.worker.postMessage({ requestId, options });
    return () => {
      const entry = this.pending.get(requestId);
      entry?.replies.delete(reply);
    };
  }
  stop() {
    for (const entry of this.pending.values()) clearTimeout(entry.timer);
    this.pending.clear();
    this.cache.clear();
    this.worker?.terminate();
    this.worker = null;
  }
}
