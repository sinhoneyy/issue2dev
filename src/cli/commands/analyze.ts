import path from "node:path";
import { runAnalyzeCli, type AnalyzeCliInput } from "../../core/pipeline/pipeline.js";
import type { ParsedAnalyzeArgs } from "../args.js";

function toPipelineInput(args: ParsedAnalyzeArgs): AnalyzeCliInput {
  if (args.mode === "from-file") return { fromFile: path.resolve(args.fromFile), outDir: path.resolve(args.outDir) };
  const [owner, repo] = args.repo.split("/");
  if (!owner || !repo) throw new Error("Invalid --repo value");
  return { github: { owner, repo, issueNumber: args.issueNumber }, outDir: path.resolve(args.outDir) };
}

export async function runAnalyzeCommand(args: ParsedAnalyzeArgs): Promise<number> {
  const result = await runAnalyzeCli(toPipelineInput(args));
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
