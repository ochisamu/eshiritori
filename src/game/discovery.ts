import type { Asset } from "./types";
export function discoveryProgress(asset: Asset, known: ReadonlySet<string>) {
  const readings = asset.readings.filter((r) => r.reviewStatus === "approved");
  const found = readings.filter((r) => known.has(r.id)).length;
  return {
    found,
    total: readings.length,
    complete: readings.length > 0 && found === readings.length,
  };
}
