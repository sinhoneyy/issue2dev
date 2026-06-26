import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDeterministicIntelligenceEngine } from "../../intelligence/engine.js";
import type { IssueAnalysis } from "../domain/analysis.js";
import type { GenerateOutcome } from "../domain/generation.js";
import type { RepositoryContext } from "../domain/repository-context.js";
import type { Result } from "../domain/result.js";
import { renderAnalyzeReport } from "../../artifacts/render/analyze-report.js";
import { PipelineEvents } from "./events.js";
import { analyzeContext } from "./stages/analyze.js";
import { emitAnalyzeAndArtifacts, emitArtifacts, type EmitAnalyzeAndArtifactsOutput } from "./stages/emit.js";
import { generateArtifacts } from "./stages/generate.js";
import { ingestFromFile } from "./stages/ingest-from-file.js";
import { runIntelligence } from "./stages/intelligence.js";
import { redactInputs } from "./stages/redact.js";
import { routeArtifacts } from "./stages/route.js";
import { validateArtifacts } from "./stages/validate.js";

export type AnalyzePrototypeOutput = {
  context: RepositoryContext;
  analysis: IssueAnalysis;
  files: { repositoryContext: string; analysisJson: string; analysisMarkdown: string };
};

export type GeneratePrototypeOutput = GenerateOutcome & {
  context: RepositoryContext;
  analysis: IssueAnalysis;
};

export type AnalyzeCliOutput = Omit<GeneratePrototypeOutput, "files"> & {
  files: EmitAnalyzeAndArtifactsOutput;
};

function validationFailure<T>(input: { started: number; events: PipelineEvents; degraded: boolean; message: string; hint: string }): Result<T> {
  return {
    ok: false,
    data: null,
    error: { code: "VALIDATION", message: input.message, hint: input.hint },
    meta: { durationMs: Math.round(performance.now() - input.started), degraded: input.degraded, toolVersion: "0.0.0", events: input.events.list() }
  };
}

function unexpectedFailure<T>(input: { started: number; events: PipelineEvents; error: unknown; hint: string }): Result<T> {
  return {
    ok: false,
    data: null,
    error: { code: "UNEXPECTED", message: input.error instanceof Error ? input.error.message : "Unknown error", hint: input.hint },
    meta: { durationMs: Math.round(performance.now() - input.started), degraded: false, toolVersion: "0.0.0", events: input.events.list() }
  };
}

async function runDeterministicStages(input: { fromFile: string; events: PipelineEvents }): Promise<{ context: RepositoryContext; analysis: IssueAnalysis }> {
  let end = input.events.start("ingest");
  const ingested = await ingestFromFile(input.fromFile);
  end();

  end = input.events.start("redact");
  const redacted = redactInputs(ingested);
  end();

  end = input.events.start("intelligence");
  const context = await runIntelligence({ ...redacted, engine: createDeterministicIntelligenceEngine() });
  end();
  if (context.degraded) input.events.degraded("intelligence", context.degraded.reasons.join("; "));

  end = input.events.start("analyze");
  const analysis = analyzeContext(context);
  end();
  return { context, analysis };
}

export async function runAnalyzePrototype(input: { fromFile: string; outDir: string }): Promise<Result<AnalyzePrototypeOutput>> {
  const started = performance.now();
  const events = new PipelineEvents();
  try {
    const { context, analysis } = await runDeterministicStages({ fromFile: input.fromFile, events });

    const end = events.start("emit");
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
    return unexpectedFailure({ started, events, error, hint: "Check the --from-file fixture shape and output directory." });
  }
}

export async function runGeneratePrototype(input: { fromFile: string; outDir: string }): Promise<Result<GeneratePrototypeOutput>> {
  const started = performance.now();
  const events = new PipelineEvents();
  try {
    const { context, analysis } = await runDeterministicStages({ fromFile: input.fromFile, events });

    let end = events.start("route");
    const plan = routeArtifacts(context);
    end();

    end = events.start("generate");
    const artifacts = generateArtifacts({ context, plan });
    end();

    end = events.start("validate");
    const validation = validateArtifacts(artifacts);
    end();
    if (!validation.ok) {
      return validationFailure({ started, events, degraded: Boolean(context.degraded), message: validation.message, hint: validation.issues.join("; ") });
    }

    end = events.start("emit");
    const files = await emitArtifacts({ artifacts: validation.artifacts, outDir: input.outDir });
    end();

    return {
      ok: true,
      data: { schemaVersion: "0.1.0", context, analysis, plan, artifacts: validation.artifacts, files },
      error: null,
      meta: { durationMs: Math.round(performance.now() - started), degraded: Boolean(context.degraded), toolVersion: "0.0.0", events: events.list() }
    };
  } catch (error) {
    return unexpectedFailure({ started, events, error, hint: "Check the --from-file fixture shape and output directory." });
  }
}

export async function runAnalyzeCli(input: { fromFile: string; outDir: string }): Promise<Result<AnalyzeCliOutput>> {
  const started = performance.now();
  const events = new PipelineEvents();
  try {
    const { context, analysis } = await runDeterministicStages({ fromFile: input.fromFile, events });

    let end = events.start("route");
    const plan = routeArtifacts(context);
    end();

    end = events.start("generate");
    const artifacts = generateArtifacts({ context, plan });
    end();

    end = events.start("validate");
    const validation = validateArtifacts(artifacts);
    end();
    if (!validation.ok) {
      return validationFailure({ started, events, degraded: Boolean(context.degraded), message: validation.message, hint: validation.issues.join("; ") });
    }

    end = events.start("emit");
    const files = await emitAnalyzeAndArtifacts({ context, analysis, artifacts: validation.artifacts, outDir: input.outDir });
    end();

    return {
      ok: true,
      data: { schemaVersion: "0.1.0", context, analysis, plan, artifacts: validation.artifacts, files },
      error: null,
      meta: { durationMs: Math.round(performance.now() - started), degraded: Boolean(context.degraded), toolVersion: "0.0.0", events: events.list() }
    };
  } catch (error) {
    return unexpectedFailure({ started, events, error, hint: "Check the --from-file fixture shape and .issue2dev output directory." });
  }
}
