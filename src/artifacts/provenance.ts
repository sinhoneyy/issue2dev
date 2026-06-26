import { createHash } from "node:crypto";
import type { ArtifactProvenance } from "../core/domain/artifact.js";
import type { RepositoryContext, SourceRef } from "../core/domain/repository-context.js";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contentHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createArtifactProvenance(input: { context: RepositoryContext; sources: SourceRef[]; body: unknown }): ArtifactProvenance {
  return {
    sources: input.sources,
    derivedFromUntrusted: Boolean(input.context.issue),
    mode: "no-provider deterministic",
    toolVersion: "0.0.0",
    contentHash: contentHash({ contextSchemaVersion: input.context.schemaVersion, body: input.body, sources: input.sources })
  };
}
