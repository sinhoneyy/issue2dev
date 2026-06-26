import { describe, expect, it } from "vitest";
import { ArtifactSchema } from "../../src/core/domain/artifact.js";
import { createPrdArtifact } from "../../src/artifacts/schemas/prd.js";
import { renderArtifactMarkdown } from "../../src/artifacts/render/artifact-markdown.js";
import { createDeterministicIntelligenceEngine } from "../../src/intelligence/engine.js";
import { nodeServiceIssue, nodeServiceRepo } from "../intelligence/__fixtures__/node-service.js";

describe("PRD artifact", () => {
  it("is generated from RepositoryContext with provenance and heuristic caveats", async () => {
    const context = await createDeterministicIntelligenceEngine().analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });
    const artifact = createPrdArtifact(context);
    expect(ArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(artifact.type).toBe("prd");
    expect(artifact.body.issue.trust).toBe("untrusted");
    expect(artifact.body.repositoryContext.repository).toBe("acme/checkout-service");
    expect(artifact.body.affectedFiles.every((file) => file.note === "heuristic")).toBe(true);
    expect(artifact.provenance.derivedFromUntrusted).toBe(true);
    expect(artifact.provenance.mode).toBe("no-provider deterministic");
  });

  it("renders deterministic Markdown with untrusted input fenced", async () => {
    const context = await createDeterministicIntelligenceEngine().analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });
    const artifact = createPrdArtifact(context);
    const first = renderArtifactMarkdown(artifact);
    const second = renderArtifactMarkdown(artifact);
    expect(first).toEqual(second);
    expect(first).toContain("## Untrusted Issue Input");
    expect(first).toContain("```text");
    expect(first).toContain("heuristic");
    expect(first).toContain("No AI provider was used");
  });
});
