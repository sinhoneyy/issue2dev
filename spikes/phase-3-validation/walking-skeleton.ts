import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type IssueFixture = {
  issue: {
    owner: string;
    repo: string;
    number: number;
    url: string;
    title: string;
    body: string;
    labels: string[];
    comments: { author: string; body: string }[];
  };
  repository: {
    name: string;
    defaultBranch: string;
    files: { path: string; content: string }[];
  };
};

type RepositoryContextLike = {
  schemaVersion: "phase3-spike.1";
  repo: {
    name: string;
    defaultBranch: string;
    language: string;
    packageManager: string;
    framework: string;
    testFramework: string;
    hasReadme: boolean;
    hasCi: boolean;
  };
  issue: {
    ref: string;
    title: string;
    labels: string[];
    classification: string;
  };
  affectedFiles: { path: string; confidence: number; reason: string }[];
  risks: string[];
  validationThesis: string;
};

const DEFAULT_FIXTURE = "spikes/phase-3-validation/fixtures/issue.example.json";
const REPORT_DIR = "spikes/phase-3-validation/reports";

function getFromFileArg(argv: string[]): string {
  const index = argv.indexOf("--from-file");
  if (index === -1) {
    return DEFAULT_FIXTURE;
  }

  const value = argv[index + 1];
  if (!value) {
    throw new Error("--from-file requires a fixture path");
  }

  return value;
}

function parseFixture(raw: string): IssueFixture {
  const parsed = JSON.parse(raw) as IssueFixture;
  if (!parsed.issue?.title || !Array.isArray(parsed.repository?.files)) {
    throw new Error("Fixture must contain issue and repository.files");
  }

  return parsed;
}

function detectPackageManager(files: IssueFixture["repository"]["files"]): string {
  const paths = new Set(files.map((file) => file.path.toLowerCase()));
  if (paths.has("pnpm-lock.yaml")) return "pnpm";
  if (paths.has("yarn.lock")) return "yarn";
  if (paths.has("package-lock.json")) return "npm";
  if (paths.has("package.json")) return "npm-compatible";
  return "unknown";
}

function detectLanguage(files: IssueFixture["repository"]["files"]): string {
  const tsFiles = files.filter((file) => file.path.endsWith(".ts")).length;
  const jsFiles = files.filter((file) => file.path.endsWith(".js")).length;
  if (tsFiles >= jsFiles && tsFiles > 0) return "TypeScript";
  if (jsFiles > 0) return "JavaScript";
  return "unknown";
}

function detectFramework(files: IssueFixture["repository"]["files"]): string {
  const packageJson = files.find((file) => file.path === "package.json")?.content ?? "";
  if (packageJson.includes("express")) return "Express";
  if (packageJson.includes("next")) return "Next.js";
  if (packageJson.includes("react")) return "React";
  return "unknown";
}

function detectTestFramework(files: IssueFixture["repository"]["files"]): string {
  const joined = files.map((file) => `${file.path}\n${file.content}`).join("\n").toLowerCase();
  if (joined.includes("vitest")) return "Vitest";
  if (joined.includes("jest")) return "Jest";
  return "unknown";
}

function classifyIssue(issue: IssueFixture["issue"]): string {
  const haystack = `${issue.title} ${issue.body} ${issue.labels.join(" ")}`.toLowerCase();
  if (haystack.includes("security") || haystack.includes("vulnerability")) return "security";
  if (haystack.includes("fail") || haystack.includes("bug") || haystack.includes("error")) return "bug";
  if (haystack.includes("docs")) return "docs";
  return "feature";
}

function scoreAffectedFiles(fixture: IssueFixture): RepositoryContextLike["affectedFiles"] {
  const terms = new Set(
    `${fixture.issue.title} ${fixture.issue.body} ${fixture.issue.labels.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((term) => term.length >= 5)
  );

  return fixture.repository.files
    .map((file) => {
      const searchable = `${file.path} ${file.content}`.toLowerCase();
      const matches = [...terms].filter((term) => searchable.includes(term));
      return {
        path: file.path,
        confidence: Math.min(0.95, matches.length * 0.18),
        reason: matches.length > 0 ? `matched: ${matches.slice(0, 4).join(", ")}` : "no issue-term match"
      };
    })
    .filter((file) => file.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.path.localeCompare(b.path))
    .slice(0, 5);
}

function buildContext(fixture: IssueFixture): RepositoryContextLike {
  const files = fixture.repository.files;
  const affectedFiles = scoreAffectedFiles(fixture);
  const classification = classifyIssue(fixture.issue);

  return {
    schemaVersion: "phase3-spike.1",
    repo: {
      name: fixture.repository.name,
      defaultBranch: fixture.repository.defaultBranch,
      language: detectLanguage(files),
      packageManager: detectPackageManager(files),
      framework: detectFramework(files),
      testFramework: detectTestFramework(files),
      hasReadme: files.some((file) => file.path.toLowerCase() === "readme.md"),
      hasCi: files.some((file) => file.path.startsWith(".github/workflows/"))
    },
    issue: {
      ref: `${fixture.issue.owner}/${fixture.issue.repo}#${fixture.issue.number}`,
      title: fixture.issue.title,
      labels: fixture.issue.labels,
      classification
    },
    affectedFiles,
    risks: [
      "Coupon validation can be confused with payment failure if errors are not separated.",
      "Case normalization may need tests around existing uppercase coupon behavior."
    ],
    validationThesis: "Repository context adds concrete stack, test, CI, and likely-file signals that are absent from raw issue text."
  };
}

function renderValidationReport(context: RepositoryContextLike): string {
  const affected = context.affectedFiles
    .map((file) => `- ${file.path} (${file.confidence.toFixed(2)}): ${file.reason}`)
    .join("\n");
  const risks = context.risks.map((risk) => `- ${risk}`).join("\n");

  return `# Phase 3 Validation Report\n\n## Thesis\n${context.validationThesis}\n\n## Raw Issue Only\nA raw issue tells us the reported symptom and user impact, but not where to inspect, what stack is present, or how to validate a fix.\n\n## Minimal Repository Context\n- Repository: ${context.repo.name}\n- Language: ${context.repo.language}\n- Package manager: ${context.repo.packageManager}\n- Framework: ${context.repo.framework}\n- Test framework: ${context.repo.testFramework}\n- README present: ${context.repo.hasReadme ? "yes" : "no"}\n- CI present: ${context.repo.hasCi ? "yes" : "no"}\n\n## Classification\n${context.issue.classification}\n\n## Likely Affected Files\n${affected || "- No likely affected files found."}\n\n## Risks\n${risks}\n\n## Validation Takeaway\nThe PRD can now name likely files, expected tests, and implementation risks. That is materially more actionable than the issue text alone, while remaining deterministic and reviewable.\n`;
}

function renderPrd(context: RepositoryContextLike): string {
  const affected = context.affectedFiles.map((file) => `- ${file.path}`).join("\n");

  return `# PRD: ${context.issue.title}\n\n## Problem\nCheckout coupon handling appears to reject lowercase coupon codes and surfaces the failure as a generic payment error.\n\n## Repository Context\nThis appears to be a ${context.repo.language} ${context.repo.framework} service using ${context.repo.testFramework} for tests. CI is ${context.repo.hasCi ? "present" : "not detected"}.\n\n## Goals\n- Accept coupon codes consistently regardless of user-entered case.\n- Show a coupon-specific validation message instead of a payment error.\n- Preserve existing uppercase coupon behavior.\n\n## Non-Goals\n- Do not redesign checkout or payment flows.\n- Do not introduce live GitHub or AI provider dependencies in this validation spike.\n\n## Likely Affected Files\n${affected || "- Needs manual inspection."}\n\n## Validation Plan\n- Add or update coupon normalization tests.\n- Add a regression case for lowercase coupon input.\n- Confirm payment errors remain separate from coupon validation errors.\n\n## Open Questions\n- Should coupon codes be stored normalized, compared normalized, or both?\n- What user-facing copy should appear for invalid coupon format?\n`;
}

async function main(): Promise<void> {
  const fixturePath = path.resolve(getFromFileArg(process.argv.slice(2)));
  const raw = await readFile(fixturePath, "utf8");
  const fixture = parseFixture(raw);
  const context = buildContext(fixture);

  const outputDir = path.resolve(REPORT_DIR);
  await mkdir(outputDir, { recursive: true });

  const reportPath = path.join(outputDir, "validation-report.md");
  const prdPath = path.join(outputDir, "prd.md");
  const contextPath = path.join(outputDir, "repository-context-like.json");

  await writeFile(reportPath, renderValidationReport(context), "utf8");
  await writeFile(prdPath, renderPrd(context), "utf8");
  await writeFile(`${contextPath}`, `${JSON.stringify(context, null, 2)}\n`, "utf8");

  console.log(`Phase 3 validation report: ${reportPath}`);
  console.log(`Phase 3 PRD artifact: ${prdPath}`);
}

await main();
