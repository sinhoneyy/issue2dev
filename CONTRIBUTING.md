# Contributing

Thanks for helping improve Issue2Dev.

This repository currently exposes a small v0.1 CLI surface. Please keep changes focused and avoid documenting or implementing future features before they are part of the approved scope.

## Setup

```bash
pnpm install
pnpm run build
```

## Validation

Run the core checks before proposing changes:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run build
pnpm pack --dry-run
```

## CLI Smoke Tests

From-file analysis:

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

Read-only GitHub issue analysis:

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

`GITHUB_TOKEN` is optional for public issues where GitHub allows unauthenticated reads.

## Private And Generated Files

Do not commit:

- `internal/`
- `.issue2dev/`
- `node_modules/`
- `spikes/phase-3-validation/reports/`
- `.env` or other secret files
- generated local outputs

## Pull Requests

Keep pull requests small and reviewable. Include the validation commands you ran and mention any command that could not be completed.