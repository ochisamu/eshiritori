import data from "../generated/content.json" with { type: "json" };
import type { Asset } from "./types";
import { validateContent } from "./contentSchema";
export { validateContent } from "./contentSchema";
export const assets = data as unknown as Asset[];
validateContent(assets);
export const activeAssets = assets.filter((a) => a.status === "approved");
