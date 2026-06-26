import { z } from "zod";
import { DiagnosisSchema } from "./diagnosis.js";
import { DegradedInfoSchema, IssueClassificationSchema, RepositoryContextSchema } from "./repository-context.js";

export const ScoreSchema = z.object({
  value: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string()),
  rationale: z.string()
});
export type Score = z.infer<typeof ScoreSchema>;

export const EstimateSchema = z.object({
  value: z.enum(["XS", "S", "M", "L", "XL"]),
  rationale: z.string()
});
export type Estimate = z.infer<typeof EstimateSchema>;

export const IssueAnalysisSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  context: RepositoryContextSchema,
  classification: IssueClassificationSchema,
  severity: ScoreSchema,
  impact: ScoreSchema,
  risk: ScoreSchema,
  priority: ScoreSchema,
  estimate: EstimateSchema,
  diagnosis: DiagnosisSchema,
  confidence: z.number().min(0).max(1),
  degraded: DegradedInfoSchema.optional()
});
export type IssueAnalysis = z.infer<typeof IssueAnalysisSchema>;