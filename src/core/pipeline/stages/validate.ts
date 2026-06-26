import type { Artifact } from "../../domain/artifact.js";
import { ArtifactSchema } from "../../domain/artifact.js";

export type ArtifactValidationResult =
  | { ok: true; artifacts: Artifact[] }
  | { ok: false; message: string; issues: string[] };

export function validateArtifacts(artifacts: Artifact[]): ArtifactValidationResult {
  const validated: Artifact[] = [];
  const issues: string[] = [];
  for (const artifact of artifacts) {
    const parsed = ArtifactSchema.safeParse(artifact);
    if (!parsed.success) {
      issues.push(...parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      continue;
    }
    validated.push(parsed.data);
  }
  if (issues.length > 0) return { ok: false, message: "Artifact validation failed", issues };
  return { ok: true, artifacts: validated };
}
