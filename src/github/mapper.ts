import type { RestEndpointMethodTypes } from "@octokit/rest";
import { NormalizedIssueSchema, type NormalizedIssue } from "../core/domain/issue.js";
import { RepoSnapshotSchema, type RepoFile, type RepoSnapshot } from "../core/domain/repository-snapshot.js";
import { taintUntrusted } from "../core/domain/trust.js";

type IssueResponse = RestEndpointMethodTypes["issues"]["get"]["response"]["data"];
type CommentResponse = RestEndpointMethodTypes["issues"]["listComments"]["response"]["data"][number];
type RepoResponse = RestEndpointMethodTypes["repos"]["get"]["response"]["data"];

export function mapGitHubIssue(input: { owner: string; repo: string; issue: IssueResponse; comments?: CommentResponse[] }): NormalizedIssue {
  return NormalizedIssueSchema.parse({
    ref: {
      owner: input.owner,
      repo: input.repo,
      number: input.issue.number,
      url: input.issue.html_url
    },
    title: taintUntrusted(input.issue.title),
    body: taintUntrusted(input.issue.body ?? ""),
    labels: input.issue.labels.map((label) => typeof label === "string" ? label : label.name).filter((label): label is string => Boolean(label)),
    assignees: (input.issue.assignees ?? []).map((assignee) => assignee.login),
    milestone: input.issue.milestone?.title,
    state: input.issue.state === "closed" ? "closed" : "open",
    comments: (input.comments ?? []).map((comment) => ({ author: comment.user?.login ?? "unknown", body: taintUntrusted(comment.body ?? "") })),
    linkedIssues: [],
    linkedPRs: [],
    timeline: [],
    fetchedAt: input.issue.updated_at ?? input.issue.created_at ?? undefined
  });
}

export function mapGitHubRepoSnapshot(input: { owner: string; repo: RepoResponse; files: RepoFile[]; capped: boolean }): RepoSnapshot {
  return RepoSnapshotSchema.parse({
    ref: {
      owner: input.owner,
      name: input.repo.name,
      defaultBranch: input.repo.default_branch ?? "main",
      headSha: input.repo.pushed_at ?? undefined
    },
    capped: input.capped,
    files: input.files
  });
}
