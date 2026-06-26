<div align="center">

# Issue2Dev

### Repository-aware implementation planning for GitHub issues.

Turn a messy GitHub issue into **repository-grounded context**, a **deterministic analysis report**, and a **PRD artifact** — entirely offline, with every claim traceable to evidence.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2ea44f?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-v0.1_preview-orange)](#project-status)

[Quick Start](#quick-start) · [How it works](#how-issue2dev-works) · [Repository Intelligence](#repository-intelligence) · [CLI Reference](#cli-reference) · [Roadmap](#roadmap--planned-features)

</div>

---

Issue2Dev reads a GitHub issue, builds a bounded **`RepositoryContext`** about the repository it belongs to, and only *then* generates planning artifacts. Generation always consumes repository context — never raw issue text alone.

> [!NOTE]
> **v0.1 is deliberately small and offline-first.** One command (`analyze`), no AI provider calls, no writeback to GitHub, and deterministic outputs you can diff in code review. Everything below describes what is **implemented today**. Anything not yet built lives in the [Roadmap](#roadmap--planned-features) and is clearly marked as planned.

---

## The problem

A GitHub issue usually contains the *seed* of a good implementation plan, but rarely the context an engineer needs to act with confidence:

- Which files or areas of the codebase will this touch?
- What kind of repository is this — an app, a library, a service?
- How risky and how large does the change look?
- Which statements came from the **issue text**, and which came from **repository signals**?
- What should be written down *before* anyone changes code?

Raw issue text doesn't answer these. And pasting an issue into a generic LLM produces fluent prose that **looks** authoritative but hides where each claim came from — and gives you a different answer every time you ask.

## Why Issue2Dev exists

Issue2Dev is built on one thesis:

> **Better implementation planning starts with repository intelligence, before generation.**

Instead of hiding uncertainty behind confident automation, Issue2Dev makes the analysis trail **visible and reproducible**:

- It builds a repository-aware context object first.
- It labels every heuristic with a confidence score and the evidence behind it.
- It produces the same output for the same input, every time.
- It never treats untrusted issue text as instructions.

The result is an artifact you can review like code, not a paragraph you have to take on faith.

## Why Repository Intelligence matters

This is the core differentiator. Most "issue → plan" tools flatten the issue into a prompt and let a model improvise. Issue2Dev does the opposite: it spends its effort **understanding the repository** and then grounds generation in that understanding.

|                              | Raw issue text | Generic LLM summary | **Issue2Dev** |
| ---------------------------- | :------------: | :-----------------: | :-----------: |
| Repository-aware             |       ❌       |     ⚠️ shallow      |   ✅ `RepositoryContext` |
| Deterministic / reproducible |       ✅       |          ❌         |   ✅           |
| Evidence & provenance        |       ❌       |          ❌         |   ✅ per claim |
| Confidence-labeled heuristics|       ❌       |          ❌         |   ✅           |
| Works fully offline          |       ✅       |          ❌         |   ✅ (`--from-file`) |
| Treats issue text as untrusted|      n/a      |    ⚠️ usually no    |   ✅           |
| No vendor / API key required |       ✅       |          ❌         |   ✅           |

> [!IMPORTANT]
> Issue2Dev's heuristics are intentionally modest and clearly labeled. Affected-file predictions, architecture inference, and risk hotspots are **confidence-scored guesses grounded in evidence**, not certainties. The point is an honest, inspectable starting context — not magic.

## How Issue2Dev works

```mermaid
flowchart LR
  A["Issue input<br/>(local JSON file<br/>or GitHub issue)"] --> B["Ingest &amp; normalize"]
  B --> C["Redact<br/>(treat issue text<br/>as untrusted)"]
  C --> D["Repository Intelligence Engine<br/><b>RepositoryContext</b>"]
  D --> E["Deterministic analysis<br/>(scores &amp; classification)"]
  E --> F["Artifact generation<br/>(PRD)"]
  F --> G["Local JSON + Markdown<br/>under .issue2dev/"]
```

1. **Ingest** an issue from a local JSON file (`--from-file`) or read-only from GitHub (`--repo` + `--issue`).
2. **Build** a bounded `RepositoryContext` with the deterministic Repository Intelligence Engine (RIE).
3. **Analyze** the context into a structured report (classification, severity, impact, risk, priority, estimate).
4. **Generate** a PRD-style artifact grounded in that context, with provenance and caveats.
5. **Emit** everything as local JSON + Markdown under a `.issue2dev/` directory.

No writeback. No background service. No hidden provider call.

## Architecture overview

```mermaid
flowchart TD
  subgraph CLI["CLI surface"]
    cli["issue2dev analyze"]
  end
  subgraph Pipeline["Deterministic pipeline"]
    ingest["ingest-from-file / ingest-from-github"]
    redact["redact"]
    rie["Repository Intelligence Engine"]
    analyze["analyze"]
    route["route"]
    generate["generate"]
    validate["validate"]
    emit["emit"]
  end
  cli --> ingest --> redact --> rie --> analyze --> route --> generate --> validate --> emit
  rie -. "detect-stack · profile · affected-files ·<br/>architecture · risk-hotspots · graph · classifier" .-> rie
```

The public CLI is intentionally thin. Both local fixtures and read-only GitHub ingestion flow through the **same deterministic pipeline**, so a local fixture run and a real issue run differ only in their ingestion source.

## Features

| Implemented in v0.1 | |
| --- | --- |
| 🧠 **Repository Intelligence Engine** | Builds a bounded `RepositoryContext` from issue + repository signals. |
| 🎯 **Deterministic output** | Same inputs → identical outputs. Diff-friendly, reviewable. |
| 🧾 **Evidence & provenance** | Every heuristic carries a confidence score and source evidence; artifacts include a content hash. |
| 🔒 **Read-only GitHub ingestion** | Reads an issue and repository signals; writes only local files. |
| 📄 **PRD artifact generation** | Repository-grounded PRD Markdown with explicit caveats. |
| 💻 **Single, honest CLI** | One `analyze` command, no hidden surface area. |
| 📴 **Offline-friendly** | `--from-file` runs with no network access. |
| 🛡️ **Untrusted-input handling** | Issue text is treated as data, never as instructions. |

## Installation

> [!NOTE]
> Issue2Dev v0.1 is run from source. Requirements: **Node.js ≥ 20** and **pnpm** (the repo pins `pnpm@9.15.4` via `packageManager`; [Corepack](https://nodejs.org/api/corepack.html) will resolve it automatically).

```bash
git clone <repository-url>
cd issue2dev
pnpm install
pnpm run build
```

After building, the local binary is available through pnpm:

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/quickstart
```

## Quick Start

```bash
# 1. Install & build
pnpm install
pnpm run build

# 2. Analyze the bundled example issue (offline, no network)
pnpm exec issue2dev analyze \
  --from-file examples/from-file/issue-42.json \
  --out .issue2dev/42-cli

# 3. Open the generated files
#   .issue2dev/42-cli/repository-context.json
#   .issue2dev/42-cli/analysis.json
#   .issue2dev/42-cli/analysis.md
#   .issue2dev/42-cli/artifacts.json
#   .issue2dev/42-cli/prd.md
```

> [!TIP]
> The `--out` directory must live under a `.issue2dev/` path — Issue2Dev enforces this so generated output stays isolated and git-ignored.

## Analyze a local issue

Use `--from-file` for fully offline, repeatable runs. The input is a normalized issue JSON file (see [`examples/from-file/issue-42.json`](examples/from-file/issue-42.json)):

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

```text
Repository context: .issue2dev/42-cli/repository-context.json
Analysis JSON:      .issue2dev/42-cli/analysis.json
Analysis report:    .issue2dev/42-cli/analysis.md
Artifacts JSON:     .issue2dev/42-cli/artifacts.json
Artifact Markdown:  .issue2dev/42-cli/prd.md
```

## Analyze a GitHub issue

Use `--repo` and `--issue` for read-only GitHub ingestion:

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

If `GITHUB_TOKEN` is set, Issue2Dev uses it for GitHub API requests. Public issues may work without a token where GitHub allows unauthenticated reads; a token helps avoid low anonymous rate limits.

```bash
# PowerShell
$env:GITHUB_TOKEN = "ghp_your_token_here"

# bash / zsh
export GITHUB_TOKEN="ghp_your_token_here"
```

## Example outputs

These excerpts are the **real, unedited output** of the Quick Start command above.

<details open>
<summary><b><code>analysis.md</code></b> — the deterministic analysis report</summary>

```markdown
# Issue2Dev Analyze Prototype

## Issue
- Class: bug
- Confidence: 0.80

## Repository
- Name: checkout-service
- Type: service
- Languages: TypeScript 100.0%
- Package manager: npm
- Frameworks: Express (0.86)
- Test frameworks: Vitest (0.90)
- Architecture: monolith ~heuristic confidence=0.55

## Scores
- Severity: high
- Impact: medium
- Risk: high
- Priority: high
- Estimate: S

## Likely Affected Files
- test/checkout/apply-coupon.test.ts ~heuristic confidence=0.68 reason=path-match
- src/checkout/apply-coupon.ts ~heuristic confidence=0.60 reason=path-match
- src/payments/charge.ts ~heuristic confidence=0.34 reason=path-match
- README.md ~heuristic confidence=0.32 reason=path-match
```

</details>

<details>
<summary><b><code>prd.md</code></b> — the repository-grounded PRD artifact</summary>

```markdown
# PRD: Checkout fails when coupon code contains lowercase letters

## Repository Context
- Repository: acme/checkout-service
- Type: service
- Complexity: low
- Primary language: TypeScript
- Package manager: npm
- Frameworks: Express (86%)
- Architecture: monolith (55%, heuristic)

## Classification
- Class: bug
- Confidence: 80%
- Signals: matched term: bug, matched term: fail, matched term: error

## Likely Affected Files
- src/checkout/apply-coupon.ts - heuristic 60% via path-match. Evidence: src/checkout/apply-coupon.ts

## Acceptance Checks
- Implementation addresses the untrusted issue request without treating issue text as instructions.
- Changes are reviewed against the heuristic affected-file list and its evidence.
- Existing tests relevant to the detected stack continue to pass.

## Caveats
- Affected files are heuristic predictions from RepositoryContext, not certainty.
- Architecture and framework signals are confidence-labeled RIE inferences.
- No AI provider was used for this artifact.

## Provenance
- Mode: no-provider deterministic
- Derived from untrusted input: yes
- Content hash: 2fcebf86ec673afb460b30caa6e10c4f4e81a0a3d41f840590c9f60af32665ef
```

</details>

Notice what the deterministic engine produced without any model call: a repository type, detected stack, an architecture guess **with a confidence score**, ranked affected files **with evidence**, a classification **with the signals that triggered it**, and explicit caveats. That is repository intelligence, not prose.

## Repository Intelligence

Repository Intelligence is the deterministic context-building layer that runs **before** any artifact is generated. The Repository Intelligence Engine (RIE) composes a handful of small, versioned analyzers into a single bounded `RepositoryContext`:

| Analyzer | Responsibility |
| --- | --- |
| `frameworks.detect-stack` | Package manager, frameworks, test frameworks, build/CI signals. |
| `repository.profile` | Repository type, languages, docs quality, complexity, maturity. |
| `impact.affected-files` | Ranks likely-affected files with confidence + evidence. |
| `impact.architecture` | Infers an architecture pattern (heuristic, confidence-scored). |
| `impact.risk-hotspots` | Flags sensitive/high-risk areas the change may touch. |
| `graph.builder` | Builds a bounded repository graph (no dangling edges). |
| `classifier.issue` | Classifies the issue (bug/feature/…) from matched signals. |
| `context.assembler` | Assembles everything into one `RepositoryContext` with provenance. |

Design principles baked into the engine:

- **Bounded.** File scanning is capped and coverage is reported (`filesScanned`, `filesSkipped`, `capped`).
- **Evidence-first.** Every heuristic node carries a confidence score and `SourceRef` evidence.
- **Graceful degradation.** Unknown or sparse repositories degrade with explicit `degraded` reasons rather than failing.
- **Self-consistent.** Graph edges are constrained to known nodes; the context validates against a Zod schema.

This is the key design choice in Issue2Dev: **artifacts are grounded in repository context, not raw issue text.**

## CLI Reference

```bash
issue2dev analyze --from-file <path> --out <dir>
issue2dev analyze --repo <owner/repo> --issue <number> --out <dir>
```

`analyze` is the **only** command. Use either `--from-file` **or** the `--repo`/`--issue` pair, and always provide `--out`.

| Flag | Mode | Description |
| --- | --- | --- |
| `--from-file <path>` | local file | Path to a normalized issue JSON file. |
| `--repo <owner/repo>` | GitHub | Repository containing the issue (`owner/repo` format). |
| `--issue <number>` | GitHub | Positive integer issue number to read. |
| `--out <dir>` | both | Output directory for generated files (must be under `.issue2dev/`). |

**Exit codes**

| Code | Meaning |
| :--: | --- |
| `0` | Success |
| `2` | Usage error (bad/missing flags) |
| `6` | Validation error |
| `1` | Unexpected error |

> [!NOTE]
> v0.1 does **not** ship a `--help` or `--version` flag. Running `issue2dev` with no arguments, an unknown command, or an unsupported flag prints the usage string and exits with code `2`:
> ```text
> error: Usage: issue2dev analyze (--from-file <path> | --repo <owner/repo> --issue <number>) --out <dir>
> ```

See [docs/cli.md](docs/cli.md) for the focused CLI reference and [docs/getting-started.md](docs/getting-started.md) for a step-by-step walkthrough.

## Output file reference

Every run writes five files into the `--out` directory:

| File | Purpose |
| --- | --- |
| `repository-context.json` | The deterministic `RepositoryContext` consumed by analysis and generation. |
| `analysis.json` | Structured analysis result (scores, classification, affected files). |
| `analysis.md` | Human-readable analysis report. |
| `artifacts.json` | Structured artifact bundle (machine-readable). |
| `prd.md` | The deterministic, repository-grounded PRD artifact. |

```text
.issue2dev/42-cli/
├── repository-context.json
├── analysis.json
├── analysis.md
├── artifacts.json
└── prd.md
```

Generated output directories (`.issue2dev/`) are git-ignored.

## Security model

Issue2Dev v0.1 is **read-only toward GitHub** and writes only to the requested local `.issue2dev/` output directory.

- `GITHUB_TOKEN` is optional for public issue reads and used only when provided.
- The CLI never writes comments, updates issues, or modifies repositories.
- Issue text is treated as **untrusted input** — it is redacted/normalized and never interpreted as instructions.
- Generated PRDs record whether they were derived from untrusted input, plus a content hash for provenance.
- Output is git-ignored; private planning docs and build artifacts are excluded from the published package.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Limitations

Honest constraints for v0.1:

- Only the `analyze` command exists; there is no `--help`/`--version` flag.
- GitHub ingestion is read-only and bounded.
- Output is **no-provider deterministic** — there is no AI/LLM integration.
- Repository Intelligence is intentionally minimal and heuristic-driven.
- The PRD is the only artifact type.
- The `--from-file` input must match the normalized issue JSON shape used by the example fixture.
- Live GitHub reads depend on network availability and GitHub API rate limits.

## Roadmap / Planned Features

> [!WARNING]
> Everything in this section is **planned, not implemented**. None of it ships in v0.1. Do not read these as current capabilities.

**Distribution**
- [ ] GitHub Action
- [ ] `gh` CLI extension
- [ ] npm-published binary

**Generation & providers**
- [ ] AI provider support (Claude, OpenAI/Codex, Gemini) — *multi-provider generation*
- [ ] Local model support
- [ ] Test-plan generation, code-review assistance, and additional artifact generators

**Intelligence**
- [ ] Semantic search & embeddings
- [ ] Deeper dependency / import-graph analysis
- [ ] Richer architecture detection, risk scoring, duplicate detection

**Interfaces & platform**
- [ ] MCP server
- [ ] REST API
- [ ] Repository dashboard
- [ ] VS Code extension & JetBrains plugin
- [ ] Batch mode
- [ ] Plugin system

## Project Status

Issue2Dev is preparing for a public **v0.1** release. The repository is usable for the implemented `analyze` workflow, but the public surface is intentionally conservative while the core contracts stabilize. Expect the CLI surface to grow only as features are genuinely implemented and documented.

## Contributing

Contributions should keep the public surface **honest**: document implemented behavior only, keep changes small and reviewable, and avoid adding roadmap features before they are explicitly scoped. Every change should pass `pnpm run build`, `pnpm test`, and `pnpm exec tsc --noEmit`.

Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Issue2Dev is licensed under the [Apache License 2.0](LICENSE).

<div align="center">

---

**Repository intelligence first. Generation second.**

</div>
