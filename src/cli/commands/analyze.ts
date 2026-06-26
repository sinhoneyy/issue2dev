import path from "node:path";
import { runAnalyzeCli } from "../../core/pipeline/pipeline.js";
import type { ParsedAnalyzeArgs } from "../args.js";

export async function runAnalyzeCommand(args: ParsedAnalyzeArgs): Promise<number> {
  const result = await runAnalyzeCli({ fromFile: path.resolve(args.fromFile), outDir: path.resolve(args.outDir) });
  if (!result.ok) {
    console.error(`error: ${result.error.message}`);
    if (result.error.hint) console.error(`hint: ${result.error.hint}`);
    return result.error.code === "USAGE" ? 2 : result.error.code === "VALIDATION" ? 6 : 1;
  }

  console.log(`Repository context: ${result.data.files.repositoryContext}`);
  console.log(`Analysis JSON: ${result.data.files.analysisJson}`);
  console.log(`Analysis report: ${result.data.files.analysisMarkdown}`);
  console.log(`Artifacts JSON: ${result.data.files.artifactsJson}`);
  for (const markdownPath of result.data.files.artifactMarkdown) {
    console.log(`Artifact Markdown: ${markdownPath}`);
  }
  return 0;
}
