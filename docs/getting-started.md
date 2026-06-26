# Getting Started

Issue2Dev v0.1 exposes one public workflow: `issue2dev analyze`.

The command can read either a local issue JSON file or a GitHub issue. In both modes it builds deterministic repository context and writes local JSON/Markdown artifacts.

## Requirements

- Node.js 20 or newer
- pnpm

## Installation

```bash
git clone <repository-url>
cd issue2dev
pnpm install
pnpm run build
```

## Analyze From A Local Issue File

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

This path is best for repeatable local validation because it does not require network access.

## Analyze From A GitHub Issue

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

Set `GITHUB_TOKEN` for authenticated GitHub API requests:

```bash
$env:GITHUB_TOKEN="ghp_your_token_here"
```

Public issues may work without a token where GitHub allows unauthenticated reads. A token can help avoid low anonymous rate limits.

## Output Directory

The `--out` directory is created if needed and must live under a `.issue2dev/` path. Issue2Dev writes these files:

| File | Description |
| --- | --- |
| `repository-context.json` | RepositoryContext used by analysis and artifact generation. |
| `analysis.json` | Structured deterministic analysis. |
| `analysis.md` | Markdown analysis report. |
| `artifacts.json` | Structured artifact bundle. |
| `prd.md` | Deterministic PRD-style artifact. |

Generated output directories such as `.issue2dev/` are ignored by git.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `issue2dev is not built` | Run `pnpm run build` before `pnpm exec issue2dev ...`. |
| GitHub request fails | Check network access, repository visibility, issue number, and `GITHUB_TOKEN`. |
| Validation error | Confirm required flags are present and the issue JSON matches the example shape. |
| No repository file context | Some repositories or API responses may not expose fetchable files; Issue2Dev degrades gracefully and still emits local artifacts. |

## Validation Commands

```bash
pnpm install
pnpm run build
pnpm test
pnpm exec tsc --noEmit
pnpm pack --dry-run
```