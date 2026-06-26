#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliEntry = resolve(root, "dist", "cli", "index.js");

if (!existsSync(cliEntry)) {
  console.error("error: issue2dev is not built. Run `pnpm run build` before using the local binary.");
  process.exit(1);
}

await import(pathToFileURL(cliEntry).href);