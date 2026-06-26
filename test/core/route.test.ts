import { describe, expect, it } from "vitest";
import { IssueClassSchema, type IssueClass } from "../../src/core/domain/issue.js";
import type { RepositoryContext } from "../../src/core/domain/repository-context.js";
import { createDeterministicIntelligenceEngine } from "../../src/intelligence/engine.js";
import { nodeServiceIssue, nodeServiceRepo } from "../intelligence/__fixtures__/node-service.js";
import { routeArtifacts } from "../../src/core/pipeline/stages/route.js";

async function contextFor(issueClass: IssueClass): Promise<RepositoryContext> {
  const context = await createDeterministicIntelligenceEngine().analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });
  return { ...context, classification: { ...context.classification, class: issueClass } };
}

describe("artifact routing", () => {
  it("routes every known issue class deterministically to the v0.1 PRD artifact", async () => {
    for (const issueClass of IssueClassSchema.options) {
      const context = await contextFor(issueClass);
      const first = routeArtifacts(context);
      const second = routeArtifacts(context);
      expect(first).toEqual(second);
      expect(first.issueClass).toBe(issueClass);
      expect(first.items).toEqual([{ type: "prd", reason: expect.any(String) }]);
      expect(first.rationale).toContain("v0.1 supports the deterministic PRD artifact only");
    }
  });

  it("uses repository complexity from RepositoryContext", async () => {
    const context = await contextFor("feature");
    const highComplexity = { ...context, repo: { ...context.repo, complexity: { value: "high" as const, signals: ["test"] } } };
    expect(routeArtifacts(highComplexity).complexity).toBe("high");
  });
});
