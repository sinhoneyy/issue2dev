import { describe, expect, it } from "vitest";
import { DiagnosisSchema } from "../../src/core/domain/diagnosis.js";
import { diagnoseContext } from "../../src/core/pipeline/stages/diagnose.js";
import { createDeterministicIntelligenceEngine } from "../../src/intelligence/engine.js";
import { nodeServiceIssue, nodeServiceRepo } from "../intelligence/__fixtures__/node-service.js";
import { unknownIssue, unknownRepo } from "../intelligence/__fixtures__/unknown-repo.js";

async function contextFor(issue: typeof nodeServiceIssue, repo: typeof nodeServiceRepo) {
  return createDeterministicIntelligenceEngine().analyze({ issue, repo });
}

describe("deterministic diagnosis", () => {
  it("is generated from RepositoryContext and is schema-valid", async () => {
    const diagnosis = diagnoseContext(await contextFor(nodeServiceIssue, nodeServiceRepo));
    expect(DiagnosisSchema.safeParse(diagnosis).success).toBe(true);
    expect(diagnosis.rootCauseHypotheses.length).toBeGreaterThan(0);
    expect(diagnosis.solutionStrategy.steps.length).toBeGreaterThan(0);
    expect(diagnosis.implementationPlan.tasks.length).toBeGreaterThan(0);
  });

  it("derives root-cause affected files and evidence from RIE affected-file evidence", async () => {
    const context = await contextFor(nodeServiceIssue, nodeServiceRepo);
    const diagnosis = diagnoseContext(context);
    const rieFiles = new Set(context.affectedFiles.map((file) => file.path));
    for (const hypothesis of diagnosis.rootCauseHypotheses) {
      for (const path of hypothesis.affectedFiles) expect(rieFiles.has(path)).toBe(true);
      expect(hypothesis.evidence.length).toBeGreaterThan(0);
    }
  });

  it("never claims certainty in root-cause hypotheses", async () => {
    const diagnosis = diagnoseContext(await contextFor(nodeServiceIssue, nodeServiceRepo));
    for (const hypothesis of diagnosis.rootCauseHypotheses) {
      expect(hypothesis.confidence).toBeLessThan(1);
      expect(hypothesis.limitations.length).toBeGreaterThan(0);
    }
  });

  it("includes test recommendations and risks in the solution strategy", async () => {
    const diagnosis = diagnoseContext(await contextFor(nodeServiceIssue, nodeServiceRepo));
    expect(diagnosis.solutionStrategy.testRecommendations.length).toBeGreaterThan(0);
    expect(diagnosis.solutionStrategy.risks.length).toBeGreaterThan(0);
    expect(diagnosis.solutionStrategy.rollbackNotes.length).toBeGreaterThan(0);
  });

  it("includes framework-specific test commands when a stack is detected", async () => {
    const diagnosis = diagnoseContext(await contextFor(nodeServiceIssue, nodeServiceRepo));
    expect(diagnosis.testStrategy.framework).toBe("Vitest");
    expect(diagnosis.implementationPlan.validationCommands).toContain("npm test");
  });

  it("produces low confidence and limitations when evidence is weak", async () => {
    const context = await createDeterministicIntelligenceEngine().analyze({ issue: unknownIssue, repo: unknownRepo });
    const diagnosis = diagnoseContext(context);
    expect(diagnosis.confidence).toBeLessThanOrEqual(0.3);
    expect(diagnosis.limitations.length).toBeGreaterThan(0);
    expect(diagnosis.rootCauseHypotheses[0]?.summary.toLowerCase()).toContain("insufficient");
    expect(diagnosis.implementationPlan.validationCommands.join(" ")).toContain("package manager was not detected");
  });

  it("is deterministic across two runs for the same context", async () => {
    const context = await contextFor(nodeServiceIssue, nodeServiceRepo);
    expect(JSON.stringify(diagnoseContext(context))).toEqual(JSON.stringify(diagnoseContext(context)));
  });
});
