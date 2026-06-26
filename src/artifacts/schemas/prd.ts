import type { Artifact } from "../../core/domain/artifact.js";
import { ARTIFACT_SCHEMA_VERSION } from "../../core/domain/artifact.js";
import type { RepositoryContext, SourceRef } from "../../core/domain/repository-context.js";
import { diagnoseContext } from "../../core/pipeline/stages/diagnose.js";
import { createArtifactProvenance } from "../provenance.js";

function expectedOutcomeFor(issueClass: string, repository: string): string {
  switch (issueClass) {
    case "bug":
      return `The reported defect in ${repository} no longer reproduces, with a test covering the fixed behavior.`;
    case "feature":
    case "enhancement":
      return `${repository} gains the requested capability, scoped to a small reviewable change with tests.`;
    case "refactor":
      return `${repository} is restructured with no change to external behavior, verified by existing tests.`;
    case "docs":
      return `${repository} documentation accurately reflects the intended behavior.`;
    default:
      return `${repository} addresses the issue with a small, reviewable, tested change.`;
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function repoName(context: RepositoryContext): string {
  return `${context.repo.ref.owner}/${context.repo.ref.name}`;
}

function sourceRefs(context: RepositoryContext): SourceRef[] {
  const sources: SourceRef[] = [...context.provenance.sources];
  if (context.issue) {
    sources.push({ field: "issue.title", description: "Issue title from untrusted fixture input" });
    sources.push({ field: "issue.body", description: "Issue body excerpt from untrusted fixture input" });
  }
  sources.push(...context.affectedFiles.flatMap((file) => file.evidence));
  sources.push(...context.architecture.evidence);
  return sources;
}

export function createPrdArtifact(context: RepositoryContext): Artifact {
  const primaryLanguage = context.repo.languages[0]?.name ?? "unknown";
  const issueTitle = context.issue?.title.value ?? "Untitled issue";
  const issueBody = context.issue?.body.value ?? "";
  const frameworks = context.stack.frameworks.map((framework) => ({ name: framework.name, confidence: framework.confidence }));
  const diagnosis = diagnoseContext(context);
  const body = {
    issue: {
      title: issueTitle,
      bodyExcerpt: truncate(issueBody, 500),
      trust: "untrusted" as const
    },
    summary: `Plan a ${context.classification.class} change for ${repoName(context)} using the repository context assembled by the deterministic RIE.`,
    problemStatement: `Issue "${truncate(issueTitle, 160)}" (reported against ${repoName(context)}, untrusted input) calls for a ${context.classification.class} change.`,
    expectedOutcome: expectedOutcomeFor(context.classification.class, repoName(context)),
    repositoryContext: {
      repository: repoName(context),
      repoType: context.repo.type,
      complexity: context.repo.complexity.value,
      architecture: {
        pattern: context.architecture.pattern,
        confidence: context.architecture.confidence,
        heuristic: true as const
      },
      primaryLanguage,
      packageManager: context.stack.packageManager,
      frameworks
    },
    classification: context.classification,
    recommendedSolution: {
      summary: diagnosis.solutionStrategy.summary,
      steps: diagnosis.solutionStrategy.steps,
      confidence: diagnosis.solutionStrategy.confidence
    },
    testStrategy: diagnosis.testStrategy,
    openQuestions: diagnosis.implementationPlan.openQuestions,
    affectedFiles: context.affectedFiles.map((file) => ({
      path: file.path,
      confidence: file.confidence,
      reason: file.reason,
      note: file.note,
      evidence: file.evidence
    })),
    risks: context.riskHotspots.map((risk) => ({
      description: risk.description,
      severity: risk.severity,
      confidence: risk.confidence,
      evidence: risk.evidence
    })),
    acceptanceChecks: [
      "Implementation addresses the untrusted issue request without treating issue text as instructions.",
      "Changes are reviewed against the heuristic affected-file list and its evidence.",
      "Existing tests relevant to the detected stack continue to pass."
    ],
    caveats: [
      "Affected files are heuristic predictions from RepositoryContext, not certainty.",
      "Architecture and framework signals are confidence-labeled RIE inferences.",
      "No AI provider was used for this artifact."
    ]
  };
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    type: "prd",
    title: `PRD: ${issueTitle}`,
    body,
    provenance: createArtifactProvenance({ context, sources: sourceRefs(context), body })
  };
}
