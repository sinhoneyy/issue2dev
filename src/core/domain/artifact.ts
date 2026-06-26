import { z } from "zod";
import { SourceRefSchema } from "./repository-context.js";

export const ARTIFACT_SCHEMA_VERSION = "0.1.0";

export const ArtifactNameSchema = z.enum(["prd"]);
export type ArtifactName = z.infer<typeof ArtifactNameSchema>;

export const ArtifactProvenanceSchema = z.object({
  sources: z.array(SourceRefSchema),
  derivedFromUntrusted: z.boolean(),
  mode: z.literal("no-provider deterministic"),
  toolVersion: z.string().min(1),
  contentHash: z.string().min(1)
});
export type ArtifactProvenance = z.infer<typeof ArtifactProvenanceSchema>;

export const PrdArtifactBodySchema = z.object({
  issue: z.object({
    title: z.string(),
    bodyExcerpt: z.string(),
    trust: z.literal("untrusted")
  }),
  summary: z.string().min(1),
  repositoryContext: z.object({
    repository: z.string().min(1),
    repoType: z.string().min(1),
    complexity: z.enum(["low", "medium", "high"]),
    architecture: z.object({
      pattern: z.string().min(1),
      confidence: z.number().min(0).max(1),
      heuristic: z.literal(true)
    }),
    primaryLanguage: z.string().min(1),
    packageManager: z.string().min(1),
    frameworks: z.array(z.object({ name: z.string().min(1), confidence: z.number().min(0).max(1) }))
  }),
  classification: z.object({
    class: z.string().min(1),
    confidence: z.number().min(0).max(1),
    signals: z.array(z.string())
  }),
  affectedFiles: z.array(z.object({
    path: z.string().min(1),
    confidence: z.number().min(0).max(1),
    reason: z.string().min(1),
    note: z.literal("heuristic"),
    evidence: z.array(SourceRefSchema)
  })),
  risks: z.array(z.object({
    description: z.string().min(1),
    severity: z.enum(["low", "medium", "high"]),
    confidence: z.number().min(0).max(1),
    evidence: z.array(SourceRefSchema)
  })),
  acceptanceChecks: z.array(z.string().min(1)),
  caveats: z.array(z.string().min(1))
});
export type PrdArtifactBody = z.infer<typeof PrdArtifactBodySchema>;

export const ArtifactSchema = z.object({
  schemaVersion: z.literal(ARTIFACT_SCHEMA_VERSION),
  type: ArtifactNameSchema,
  title: z.string().min(1),
  body: PrdArtifactBodySchema,
  provenance: ArtifactProvenanceSchema
});
export type Artifact = z.infer<typeof ArtifactSchema>;
