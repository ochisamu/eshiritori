import data from "../generated/content.json" with { type: "json" };
import type { Asset } from "./types";
import { validateContent, validateDistinctReadingHeads } from "./contentSchema";
export { validateContent } from "./contentSchema";
export const assets = data as unknown as Asset[];
validateContent(assets);
validateDistinctReadingHeads(assets);
export const activeAssets = assets.filter((a) => a.status === "approved");
