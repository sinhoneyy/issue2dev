export type ParsedAnalyzeArgs = {
  command: "analyze";
  fromFile: string;
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

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [command, ...rest] = argv;
  if (command !== "analyze") {
    throw new CliUsageError("Usage: issue2dev analyze --from-file <path> --out <dir>");
  }

  assertNoUnknownFlags(rest, new Set(["--from-file", "--out"]));
  const fromFile = readFlag(rest, "--from-file");
  const outDir = readFlag(rest, "--out");
  if (!fromFile) throw new CliUsageError("--from-file is required");
  if (!outDir) throw new CliUsageError("--out is required");

  return { command, fromFile, outDir };
}
