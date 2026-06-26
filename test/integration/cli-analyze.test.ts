import { execFile } from "node:child_process";
import { access, readFile, rm, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const binPath = path.resolve("bin/issue2dev.mjs");
const fixturePath = path.resolve("examples/from-file/issue-42.json");

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execFileAsync(process.execPath, [binPath, ...args], { cwd: process.cwd() });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number };
    return { stdout: failed.stdout ?? "", stderr: failed.stderr ?? "", exitCode: failed.code ?? 1 };
  }
}

describe("issue2dev analyze CLI", () => {
  it("writes deterministic analyze and artifact outputs from a fixture issue", async () => {
    const firstRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-cli-a-"));
    const secondRoot = await mkdtemp(path.join(os.tmpdir(), "issue2dev-cli-b-"));
    const firstOut = path.join(firstRoot, ".issue2dev", "42-cli");
    const secondOut = path.join(secondRoot, ".issue2dev", "42-cli");
    try {
      const first = await runCli(["analyze", "--from-file", fixturePath, "--out", firstOut]);
      const second = await runCli(["analyze", "--from-file", fixturePath, "--out", secondOut]);
      expect(first.exitCode).toBe(0);
      expect(second.exitCode).toBe(0);
      expect(first.stdout).toContain("Repository context:");
      expect(first.stdout).toContain("Artifact Markdown:");

      const files = ["repository-context.json", "analysis.json", "analysis.md", "artifacts.json", "prd.md"];
      for (const file of files) await access(path.join(firstOut, file));

      expect(await readFile(path.join(firstOut, "repository-context.json"), "utf8")).toEqual(await readFile(path.join(secondOut, "repository-context.json"), "utf8"));
      expect(await readFile(path.join(firstOut, "analysis.json"), "utf8")).toEqual(await readFile(path.join(secondOut, "analysis.json"), "utf8"));
      expect(await readFile(path.join(firstOut, "artifacts.json"), "utf8")).toEqual(await readFile(path.join(secondOut, "artifacts.json"), "utf8"));
      expect(await readFile(path.join(firstOut, "prd.md"), "utf8")).toEqual(await readFile(path.join(secondOut, "prd.md"), "utf8"));
    } finally {
      await rm(firstRoot, { recursive: true, force: true });
      await rm(secondRoot, { recursive: true, force: true });
    }
  });

  it("returns exit code 2 for usage errors", async () => {
    const result = await runCli(["analyze", "--from-file", fixturePath]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("--out is required");
  });
});
