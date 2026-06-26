import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderArtifactMarkdown } from "../../../artifacts/render/artifact-markdown.js";
import type { Artifact } from "../../domain/artifact.js";

export type EmitArtifactsOutput = {
  artifactsJson: string;
  artifactMarkdown: string[];
};

function assertSafeIssue2DevOutputDir(outDir: string): string {
  const resolved = path.resolve(outDir);
  const parts = resolved.split(path.sep);
  if (!parts.includes(".issue2dev")) {
    throw new Error("Phase 5 outputs must be written under a .issue2dev directory.");
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
