# Phase 3 Validation Spike

This folder is a disposable walking skeleton for Issue2Dev Phase 3 validation. It is intentionally not production architecture and must not grow into the final Repository Intelligence Engine.

The spike tests the core thesis:

> GitHub Issue + minimal repository context produces a more useful PRD/report than raw issue text alone.

## What It Does

- Loads one issue fixture from JSON with `--from-file`.
- Reads minimal local repository fixture data embedded in that JSON.
- Builds a small RepositoryContext-like object.
- Emits a Markdown validation report.
- Emits a simple PRD-style artifact.
- Writes outputs to `spikes/phase-3-validation/reports/`.

## What It Does Not Do

- It does not implement the production Repository Intelligence Engine.
- It does not create `src/` production code.
- It does not require live GitHub access.
- It does not implement future systems such as MCP, REST, dashboard, IDE extensions, batch mode, or plugins.

## Run

```bash
pnpm exec tsx spikes/phase-3-validation/walking-skeleton.ts --from-file spikes/phase-3-validation/fixtures/issue.example.json
```
