import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAnalyzePrototype } from "../../src/core/pipeline/pipeline.js";

const fixturePath = path.resolve("examples/from-file/issue-42.json");

describe("Phase 4 offline analyze prototype", () => {
  it("writes deterministic context, analysis, and markdown report", async () => {
    const firstDir = await mkdtemp(path.join(os.tmpdir(), "issue2dev-phase4-a-"));
    const secondDir = await mkdtemp(path.join(os.tmpdir(), "issue2dev-phase4-b-"));
    try {
      const first = await runAnalyzePrototype({ fromFile: fixturePath, outDir: firstDir });
      const second = await runAnalyzePrototype({ fromFile: fixturePath, outDir: secondDir });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) throw new Error("prototype run failed");

      const firstContext = await readFile(first.data.files.repositoryContext, "utf8");
      const secondContext = await readFile(second.data.files.repositoryContext, "utf8");
      const firstAnalysis = await readFile(first.data.files.analysisJson, "utf8");
      const secondAnalysis = await readFile(second.data.files.analysisJson, "utf8");
      const markdown = await readFile(first.data.files.analysisMarkdown, "utf8");

      expect(firstContext).toEqual(secondContext);
      expect(firstAnalysis).toEqual(secondAnalysis);
      expect(markdown).toContain("No-provider deterministic analysis");
      expect(markdown).toContain("Likely Affected Files");
    } finally {
      await rm(firstDir, { recursive: true, force: true });
      await rm(secondDir, { recursive: true, force: true });
    }
  });
});