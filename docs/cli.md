# CLI Reference

Issue2Dev v0.1 documents only the implemented command: `issue2dev analyze`.

## Command

```bash
issue2dev analyze --from-file <path> --out <dir>
issue2dev analyze --repo owner/repo --issue <number> --out <dir>
```

The command writes deterministic local artifacts to the directory passed with `--out`.

## Implemented Flags

| Flag | Mode | Description |
| --- | --- | --- |
| `--from-file <path>` | Local file | Load a normalized issue JSON file. |
| `--repo owner/repo` | GitHub | Read an issue from a GitHub repository. |
| `--issue <number>` | GitHub | Issue number to read from the repository. |
| `--out <dir>` | Both | Output directory for generated files. |

Use either `--from-file` or the `--repo` plus `--issue` pair. Always provide `--out`.

The `--out` directory must live under a `.issue2dev/` path; Issue2Dev enforces this so generated output stays isolated and git-ignored.

There is no `--help` or `--version` flag in v0.1. Running `issue2dev` with no arguments, an unknown command, or an unsupported flag prints the usage string and exits with code `2`:

```text
error: Usage: issue2dev analyze (--from-file <path> | --repo <owner/repo> --issue <number>) --out <dir>
```

## Examples

Analyze a local fixture:

```bash
pnpm exec issue2dev analyze --from-file examples/from-file/issue-42.json --out .issue2dev/42-cli
```

Analyze a GitHub issue:

```bash
pnpm exec issue2dev analyze --repo microsoft/vscode --issue 1 --out .issue2dev/github-issue
```

For authenticated GitHub reads, set `GITHUB_TOKEN` before running the command. Public issues may work without a token where GitHub allows it.

## Output Files

| File | Description |
| --- | --- |
| `repository-context.json` | RepositoryContext generated from issue and repository signals. |
| `analysis.json` | Structured deterministic analysis. |
| `analysis.md` | Markdown analysis report. |
| `artifacts.json` | Structured artifact bundle. |
| `prd.md` | Deterministic PRD-style artifact. |

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `2` | Usage error |
| `6` | Validation error |
| `1` | Unexpected error |

## Notes

The v0.1 CLI writes local files only. It does not write GitHub comments, update issues, modify repositories, load config files, expose additional commands, or provide `--help`/`--version` flags.