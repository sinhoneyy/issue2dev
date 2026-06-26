import { DiagnosisSchema, type Diagnosis, type DiagnosisRisk, type RootCauseHypothesis, type SolutionStrategy, type TestStrategy } from "../../domain/diagnosis.js";
import type { AffectedFile, RepositoryContext } from "../../domain/repository-context.js";
import { buildImplementationPlan, buildTestStrategy } from "./plan.js";

// Only files at/above this heuristic confidence are proposed as edit targets, so the tool
// never suggests editing weakly-matched ("unknown") files with high confidence.
const EDIT_CONFIDENCE_FLOOR = 0.3;
const SEVERITY_RANK: Record<DiagnosisRisk["severity"], number> = { high: 0, medium: 1, low: 2 };

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function listPaths(files: AffectedFile[]): string {
  return files.map((file) => `\`${file.path}\``).join(", ");
}

function rootCauseSummary(issueClass: string, path: string): string {
  switch (issueClass) {
    case "bug":
      return `The reported bug likely originates in or near \`${path}\`.`;
    case "feature":
    case "enhancement":
      return `Delivering this ${issueClass} will most likely require changes in or near \`${path}\`.`;
    case "refactor":
      return `The refactor most likely centers on \`${path}\`.`;
    case "docs":
      return `The documentation change most likely involves \`${path}\`.`;
    default:
      return `Work for this ${issueClass} most likely involves \`${path}\`.`;
  }
}

function rootCauseHypotheses(context: RepositoryContext): RootCauseHypothesis[] {
  const issueClass = context.classification.class;
  if (context.affectedFiles.length === 0) {
    return [{
      summary: "Insufficient repository evidence to localize a root cause for this issue.",
      confidence: round2(Math.min(0.25, context.classification.confidence * 0.4)),
      evidence: [],
      affectedFiles: [],
      reasoning: "The deterministic affected-file analyzer did not match any repository files to the issue text, so no file-level root cause can be proposed.",
      limitations: [
        "No affected files were identified from RepositoryContext.",
        "The repository snapshot may be incomplete or the issue text may lack specific, matchable terms.",
        "This is a heuristic diagnosis produced without code execution or an AI provider."
      ]
    }];
  }
  // context.affectedFiles is already sorted by confidence desc, path asc.
  return context.affectedFiles.slice(0, 3).map((file) => ({
    summary: rootCauseSummary(issueClass, file.path),
    confidence: round2(Math.min(0.9, file.confidence * 0.6 + context.classification.confidence * 0.4)),
    evidence: file.evidence,
    affectedFiles: [file.path],
    reasoning: `Selected because the deterministic affected-file analyzer matched issue terms to this file (reason: ${file.reason}).`,
    limitations: [
      "Heuristic localization from RepositoryContext; not verified against runtime behavior or code semantics.",
      "Confidence reflects path/term matching only, not a proven causal link."
    ]
  }));
}

function solutionStrategy(context: RepositoryContext, editableFiles: AffectedFile[], testStrategy: TestStrategy): SolutionStrategy {
  const issueClass = context.classification.class;
  const hasFiles = editableFiles.length > 0;
  const topPath = editableFiles[0]?.path;

  const steps: string[] = [];
  if (issueClass === "bug") steps.push("Reproduce the reported behavior before making any changes.");
  steps.push(hasFiles
    ? `Review ${listPaths(editableFiles)} together with the cited evidence to confirm the affected area.`
    : "Locate the relevant code by reviewing the repository; automatic localization was inconclusive.");
  steps.push(hasFiles && topPath
    ? `Apply the smallest change that addresses the issue, starting with \`${topPath}\`.`
    : "Apply the smallest change that addresses the issue once the affected area is confirmed.");
  steps.push("Add or update tests that cover the changed behavior.");
  steps.push("Run the validation commands and manual QA, then review the diff for unintended changes.");

  const risks = [...new Set([
    "The affected-file localization is heuristic and may be incomplete or incorrect.",
    ...context.riskHotspots.map((risk) => risk.description)
  ])];

  const confidenceSignals = [context.classification.confidence, context.architecture.confidence, editableFiles[0]?.confidence ?? 0];
  const confidence = round2(Math.min(0.85, confidenceSignals.reduce((sum, value) => sum + value, 0) / confidenceSignals.length));

  return {
    summary: `Address the ${issueClass} with a small, targeted, reversible change to the highest-confidence affected area while preserving existing behavior.`,
    steps,
    affectedFiles: editableFiles.map((file) => file.path),
    testRecommendations: testStrategy.recommendations,
    risks,
    rollbackNotes: "Revert the change with version control (restore the modified files or revert the commit). This plan involves no data migrations or destructive operations.",
    confidence,
    evidence: [...editableFiles.flatMap((file) => file.evidence), ...context.architecture.evidence]
  };
}

function diagnosisRisks(context: RepositoryContext): DiagnosisRisk[] {
  const risks: DiagnosisRisk[] = context.riskHotspots.map((risk) => ({
    description: risk.description,
    severity: risk.severity,
    confidence: risk.confidence,
    evidence: risk.evidence
  }));
  risks.push({
    description: "Affected-file localization is heuristic; confirm the change site before editing.",
    severity: "medium",
    confidence: 0.5,
    evidence: [{ description: "deterministic affected-file analyzer (path/term matching)" }]
  });
  return risks.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.description.localeCompare(b.description));
}

function overallConfidence(context: RepositoryContext): number {
  const signals = [context.classification.confidence, context.architecture.confidence];
  if (context.affectedFiles[0]) signals.push(context.affectedFiles[0].confidence);
  let value = signals.reduce((sum, signal) => sum + signal, 0) / signals.length;
  if (context.degraded) value *= 0.7;
  if (context.affectedFiles.length === 0) value = Math.min(value, 0.3);
  return round2(Math.min(0.9, value));
}

function diagnosisLimitations(context: RepositoryContext): string[] {
  const limitations = [
    "Diagnosis is deterministic and heuristic: no code was executed and no AI provider was used.",
    "Root-cause and solution recommendations are inferred from RepositoryContext, not verified against runtime behavior.",
    "Issue text is treated as untrusted input; it is not executed or followed as instructions."
  ];
  if (context.affectedFiles.length === 0) limitations.push("No affected files were localized; recommendations are generic.");
  if (context.degraded) limitations.push(...context.degraded.reasons.map((reason) => `Degraded signal: ${reason}`));
  return limitations;
}

export function diagnoseContext(context: RepositoryContext): Diagnosis {
  const editableFiles = context.affectedFiles.filter((file) => file.confidence >= EDIT_CONFIDENCE_FLOOR).slice(0, 3);
  const testStrategy = buildTestStrategy(context);
  const diagnosis = {
    schemaVersion: "0.1.0" as const,
    rootCauseHypotheses: rootCauseHypotheses(context),
    solutionStrategy: solutionStrategy(context, editableFiles, testStrategy),
    implementationPlan: buildImplementationPlan({ context, editableFiles, testStrategy }),
    testStrategy,
    risks: diagnosisRisks(context),
    confidence: overallConfidence(context),
    limitations: diagnosisLimitations(context)
  };
  return DiagnosisSchema.parse(diagnosis);
}
