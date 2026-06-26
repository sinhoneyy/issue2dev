import { CliUsageError, parseCliArgs } from "./args.js";
import { runAnalyzeCommand } from "./commands/analyze.js";

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const parsed = parseCliArgs(argv);
    return await runAnalyzeCommand(parsed);
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(`error: ${error.message}`);
      return error.exitCode;
    }
    console.error(`error: ${error instanceof Error ? error.message : "Unexpected error"}`);
    return 1;
  }
}

process.exitCode = await main();
