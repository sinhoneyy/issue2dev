import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runGeneratePrototype } from "../../src/core/pipeline/pipeline.js";

const fixturePath = path.resolve("examples/from-file/issue-42.json");

describe("Phase 5 offline generate prototype", () => {
  it("writes deterministic validated JSON and Markdown artifacts", async () => {
    const firstRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-phase5-a-"));
    const secondRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-phase5-b-"));
    const firstDir = path.join(firstRoot, ".issue2dev", "42");
    const secondDir = path.join(secondRoot, ".issue2dev", "42");
    try {
      const first = await runGeneratePrototype({ fromFile: fixturePath, outDir: firstDir });
      const second = await runGeneratePrototype({ fromFile: fixturePath, outDir: secondDir });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) throw new Error("generate run failed");

      const firstJson = await readFile(first.data.files.artifactsJson, "utf8");
      const secondJson = await readFile(second.data.files.artifactsJson, "utf8");
      const firstMarkdown = await readFile(first.data.files.artifactMarkdown[0]!, "utf8");
      const secondMarkdown = await readFile(second.data.files.artifactMarkdown[0]!, "utf8");

      expect(firstJson).toEqual(secondJson);
      expect(firstMarkdown).toEqual(secondMarkdown);
      expect(first.data.plan.items).toEqual([{ type: "prd", reason: expect.any(String) }]);
      expect(firstMarkdown).toContain("# PRD:");
      expect(firstMarkdown).toContain("## Provenance");
    } finally {
      await rm(firstRoot, { recursive: true, force: true });
      await rm(secondRoot, { recursive: true, force: true });
    }
  });

  it("rejects output paths outside .issue2dev", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "issue2dev-phase5-unsafe-"));
    try {
      const result = await runGeneratePrototype({ fromFile: fixturePath, outDir: path.join(root, "outside") });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain(".issue2dev");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
