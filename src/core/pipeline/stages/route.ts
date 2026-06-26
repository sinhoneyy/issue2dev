import type { IssueClass } from "../../domain/issue.js";
import type { RepositoryContext } from "../../domain/repository-context.js";
import type { ArtifactPlan } from "../../domain/generation.js";

const ROUTE_REASONS: Record<IssueClass, string> = {
  bug: "Bug reports need a concise repository-aware PRD before implementation.",
  feature: "Feature requests need a repository-aware PRD to define scope and acceptance checks.",
  enhancement: "Enhancements need a PRD to separate desired behavior from implementation notes.",
  refactor: "Refactors need a PRD to state goals, affected areas, and validation boundaries.",
  chore: "Chores need a minimal PRD to capture operational intent and affected surfaces.",
  docs: "Documentation work needs a PRD to anchor audience, scope, and affected docs.",
  question: "Questions need a minimal PRD-style answer plan when converted into implementation work.",
  epic: "Epics need a PRD foundation before later task breakdown artifacts exist.",
  security: "Security issues need a careful PRD with provenance and caveats before any public artifact expansion.",
  duplicate: "Duplicates still get a minimal PRD record of the deterministic analysis."
};

export function routeArtifacts(context: RepositoryContext): ArtifactPlan {
  const issueClass = context.classification.class;
  const complexity = context.repo.complexity.value;
  return {
    schemaVersion: "0.1.0",
    issueClass,
    complexity,
    items: [
      {
        type: "prd",
        reason: ROUTE_REASONS[issueClass]
      }
    ],
    rationale: [
      `classification=${issueClass}`,
      `classificationConfidence=${context.classification.confidence}`,
      `repositoryComplexity=${complexity}`,
      "v0.1 supports the deterministic PRD artifact only"
    ]
  };
}
