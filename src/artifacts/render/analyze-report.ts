import type { IssueAnalysis } from "../../core/domain/analysis.js";

function list(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None detected.";
}

export function renderAnalyzeReport(analysis: IssueAnalysis): string {
  const context = analysis.context;
  const affectedFiles = context.affectedFiles.map((file) => `${file.path} ~heuristic confidence=${file.confidence.toFixed(2)} reason=${file.reason}`);
  const risks = context.riskHotspots.map((risk) => `${risk.severity}: ${risk.description}`);
  const frameworks = context.stack.frameworks.map((framework) => `${framework.name} (${framework.confidence.toFixed(2)})`);
  const tests = context.stack.testFrameworks.map((framework) => `${framework.name} (${framework.confidence.toFixed(2)})`);
  const degraded = analysis.degraded ? `\n## Degraded\n${list(analysis.degraded.reasons)}\n` : "";
  return `# Issue2Dev Analyze Prototype\n\nThis is a Phase 4 offline prototype report using no-provider deterministic analysis.\n\n## Issue\n- Class: ${analysis.classification.class}\n- Confidence: ${analysis.classification.confidence.toFixed(2)}\n\n## Repository\n- Name: ${context.repo.ref.name}\n- Type: ${context.repo.type}\n- Languages: ${context.repo.languages.map((language) => `${language.name} ${(language.share * 100).toFixed(1)}%`).join(", ")}\n- Package manager: ${context.stack.packageManager}\n- Frameworks: ${frameworks.join(", ") || "none"}\n- Test frameworks: ${tests.join(", ") || "none"}\n- Architecture: ${context.architecture.pattern} ~heuristic confidence=${context.architecture.confidence.toFixed(2)}\n\n## Scores\n- Severity: ${analysis.severity.value}\n- Impact: ${analysis.impact.value}\n- Risk: ${analysis.risk.value}\n- Priority: ${analysis.priority.value}\n- Estimate: ${analysis.estimate.value}\n\n## Likely Affected Files\n${list(affectedFiles)}\n\n## Risks\n${list(risks)}\n${degraded}\n## Summary\nNo-provider deterministic analysis produced a repository-aware context and report from local fixture input.\n`;
}