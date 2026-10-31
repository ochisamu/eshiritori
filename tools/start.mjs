// One process serves the game, local settings and optional voice API.
import { existsSync } from "node:fs";
if (process.argv.includes("--dev"))
  throw Error("Use npm run dev for frontend development.");
if (
  !existsSync("dist/index.html") ||
  !existsSync("dist-voice/server/voice/index.js")
) {
  console.error("Run npm run build first.");
  process.exit(1);
}
if (existsSync(".env")) process.loadEnvFile(".env");
process.env.VOICE_PORT ??= process.env.PORT ?? "4173";
const { main } = await import("../dist-voice/server/voice/index.js");
await main();
