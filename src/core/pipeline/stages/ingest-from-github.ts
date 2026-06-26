import type { GitHubIssueRef } from "../../ports/github-port.js";
import { ingestGitHubIssue } from "../../../github/ingest.js";
import type { FromFileIngestion } from "./ingest-from-file.js";

export type GitHubIngestion = FromFileIngestion;

export async function ingestFromGitHub(ref: GitHubIssueRef): Promise<GitHubIngestion> {
  return ingestGitHubIssue(ref);
}
