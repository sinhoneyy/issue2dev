#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsxCli = resolve(root, "node_modules", "tsx", "dist", "cli.mjs");
const cliEntry = resolve(root, "src", "cli", "index.ts");
const child = spawnSync(process.execPath, [tsxCli, cliEntry, ...process.argv.slice(2)], { stdio: "inherit" });

if (child.error) {
  console.error(`error: ${child.error.message}`);
  process.exit(1);
}

process.exit(child.status ?? 1);
