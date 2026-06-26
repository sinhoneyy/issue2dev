import type { NormalizedIssue } from "../domain/issue.js";
import type { RepoSnapshot } from "../domain/repository-snapshot.js";

export type GitHubIssueRef = {
  owner: string;
  repo: string;
  issueNumber: number;
};

export type GitHubIssueBundle = {
  issue: NormalizedIssue;
  repo: RepoSnapshot;
};

export interface GitHubPort {
  getIssueBundle(ref: GitHubIssueRef): Promise<GitHubIssueBundle>;
}
