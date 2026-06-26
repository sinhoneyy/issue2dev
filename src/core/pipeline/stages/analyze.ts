import { IssueAnalysisSchema, type IssueAnalysis, type Score } from "../../domain/analysis.js";
import type { RepositoryContext } from "../../domain/repository-context.js";
import { diagnoseContext } from "./diagnose.js";

function score(value: Score["value"], confidence: number, signals: string[], rationale: string): Score {
  return { value, confidence, signals, rationale };
}

export function analyzeContext(context: RepositoryContext): IssueAnalysis {
  const sensitiveRisk = context.riskHotspots.some((risk) => risk.severity === "high");
  const affectedCount = context.affectedFiles.length;
  const riskValue = sensitiveRisk ? "high" : affectedCount > 3 ? "medium" : "low";
  const impactValue = affectedCount > 3 || context.repo.type === "service" ? "medium" : "low";
  const priorityValue = context.classification.class === "bug" && riskValue !== "low" ? "high" : context.classification.class === "bug" ? "medium" : "low";
  const estimateValue = affectedCount > 5 ? "M" : affectedCount > 2 ? "S" : "XS";
  const analysis = {
    schemaVersion: "0.1.0" as const,
    context,
    classification: context.classification,
    severity: score(priorityValue, context.classification.confidence, context.classification.signals, "Derived from deterministic classification and RIE risk signals."),
    impact: score(impactValue, 0.62, [`${affectedCount} likely affected files`, `repo type: ${context.repo.type}`], "Estimated from affected-file count and repository type."),
    risk: score(riskValue, 0.66, context.riskHotspots.map((risk) => risk.description), "Estimated from deterministic RIE risk hotspots."),
    priority: score(priorityValue, 0.6, [context.classification.class, riskValue], "Prototype priority combines issue class and risk."),
    estimate: { value: estimateValue, rationale: "Prototype estimate is based on likely affected-file count only." },
    diagnosis: diagnoseContext(context),
    confidence: Number(((context.classification.confidence + context.architecture.confidence) / 2).toFixed(2)),
    ...(context.degraded ? { degraded: context.degraded } : {})
  };
  return IssueAnalysisSchema.parse(analysis);
}