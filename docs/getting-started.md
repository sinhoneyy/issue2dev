# Getting Started

Issue2Dev v0.1 has one public command: `issue2dev analyze`.

It can analyze either a local issue JSON fixture or a read-only GitHub issue. In both modes it produces deterministic local output files.

## Setup

```bash
pnpm install
pnpm run build
```

## From A Local Issue File

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

This is the best path for repeatable local validation because it does not require network access.

## From A GitHub Issue

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

For authenticated requests, set `GITHUB_TOKEN` before running the command. Without a token, public issue reads may still work depending on GitHub API limits.

## Output Files

The output directory contains:

- `repository-context.json`: deterministic repository context used by downstream artifacts
- `analysis.json`: structured analysis result
- `analysis.md`: Markdown analysis report
- `artifacts.json`: structured artifact bundle
- `prd.md`: PRD-style Markdown artifact

The command creates local files only. It does not modify GitHub issues or repository contents.