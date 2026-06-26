export type ParsedAnalyzeArgs =
  | {
      command: "analyze";
      mode: "from-file";
      fromFile: string;
      outDir: string;
    }
  | {
      command: "analyze";
      mode: "github";
      repo: string;
      issueNumber: number;
      outDir: string;
    };

export type ParsedCliArgs = ParsedAnalyzeArgs;

export class CliUsageError extends Error {
  readonly exitCode = 2;
}

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new CliUsageError(`${name} requires a value`);
  return value;
}

function assertNoUnknownFlags(args: string[], allowed: Set<string>): void {
  for (const arg of args) {
    if (arg.startsWith("--") && !allowed.has(arg)) throw new CliUsageError(`Unknown option: ${arg}`);
  }
}

function parseIssueNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new CliUsageError("--issue must be a positive integer");
  return number;
}

function parseRepo(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!/^[^/\s]+\/[^/\s]+$/u.test(value)) throw new CliUsageError("--repo must use owner/repo format");
  return value;
}

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [command, ...rest] = argv;
  if (command !== "analyze") {
    throw new CliUsageError("Usage: issue2dev analyze (--from-file <path> | --repo <owner/repo> --issue <number>) --out <dir>");
  }

  assertNoUnknownFlags(rest, new Set(["--from-file", "--repo", "--issue", "--out"]));
  const fromFile = readFlag(rest, "--from-file");
  const repo = parseRepo(readFlag(rest, "--repo"));
  const issueNumber = parseIssueNumber(readFlag(rest, "--issue"));
  const outDir = readFlag(rest, "--out");
  if (!outDir) throw new CliUsageError("--out is required");
  if (fromFile && (repo || issueNumber)) throw new CliUsageError("Use either --from-file or --repo/--issue, not both");
  if (fromFile) return { command, mode: "from-file", fromFile, outDir };
  if (!repo) throw new CliUsageError("--repo is required when --from-file is not used");
  if (!issueNumber) throw new CliUsageError("--issue is required when --from-file is not used");
  return { command, mode: "github", repo, issueNumber, outDir };
}
