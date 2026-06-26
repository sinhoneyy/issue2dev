import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAnalyzeCli } from "../../src/core/pipeline/pipeline.js";

const fixturePath = path.resolve("examples/from-file/issue-42.json");

describe("analyze diagnosis output (from-file flow)", () => {
  it("writes diagnosis into analysis.json, analysis.md, and prd.md deterministically", async () => {
    const firstRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-diag-a-"));
    const secondRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-diag-b-"));
    const firstDir = path.join(firstRoot, ".issue2dev", "diag");
    const secondDir = path.join(secondRoot, ".issue2dev", "diag");
    try {
      const first = await runAnalyzeCli({ fromFile: fixturePath, outDir: firstDir });
      const second = await runAnalyzeCli({ fromFile: fixturePath, outDir: secondDir });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) throw new Error("analyze run failed");

      const analysisJson = await readFile(first.data.files.analysisJson, "utf8");
      const analysisMd = await readFile(first.data.files.analysisMarkdown, "utf8");
      const prdMd = await readFile(first.data.files.artifactMarkdown[0]!, "utf8");

      // analysis.json carries the structured diagnostic fields.
      const parsed = JSON.parse(analysisJson) as { diagnosis?: Record<string, unknown> };
      expect(parsed.diagnosis).toBeDefined();
      for (const field of ["rootCauseHypotheses", "solutionStrategy", "implementationPlan", "testStrategy", "risks"]) {
        expect(parsed.diagnosis).toHaveProperty(field);
      }

      // analysis.md has the required sections.
      for (const section of ["## Root Cause Hypotheses", "## Recommended Solution Strategy", "## Implementation Plan", "## Test Strategy", "## Risks", "## Confidence", "## Limitations"]) {
        expect(analysisMd).toContain(section);
      }

      // prd.md surfaces solution, test, and risk sections.
      for (const section of ["## Problem Statement", "## Recommended Solution", "## Test Strategy", "## Risks", "## Open Questions"]) {
        expect(prdMd).toContain(section);
      }

      // Determinism across runs.
      expect(analysisJson).toEqual(await readFile(second.data.files.analysisJson, "utf8"));
      expect(analysisMd).toEqual(await readFile(second.data.files.analysisMarkdown, "utf8"));
      expect(prdMd).toEqual(await readFile(second.data.files.artifactMarkdown[0]!, "utf8"));
    } finally {
      await rm(firstRoot, { recursive: true, force: true });
      await rm(secondRoot, { recursive: true, force: true });
    }
  });
});
