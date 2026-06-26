import { getArtifactGenerator } from "../../../artifacts/registry.js";
import type { Artifact } from "../../domain/artifact.js";
import type { ArtifactPlan } from "../../domain/generation.js";
import type { RepositoryContext } from "../../domain/repository-context.js";

export function generateArtifacts(input: { context: RepositoryContext; plan: ArtifactPlan }): Artifact[] {
  return input.plan.items.map((item) => getArtifactGenerator(item.type)(input.context));
}
