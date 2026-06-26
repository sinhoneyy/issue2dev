import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderAnalyzeReport } from "../../../artifacts/render/analyze-report.js";
import { renderArtifactMarkdown } from "../../../artifacts/render/artifact-markdown.js";
import type { Artifact } from "../../domain/artifact.js";
import type { IssueAnalysis } from "../../domain/analysis.js";
import type { RepositoryContext } from "../../domain/repository-context.js";

export type EmitArtifactsOutput = {
  artifactsJson: string;
  artifactMarkdown: string[];
};

export type EmitAnalyzeAndArtifactsOutput = EmitArtifactsOutput & {
  repositoryContext: string;
  analysisJson: string;
  analysisMarkdown: string;
};

function assertSafeIssue2DevOutputDir(outDir: string): string {
  const resolved = path.resolve(outDir);
  const parts = resolved.split(path.sep);
  if (!parts.includes(".issue2dev")) {
    throw new Error("Outputs must be written under a .issue2dev directory.");
  }
  return resolved;
}

export async function emitArtifacts(input: { artifacts: Artifact[]; outDir: string }): Promise<EmitArtifactsOutput> {
  const outDir = assertSafeIssue2DevOutputDir(input.outDir);
  await mkdir(outDir, { recursive: true });
  const artifactsJson = path.join(outDir, "artifacts.json");
  await writeFile(artifactsJson, `${JSON.stringify(input.artifacts, null, 2)}\n`, "utf8");
  const artifactMarkdown: string[] = [];
  for (const artifact of input.artifacts) {
    const filePath = path.join(outDir, `${artifact.type}.md`);
    await writeFile(filePath, renderArtifactMarkdown(artifact), "utf8");
    artifactMarkdown.push(filePath);
  }
  return { artifactsJson, artifactMarkdown };
}

export async function emitAnalyzeAndArtifacts(input: { context: RepositoryContext; analysis: IssueAnalysis; artifacts: Artifact[]; outDir: string }): Promise<EmitAnalyzeAndArtifactsOutput> {
  const outDir = assertSafeIssue2DevOutputDir(input.outDir);
  await mkdir(outDir, { recursive: true });
  const repositoryContext = path.join(outDir, "repository-context.json");
  const analysisJson = path.join(outDir, "analysis.json");
  const analysisMarkdown = path.join(outDir, "analysis.md");
  await writeFile(repositoryContext, `${JSON.stringify(input.context, null, 2)}\n`, "utf8");
  await writeFile(analysisJson, `${JSON.stringify(input.analysis, null, 2)}\n`, "utf8");
  await writeFile(analysisMarkdown, renderAnalyzeReport(input.analysis), "utf8");
  const artifactFiles = await emitArtifacts({ artifacts: input.artifacts, outDir });
  return { repositoryContext, analysisJson, analysisMarkdown, ...artifactFiles };
}
