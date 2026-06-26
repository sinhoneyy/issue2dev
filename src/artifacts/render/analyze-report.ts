import type { IssueAnalysis } from "../../core/domain/analysis.js";
import type { Diagnosis } from "../../core/domain/diagnosis.js";
import type { RepositoryContext, SourceRef } from "../../core/domain/repository-context.js";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function list(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function evidenceText(evidence: SourceRef[]): string {
  if (evidence.length === 0) return "no specific evidence recorded";
  return evidence.map((item) => item.path ?? item.field ?? item.description).join(", ");
}

function repositoryIntelligence(context: RepositoryContext): string {
  const frameworks = context.stack.frameworks.map((framework) => `${framework.name} (${pct(framework.confidence)})`);
  const tests = context.stack.testFrameworks.map((framework) => `${framework.name} (${pct(framework.confidence)})`);
  return [
    `- Repository: ${context.repo.ref.owner ? `${context.repo.ref.owner}/` : ""}${context.repo.ref.name}`,
    `- Type: ${context.repo.type}`,
    `- Languages: ${context.repo.languages.map((language) => `${language.name} ${(language.share * 100).toFixed(1)}%`).join(", ")}`,
    `- Package manager: ${context.stack.packageManager}`,
    `- Frameworks: ${frameworks.join(", ") || "none"}`,
    `- Test frameworks: ${tests.join(", ") || "none"}`,
    `- Architecture: ${context.architecture.pattern} (${pct(context.architecture.confidence)}, heuristic)`
  ].join("\n");
}

function rootCauseSection(diagnosis: Diagnosis): string {
  return diagnosis.rootCauseHypotheses.map((hypothesis, index) => [
    `### Hypothesis ${index + 1} (confidence ${pct(hypothesis.confidence)}, heuristic)`,
    hypothesis.summary,
    `- Reasoning: ${hypothesis.reasoning}`,
    `- Affected files: ${hypothesis.affectedFiles.join(", ") || "none identified"}`,
    `- Evidence: ${evidenceText(hypothesis.evidence)}`,
    `- Limitations: ${hypothesis.limitations.join("; ")}`
  ].join("\n")).join("\n\n");
}

function solutionSection(diagnosis: Diagnosis): string {
  const strategy = diagnosis.solutionStrategy;
  return [
    `${strategy.summary} (confidence ${pct(strategy.confidence)}, heuristic)`,
    "",
    "Steps:",
    list(strategy.steps),
    "",
    `Likely files to touch: ${strategy.affectedFiles.join(", ") || "none above the confidence floor"}`,
    `Rollback: ${strategy.rollbackNotes}`
  ].join("\n");
}

function implementationSection(diagnosis: Diagnosis): string {
  const plan = diagnosis.implementationPlan;
  const fileTouch = plan.fileTouchPlan.length > 0
    ? plan.fileTouchPlan.map((file) => `- ${file.path} — ${file.intent} (confidence ${pct(file.confidence)})`).join("\n")
    : "- No specific files identified above the confidence floor.";
  return [
    "Tasks:",
    list(plan.tasks),
    "",
    "File touch plan:",
    fileTouch,
    "",
    "Validation commands:",
    list(plan.validationCommands),
    "",
    "Manual QA:",
    list(plan.manualQa),
    "",
    "Open questions:",
    list(plan.openQuestions)
  ].join("\n");
}

function testSection(diagnosis: Diagnosis): string {
  const test = diagnosis.testStrategy;
  return [
    `- Detected framework: ${test.framework}`,
    `- Test commands: ${test.commands.join(", ") || "not detected"}`,
    ...test.recommendations.map((item) => `- ${item}`)
  ].join("\n");
}

function risksSection(diagnosis: Diagnosis): string {
  return diagnosis.risks.length > 0
    ? diagnosis.risks.map((risk) => `- ${risk.severity}: ${risk.description} (${pct(risk.confidence)})`).join("\n")
    : "- None identified.";
}

export function renderAnalyzeReport(analysis: IssueAnalysis): string {
  const context = analysis.context;
  const diagnosis = analysis.diagnosis;
  const repository = `${context.repo.ref.owner ? `${context.repo.ref.owner}/` : ""}${context.repo.ref.name}`;
  return [
    "# Issue2Dev Analysis",
    "",
    "Deterministic, no-provider analysis. Issue text is treated as untrusted input and is never executed.",
    "",
    "## Summary",
    `Repository-aware analysis of a ${analysis.classification.class} issue (classification confidence ${pct(analysis.classification.confidence)}) for ${repository}.`,
    `Scores — severity: ${analysis.severity.value}, impact: ${analysis.impact.value}, risk: ${analysis.risk.value}, priority: ${analysis.priority.value}, estimate: ${analysis.estimate.value}.`,
    "",
    "## Repository Intelligence",
    repositoryIntelligence(context),
    "",
    "## Root Cause Hypotheses",
    rootCauseSection(diagnosis),
    "",
    "## Recommended Solution Strategy",
    solutionSection(diagnosis),
    "",
    "## Implementation Plan",
    implementationSection(diagnosis),
    "",
    "## Test Strategy",
    testSection(diagnosis),
    "",
    "## Risks",
    risksSection(diagnosis),
    "",
    "## Confidence",
    `- Analysis confidence: ${pct(analysis.confidence)}`,
    `- Diagnosis confidence: ${pct(diagnosis.confidence)}`,
    "",
    "## Limitations",
    list(diagnosis.limitations),
    ""
  ].join("\n");
}
