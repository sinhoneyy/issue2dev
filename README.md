# Issue2Dev

Issue2Dev is a deterministic CLI that turns a GitHub issue plus bounded repository context into local analysis artifacts, including a PRD-style Markdown document.

The current v0.1 surface is intentionally small:

- `issue2dev analyze --from-file <path> --out <dir>`
- `issue2dev analyze --repo owner/repo --issue <number> --out <dir>`
- deterministic Repository Intelligence
- read-only GitHub issue ingestion
- local PRD and report output

Issue2Dev writes files locally. It does not write comments back to GitHub.

## Requirements

- Node.js 20 or newer
- pnpm 9

## Install From Source

```bash
pnpm install
pnpm run build
```

## Analyze An Issue Fixture

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

## Analyze A GitHub Issue

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

If `GITHUB_TOKEN` is set, Issue2Dev uses it for GitHub API requests. Public issues may work without a token where GitHub allows unauthenticated reads.

## Outputs

The analyze command writes these files under the requested output directory:

- `repository-context.json`
- `analysis.json`
- `analysis.md`
- `artifacts.json`
- `prd.md`

## Validation

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run build
pnpm pack --dry-run
```

## Documentation

- [Getting started](docs/getting-started.md)
- [CLI reference](docs/cli.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache-2.0