import type { Artifact, PrdArtifactBody } from "../../core/domain/artifact.js";

function escapeMarkdown(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function confidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function renderEvidence(evidence: PrdArtifactBody["affectedFiles"][number]["evidence"]): string {
  if (evidence.length === 0) return "No specific evidence recorded.";
  return evidence.map((item) => escapeMarkdown(item.path ?? item.field ?? item.description)).join(", ");
}

function renderPrdBody(body: PrdArtifactBody): string {
  const frameworks = body.repositoryContext.frameworks.length > 0
    ? body.repositoryContext.frameworks.map((item) => `${escapeMarkdown(item.name)} (${confidence(item.confidence)})`).join(", ")
    : "None detected";
  const affectedFiles = body.affectedFiles.length > 0
    ? body.affectedFiles.map((file) => `- ${escapeMarkdown(file.path)} - heuristic ${confidence(file.confidence)} via ${file.reason}. Evidence: ${renderEvidence(file.evidence)}`).join("\n")
    : "- No likely affected files identified by the deterministic RIE.";
  const risks = body.risks.length > 0
    ? body.risks.map((risk) => `- ${risk.severity}: ${escapeMarkdown(risk.description)} (${confidence(risk.confidence)}). Evidence: ${renderEvidence(risk.evidence)}`).join("\n")
    : "- No risk hotspots identified by the deterministic RIE.";

  const testCommands = body.testStrategy.commands.length > 0 ? body.testStrategy.commands.map((command) => `\`${escapeMarkdown(command)}\``).join(", ") : "not detected";

  return [
    `## Problem Statement`,
    escapeMarkdown(body.problemStatement),
    "",
    `## Expected Outcome`,
    escapeMarkdown(body.expectedOutcome),
    "",
    `## Summary`,
    escapeMarkdown(body.summary),
    "",
    `## Untrusted Issue Input`,
    `Title: ${escapeMarkdown(body.issue.title)}`,
    "",
    "```text",
    body.issue.bodyExcerpt,
    "```",
    "",
    `## Repository Context`,
    `- Repository: ${escapeMarkdown(body.repositoryContext.repository)}`,
    `- Type: ${body.repositoryContext.repoType}`,
    `- Complexity: ${body.repositoryContext.complexity}`,
    `- Primary language: ${escapeMarkdown(body.repositoryContext.primaryLanguage)}`,
    `- Package manager: ${body.repositoryContext.packageManager}`,
    `- Frameworks: ${frameworks}`,
    `- Architecture: ${body.repositoryContext.architecture.pattern} (${confidence(body.repositoryContext.architecture.confidence)}, heuristic)`,
    "",
    `## Classification`,
    `- Class: ${body.classification.class}`,
    `- Confidence: ${confidence(body.classification.confidence)}`,
    `- Signals: ${body.classification.signals.map(escapeMarkdown).join(", ") || "none"}`,
    "",
    `## Recommended Solution`,
    `${escapeMarkdown(body.recommendedSolution.summary)} (confidence: ${confidence(body.recommendedSolution.confidence)}, heuristic)`,
    ...body.recommendedSolution.steps.map((step) => `- ${escapeMarkdown(step)}`),
    "",
    `## Likely Affected Files`,
    affectedFiles,
    "",
    `## Acceptance Criteria`,
    ...body.acceptanceChecks.map((item) => `- ${escapeMarkdown(item)}`),
    "",
    `## Test Strategy`,
    `- Framework: ${escapeMarkdown(body.testStrategy.framework)}`,
    `- Commands: ${testCommands}`,
    ...body.testStrategy.recommendations.map((item) => `- ${escapeMarkdown(item)}`),
    "",
    `## Risks`,
    risks,
    "",
    `## Open Questions`,
    ...(body.openQuestions.length > 0 ? body.openQuestions.map((item) => `- ${escapeMarkdown(item)}`) : ["- None recorded."]),
    "",
    `## Caveats`,
    ...body.caveats.map((item) => `- ${escapeMarkdown(item)}`)
  ].join("\n");
}

export function renderArtifactMarkdown(artifact: Artifact): string {
  return [`# ${escapeMarkdown(artifact.title)}`, "", renderPrdBody(artifact.body), "", "## Provenance", `- Mode: ${artifact.provenance.mode}`, `- Derived from untrusted input: ${artifact.provenance.derivedFromUntrusted ? "yes" : "no"}`, `- Content hash: ${artifact.provenance.contentHash}`, ""].join("\n");
}
