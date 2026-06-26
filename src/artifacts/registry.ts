import type { ArtifactName } from "../core/domain/artifact.js";
import { createPrdArtifact } from "./schemas/prd.js";

export type ArtifactGenerator = typeof createPrdArtifact;

const artifactRegistry = {
  prd: createPrdArtifact
} satisfies Record<ArtifactName, ArtifactGenerator>;

export function getArtifactGenerator(type: ArtifactName): ArtifactGenerator {
  return artifactRegistry[type];
}

export function listArtifactTypes(): ArtifactName[] {
  return ["prd"];
}
