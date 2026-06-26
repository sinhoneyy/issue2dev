import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDeterministicIntelligenceEngine } from "../../intelligence/engine.js";
import type { IssueAnalysis } from "../domain/analysis.js";
import type { RepositoryContext } from "../domain/repository-context.js";
import type { Result } from "../domain/result.js";
import { renderAnalyzeReport } from "../../artifacts/render/analyze-report.js";
import { PipelineEvents } from "./events.js";
import { analyzeContext } from "./stages/analyze.js";
import { ingestFromFile } from "./stages/ingest-from-file.js";
import { runIntelligence } from "./stages/intelligence.js";
import { redactInputs } from "./stages/redact.js";

export type AnalyzePrototypeOutput = {
  context: RepositoryContext;
  analysis: IssueAnalysis;
  files: { repositoryContext: string; analysisJson: string; analysisMarkdown: string };
};

export async function runAnalyzePrototype(input: { fromFile: string; outDir: string }): Promise<Result<AnalyzePrototypeOutput>> {
  const started = performance.now();
  const events = new PipelineEvents();
  try {
    let end = events.start("ingest");
    const ingested = await ingestFromFile(input.fromFile);
    end();

    end = events.start("redact");
    const redacted = redactInputs(ingested);
    end();

    end = events.start("intelligence");
    const context = await runIntelligence({ ...redacted, engine: createDeterministicIntelligenceEngine() });
    end();
    if (context.degraded) events.degraded("intelligence", context.degraded.reasons.join("; "));

    end = events.start("analyze");
    const analysis = analyzeContext(context);
    end();

    end = events.start("emit");
    await mkdir(input.outDir, { recursive: true });
    const files = {
      repositoryContext: path.join(input.outDir, "repository-context.json"),
      analysisJson: path.join(input.outDir, "analysis.json"),
      analysisMarkdown: path.join(input.outDir, "analysis.md")
    };
    await writeFile(files.repositoryContext, `${JSON.stringify(context, null, 2)}\n`, "utf8");
    await writeFile(files.analysisJson, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
    await writeFile(files.analysisMarkdown, renderAnalyzeReport(analysis), "utf8");
    end();

    return { ok: true, data: { context, analysis, files }, error: null, meta: { durationMs: Math.round(performance.now() - started), degraded: Boolean(context.degraded), toolVersion: "0.0.0", events: events.list() } };
  } catch (error) {
    return { ok: false, data: null, error: { code: "UNEXPECTED", message: error instanceof Error ? error.message : "Unknown error", hint: "Check the --from-file fixture shape and output directory." }, meta: { durationMs: Math.round(performance.now() - started), degraded: false, toolVersion: "0.0.0", events: events.list() } };
  }
}