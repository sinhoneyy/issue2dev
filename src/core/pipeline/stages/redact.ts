import type { NormalizedIssue } from "../../domain/issue.js";
import type { RepoSnapshot } from "../../domain/repository-snapshot.js";

const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]{20,}/gu,
  /(?:api[_-]?key|token|secret)\s*[:=]\s*[^\s]+/giu
];

function redactText(value: string): string {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value);
}

export function redactInputs(input: { issue: NormalizedIssue; repo: RepoSnapshot }): { issue: NormalizedIssue; repo: RepoSnapshot } {
  return {
    issue: {
      ...input.issue,
      title: { ...input.issue.title, value: redactText(input.issue.title.value) },
      body: { ...input.issue.body, value: redactText(input.issue.body.value) },
      comments: input.issue.comments.map((comment) => ({ ...comment, body: { ...comment.body, value: redactText(comment.body.value) } }))
    },
    repo: {
      ...input.repo,
      files: input.repo.files.map((file) => ({ ...file, content: { ...file.content, value: redactText(file.content.value) } }))
    }
  };
}