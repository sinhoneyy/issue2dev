import path from "node:path";
import { runGeneratePrototype } from "../src/core/pipeline/pipeline.js";

function readFlag(name: string, fallback?: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${name} is required`);
  }
  const value = process.argv[index + 1];
  if (!value) throw new Error(`${name} requires a value`);
  return value;
}

const fromFile = path.resolve(readFlag("--from-file"));
const outDir = path.resolve(readFlag("--out", ".issue2dev/phase5"));
const result = await runGeneratePrototype({ fromFile, outDir });

if (!result.ok) {
  console.error(`error: ${result.error.message}`);
  if (result.error.hint) console.error(`hint: ${result.error.hint}`);
  process.exitCode = result.error.code === "VALIDATION" ? 6 : 1;
} else {
  console.log(`Artifacts JSON: ${result.data.files.artifactsJson}`);
  for (const markdownPath of result.data.files.artifactMarkdown) {
    console.log(`Artifact Markdown: ${markdownPath}`);
  }
}
