import type { RepoFile } from "../core/domain/repository-snapshot.js";
import { taintUntrusted } from "../core/domain/trust.js";
import type { GitHubIssueBundle, GitHubIssueRef, GitHubPort } from "../core/ports/github-port.js";
import { createGitHubClient } from "./client.js";
import { mapGitHubIssue, mapGitHubRepoSnapshot } from "./mapper.js";

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
  };
};

const CANDIDATE_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  "tsconfig.json",
  "README.md",
  "CONTRIBUTING.md",
  ".github/workflows/ci.yml",
  ".github/workflows/test.yml",
  "src/index.ts",
  "src/main.ts",
  "index.ts"
];
const MAX_FILE_BYTES = 50_000;
const MAX_FILES = 12;

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

async function fetchCandidateFiles(input: { client: GitHubApi; owner: string; repo: string; ref?: string }): Promise<{ files: RepoFile[]; capped: boolean }> {
  const files: RepoFile[] = [];
  let capped = false;
  for (const path of CANDIDATE_FILES) {
    if (files.length >= MAX_FILES) {
      capped = true;
      break;
    }
    try {
      const response = await input.client.rest.repos.getContent({ owner: input.owner, repo: input.repo, path, ...(input.ref ? { ref: input.ref } : {}) });
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
    const files = await fetchCandidateFiles(repoData.default_branch ? { client: this.client, owner: ref.owner, repo: ref.repo, ref: repoData.default_branch } : { client: this.client, owner: ref.owner, repo: ref.repo });
    return {
      issue: mapGitHubIssue({ owner: ref.owner, repo: ref.repo, issue: issueResponse.data as Parameters<typeof mapGitHubIssue>[0]["issue"], comments: commentResponse.data as NonNullable<Parameters<typeof mapGitHubIssue>[0]["comments"]> }),
      repo: mapGitHubRepoSnapshot({ owner: ref.owner, repo: repoResponse.data as Parameters<typeof mapGitHubRepoSnapshot>[0]["repo"], files: files.files, capped: files.capped })
    };
  }
}

export async function ingestGitHubIssue(ref: GitHubIssueRef, input: { client?: GitHubApi } = {}): Promise<GitHubIssueBundle> {
  return new OctokitGitHubPort(input.client).getIssueBundle(ref);
}
