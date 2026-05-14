import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDist = path.join(rootDir, "artifacts", "visa-shuttle", "dist", "public");
const apiPublicDist = path.join(rootDir, "artifacts", "api-server", "dist", "public");

await rm(apiPublicDist, { recursive: true, force: true });
await cp(webDist, apiPublicDist, { recursive: true });

console.log(`Copied web build to ${path.relative(rootDir, apiPublicDist)}`);
