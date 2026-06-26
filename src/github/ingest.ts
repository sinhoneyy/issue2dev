import type { RepoFile } from "../core/domain/repository-snapshot.js";
import { taintUntrusted } from "../core/domain/trust.js";
import type { GitHubIssueBundle, GitHubIssueRef, GitHubPort } from "../core/ports/github-port.js";
import { createGitHubClient } from "./client.js";
import { mapGitHubIssue, mapGitHubRepoSnapshot } from "./mapper.js";

type TreeEntry = { path?: string; type?: string; size?: number };
type TreeResponse = { tree?: TreeEntry[]; truncated?: boolean };

type GitHubApi = {
  rest: {
    issues: {
      get(input: { owner: string; repo: string; issue_number: number }): Promise<{ data: unknown }>;
      listComments(input: { owner: string; repo: string; issue_number: number; per_page: number }): Promise<{ data: unknown[] }>;
    };
    repos: {
      get(input: { owner: string; repo: string }): Promise<{ data: unknown }>;
      getContent(input: { owner: string; repo: string; path: string; ref?: string }): Promise<{ data: unknown }>;
    };
    git: {
      getTree(input: { owner: string; repo: string; tree_sha: string; recursive?: string }): Promise<{ data: unknown }>;
    };
  };
};

// Files whose presence or content carries repository-intelligence signal, selected by
// basename (case-insensitive) regardless of language ecosystem.
const MANIFEST_BASENAMES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "pnpm-workspace.yaml",
  "turbo.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "setup.cfg",
  "cargo.toml",
  "go.mod",
  "readme.md",
  "contributing.md"
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"]);
const EXCLUDED_DIR = /(^|\/)(node_modules|dist|build|out|coverage|vendor|\.git|\.next|\.turbo)\//u;
const MAX_FILE_BYTES = 50_000;
const MAX_FILES = 24;

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === 404;
}

function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\n/gu, ""), "base64").toString("utf8");
}

function contentDataToRepoFile(data: unknown): RepoFile | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const item = data as { type?: string; path?: string; content?: string; encoding?: string; size?: number };
  if (item.type !== "file" || !item.path || typeof item.content !== "string") return undefined;
  const sizeBytes = item.size ?? Buffer.byteLength(item.content, "utf8");
  if (sizeBytes > MAX_FILE_BYTES) return undefined;
  const value = item.encoding === "base64" ? decodeBase64(item.content) : item.content;
  return { path: item.path, content: taintUntrusted(value), sizeBytes };
}

// Lower number = higher priority. `undefined` means the file is not relevant for analysis.
function filePriority(path: string): number | undefined {
  const lower = path.toLowerCase();
  if (EXCLUDED_DIR.test(`/${lower}`)) return undefined;
  const basename = lower.split("/").pop() ?? lower;
  if (MANIFEST_BASENAMES.has(basename)) return 0;
  if (lower.startsWith(".github/workflows/") && (lower.endsWith(".yml") || lower.endsWith(".yaml"))) return 1;
  if (/^(src\/)?(index|main|cli|app)\.(ts|tsx|js|jsx|py|go|rs)$/u.test(lower)) return 2;
  if (/\.(test|spec)\./u.test(lower) || lower.startsWith("test/") || lower.startsWith("tests/")) return 3;
  const extension = lower.match(/\.[^.\/]+$/u)?.[0] ?? "";
  if (SOURCE_EXTENSIONS.has(extension)) return 4;
  return undefined;
}

// Per-priority caps so one category (e.g. nested manifests in a monorepo) cannot consume
// the whole budget and starve source files that drive language/architecture detection.
const PRIORITY_ORDER = [0, 1, 2, 3, 4];
const PRIORITY_CAPS = new Map<number, number>([[0, 8], [1, 3], [2, 5], [3, 4], [4, MAX_FILES]]);

function depthOf(path: string): number {
  return (path.match(/\//gu) ?? []).length;
}

// Deterministically choose a bounded, category-balanced set of relevant files from the
// recursive tree. Shallower paths win ties so root manifests and entry points are preferred.
function selectTreePaths(tree: TreeEntry[], truncated: boolean): { paths: string[]; capped: boolean } {
  const byPriority = new Map<number, string[]>();
  let totalCandidates = 0;
  for (const entry of tree) {
    if (entry.type !== "blob" || !entry.path) continue;
    if (typeof entry.size === "number" && entry.size > MAX_FILE_BYTES) continue;
    const priority = filePriority(entry.path);
    if (priority === undefined) continue;
    const list = byPriority.get(priority) ?? [];
    list.push(entry.path);
    byPriority.set(priority, list);
    totalCandidates += 1;
  }
  for (const list of byPriority.values()) {
    list.sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
  }

  const selected = new Set<string>();
  // First pass: honor per-category caps so every category gets a fair share of the budget.
  for (const priority of PRIORITY_ORDER) {
    const list = byPriority.get(priority) ?? [];
    for (const path of list.slice(0, PRIORITY_CAPS.get(priority) ?? 0)) {
      if (selected.size >= MAX_FILES) break;
      selected.add(path);
    }
  }
  // Second pass: backfill any remaining budget from leftover candidates in priority order.
  for (const priority of PRIORITY_ORDER) {
    if (selected.size >= MAX_FILES) break;
    for (const path of byPriority.get(priority) ?? []) {
      if (selected.size >= MAX_FILES) break;
      selected.add(path);
    }
  }

  const paths = [...selected].sort((a, b) => a.localeCompare(b));
  return { paths, capped: truncated || totalCandidates > paths.length };
}

async function fetchRepositoryFiles(input: { client: GitHubApi; owner: string; repo: string; ref: string }): Promise<{ files: RepoFile[]; capped: boolean }> {
  let tree: TreeResponse;
  try {
    const response = await input.client.rest.git.getTree({ owner: input.owner, repo: input.repo, tree_sha: input.ref, recursive: "true" });
    tree = (response.data ?? {}) as TreeResponse;
  } catch {
    return { files: [], capped: true };
  }

  const { paths, capped: selectionCapped } = selectTreePaths(tree.tree ?? [], Boolean(tree.truncated));
  const files: RepoFile[] = [];
  let capped = selectionCapped;
  for (const path of paths) {
    try {
      const response = await input.client.rest.repos.getContent({ owner: input.owner, repo: input.repo, path, ref: input.ref });
      const file = contentDataToRepoFile(response.data);
      if (file) files.push(file);
    } catch (error) {
      if (!isNotFound(error)) capped = true;
    }
  }
  return { files, capped };
}

export class OctokitGitHubPort implements GitHubPort {
  constructor(private readonly client: GitHubApi = createGitHubClient()) {}

  async getIssueBundle(ref: GitHubIssueRef): Promise<GitHubIssueBundle> {
    const [issueResponse, commentResponse, repoResponse] = await Promise.all([
      this.client.rest.issues.get({ owner: ref.owner, repo: ref.repo, issue_number: ref.issueNumber }),
      this.client.rest.issues.listComments({ owner: ref.owner, repo: ref.repo, issue_number: ref.issueNumber, per_page: 20 }),
      this.client.rest.repos.get({ owner: ref.owner, repo: ref.repo })
    ]);
    const repoData = repoResponse.data as { default_branch?: string };
    const files = await fetchRepositoryFiles({ client: this.client, owner: ref.owner, repo: ref.repo, ref: repoData.default_branch ?? "HEAD" });
    return {
      issue: mapGitHubIssue({ owner: ref.owner, repo: ref.repo, issue: issueResponse.data as Parameters<typeof mapGitHubIssue>[0]["issue"], comments: commentResponse.data as NonNullable<Parameters<typeof mapGitHubIssue>[0]["comments"]> }),
      repo: mapGitHubRepoSnapshot({ owner: ref.owner, repo: repoResponse.data as Parameters<typeof mapGitHubRepoSnapshot>[0]["repo"], files: files.files, capped: files.capped })
    };
  }
}

export async function ingestGitHubIssue(ref: GitHubIssueRef, input: { client?: GitHubApi } = {}): Promise<GitHubIssueBundle> {
  return new OctokitGitHubPort(input.client).getIssueBundle(ref);
}
