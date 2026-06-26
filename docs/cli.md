# CLI Reference

Issue2Dev v0.1 exposes one command: `issue2dev analyze`.

## Analyze From File

```bash
issue2dev analyze --from-file <path> --out <dir>
```

Loads a normalized issue JSON file and writes deterministic local artifacts to `<dir>`.

Example:

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

## Analyze From GitHub

```bash
issue2dev analyze --repo owner/repo --issue <number> --out <dir>
```

Reads a GitHub issue and bounded repository metadata/files, normalizes the issue, and writes deterministic local artifacts to `<dir>`.

Example:

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

`GITHUB_TOKEN` is optional for public issues where GitHub permits unauthenticated reads. Set it to increase rate limits or access repositories available to the token.

## Output Files

The command writes:

- `repository-context.json`
- `analysis.json`
- `analysis.md`
- `artifacts.json`
- `prd.md`

## Exit Codes

- `0`: success
- `2`: usage error
- `6`: validation error
- `1`: unexpected error

## Notes

The v0.1 CLI writes local files only. It does not write comments, update issues, or modify repository contents.