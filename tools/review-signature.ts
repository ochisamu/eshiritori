import { createHash } from "node:crypto";
import type { Reading } from "../src/game/types";
export function readingIdentity(assetId: string, kana: string): string {
  return (
    assetId +
    "-r-" +
    createHash("sha256").update(kana).digest("hex").slice(0, 12)
  );
}
export function reviewSignature(r: Reading): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: r.id,
        display: r.display,
        kana: r.kana,
        kind: r.kind,
        difficulty: r.difficulty,
        priority: r.priority,
        explanation: r.explanation,
        evidence: r.evidence,
        hints: r.hints,
        aliases: r.aliases,
        element: r.element ?? null,
      }),
    )
    .digest("hex");
}
