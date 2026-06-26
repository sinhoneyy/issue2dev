import { z } from "zod";
import { ArtifactNameSchema, ArtifactSchema } from "./artifact.js";
import { IssueClassSchema } from "./issue.js";

export const ArtifactPlanItemSchema = z.object({
  type: ArtifactNameSchema,
  reason: z.string().min(1)
});
export type ArtifactPlanItem = z.infer<typeof ArtifactPlanItemSchema>;

export const ArtifactPlanSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  issueClass: IssueClassSchema,
  complexity: z.enum(["low", "medium", "high"]),
  items: z.array(ArtifactPlanItemSchema).min(1),
  rationale: z.array(z.string().min(1))
});
export type ArtifactPlan = z.infer<typeof ArtifactPlanSchema>;

export const GenerateOutcomeSchema = z.object({
  schemaVersion: z.literal("0.1.0"),
  plan: ArtifactPlanSchema,
  artifacts: z.array(ArtifactSchema),
  files: z.object({
    artifactsJson: z.string(),
    artifactMarkdown: z.array(z.string())
  })
});
export type GenerateOutcome = z.infer<typeof GenerateOutcomeSchema>;
