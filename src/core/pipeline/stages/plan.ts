import type { ImplementationPlan, TestStrategy } from "../../domain/diagnosis.js";
import type { AffectedFile, RepositoryContext } from "../../domain/repository-context.js";

// Validation commands keyed by detected package manager. These come from repository
// signals (manifests/lockfiles), never from issue text. They are recommendations, not
// executed by the tool.
const VALIDATION_COMMANDS: Record<string, string[]> = {
  npm: ["npm install", "npm test"],
  pnpm: ["pnpm install", "pnpm test"],
  yarn: ["yarn install", "yarn test"],
  bun: ["bun install", "bun test"],
  pip: ["pip install -r requirements.txt", "pytest"],
  cargo: ["cargo build", "cargo test"],
  go: ["go build ./...", "go test ./..."]
};
const GENERIC_VALIDATION = ["Run the project's standard install, build, and test commands (package manager was not detected)."];

export function validationCommandsFor(packageManager: string): string[] {
  return VALIDATION_COMMANDS[packageManager] ?? GENERIC_VALIDATION;
}

function testCommandsFor(packageManager: string): string[] {
  return VALIDATION_COMMANDS[packageManager]?.slice(1) ?? [];
}

export function buildTestStrategy(context: RepositoryContext): TestStrategy {
  const framework = context.stack.testFrameworks[0]?.name ?? "unknown";
  const commands = testCommandsFor(context.stack.packageManager);
  const recommendations: string[] = [];
  if (framework !== "unknown") {
    recommendations.push(`Add or extend ${framework} tests that cover the changed behavior.`);
    recommendations.push(`Place new tests beside the existing ${framework} suite and run them before and after the change.`);
  } else {
    recommendations.push("No test framework was detected; confirm the repository's test tooling before adding tests.");
    recommendations.push("Add tests following the project's existing conventions once the tooling is confirmed.");
  }
  if (commands.length === 0) {
    recommendations.push("Package manager was not detected; run the project's documented test command manually.");
  }
  return { framework, recommendations, commands };
}

function intentFor(issueClass: string): string {
  switch (issueClass) {
    case "bug":
      return "inspect and fix the defect";
    case "feature":
    case "enhancement":
      return "extend to add the requested behavior";
    case "refactor":
      return "restructure without changing external behavior";
    case "docs":
      return "update documentation";
    default:
      return "review and modify as needed";
  }
}

export function buildImplementationPlan(input: { context: RepositoryContext; editableFiles: AffectedFile[]; testStrategy: TestStrategy }): ImplementationPlan {
  const { context, editableFiles } = input;
  const issueClass = context.classification.class;
  const hasFiles = editableFiles.length > 0;

  const tasks = [
    "Confirm the affected area against the repository using the cited evidence.",
    hasFiles
      ? "Implement the smallest change that resolves the issue in the highest-confidence file(s)."
      : "Investigate the repository to localize the change; no affected files were identified automatically.",
    "Add or update tests for the changed behavior.",
    "Run the validation commands and manual QA below, then review the diff for unintended changes."
  ];

  const fileTouchPlan = editableFiles.map((file) => ({ path: file.path, intent: intentFor(issueClass), confidence: file.confidence }));

  const openQuestions: string[] = [];
  if (!hasFiles) openQuestions.push("Which files implement the behavior described in the issue? Automatic localization found none above the confidence floor.");
  if (context.degraded) openQuestions.push("Repository signals were incomplete (see limitations); confirm stack, structure, and tests manually.");
  openQuestions.push("Is the heuristic affected-file localization correct? Confirm against the actual codebase before editing.");

  return {
    tasks,
    fileTouchPlan,
    validationCommands: validationCommandsFor(context.stack.packageManager),
    manualQa: [
      "Manually verify the scenario described in the issue is resolved.",
      "Check related areas in the affected-file list for regressions."
    ],
    openQuestions
  };
}
