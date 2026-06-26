import { z } from "zod";
import { SourceRefSchema } from "./repository-context.js";

export const DIAGNOSIS_SCHEMA_VERSION = "0.1.0";
const ConfidenceSchema = z.number().min(0).max(1);

// A hypothesis about where/why the issue originates. Always heuristic, never certain.
export const RootCauseHypothesisSchema = z.object({
  summary: z.string().min(1),
  confidence: ConfidenceSchema,
  evidence: z.array(SourceRefSchema),
  affectedFiles: z.array(z.string()),
  reasoning: z.string().min(1),
  limitations: z.array(z.string())
});
export type RootCauseHypothesis = z.infer<typeof RootCauseHypothesisSchema>;

export const SolutionStrategySchema = z.object({
  summary: z.string().min(1),
  steps: z.array(z.string()),
  affectedFiles: z.array(z.string()),
  testRecommendations: z.array(z.string()),
  risks: z.array(z.string()),
  rollbackNotes: z.string().min(1),
  confidence: ConfidenceSchema,
  evidence: z.array(SourceRefSchema)
});
export type SolutionStrategy = z.infer<typeof SolutionStrategySchema>;

export const FileTouchSchema = z.object({
  path: z.string().min(1),
  intent: z.string().min(1),
  confidence: ConfidenceSchema
});
export type FileTouch = z.infer<typeof FileTouchSchema>;

export const ImplementationPlanSchema = z.object({
  tasks: z.array(z.string()),
  fileTouchPlan: z.array(FileTouchSchema),
  validationCommands: z.array(z.string()),
  manualQa: z.array(z.string()),
  openQuestions: z.array(z.string())
});
export type ImplementationPlan = z.infer<typeof ImplementationPlanSchema>;

export const TestStrategySchema = z.object({
  framework: z.string().min(1),
  recommendations: z.array(z.string()),
  commands: z.array(z.string())
});
export type TestStrategy = z.infer<typeof TestStrategySchema>;

export const DiagnosisRiskSchema = z.object({
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  confidence: ConfidenceSchema,
  evidence: z.array(SourceRefSchema)
});
export type DiagnosisRisk = z.infer<typeof DiagnosisRiskSchema>;

export const DiagnosisSchema = z.object({
  schemaVersion: z.literal(DIAGNOSIS_SCHEMA_VERSION),
  rootCauseHypotheses: z.array(RootCauseHypothesisSchema),
  solutionStrategy: SolutionStrategySchema,
  implementationPlan: ImplementationPlanSchema,
  testStrategy: TestStrategySchema,
  risks: z.array(DiagnosisRiskSchema),
  confidence: ConfidenceSchema,
  limitations: z.array(z.string())
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
