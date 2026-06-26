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

  return [
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
    `## Likely Affected Files`,
    affectedFiles,
    "",
    `## Risks`,
    risks,
    "",
    `## Acceptance Checks`,
    ...body.acceptanceChecks.map((item) => `- ${escapeMarkdown(item)}`),
    "",
    `## Caveats`,
    ...body.caveats.map((item) => `- ${escapeMarkdown(item)}`)
  ].join("\n");
}

export function renderArtifactMarkdown(artifact: Artifact): string {
  return [`# ${escapeMarkdown(artifact.title)}`, "", renderPrdBody(artifact.body), "", "## Provenance", `- Mode: ${artifact.provenance.mode}`, `- Derived from untrusted input: ${artifact.provenance.derivedFromUntrusted ? "yes" : "no"}`, `- Content hash: ${artifact.provenance.contentHash}`, ""].join("\n");
}
