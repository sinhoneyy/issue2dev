import path from "node:path";
import { runAnalyzePrototype } from "../src/core/pipeline/pipeline.js";

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
const outDir = path.resolve(readFlag("--out", ".issue2dev/phase4"));
const result = await runAnalyzePrototype({ fromFile, outDir });

if (!result.ok) {
  console.error(`error: ${result.error.message}`);
  if (result.error.hint) console.error(`hint: ${result.error.hint}`);
  process.exitCode = 1;
} else {
  console.log(`Repository context: ${result.data.files.repositoryContext}`);
  console.log(`Analysis JSON: ${result.data.files.analysisJson}`);
  console.log(`Analysis report: ${result.data.files.analysisMarkdown}`);
}