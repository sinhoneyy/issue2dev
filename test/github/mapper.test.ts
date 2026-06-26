import { describe, expect, it } from "vitest";
import { mapGitHubIssue, mapGitHubRepoSnapshot } from "../../src/github/mapper.js";
import { taintUntrusted } from "../../src/core/domain/trust.js";

describe("GitHub mapper", () => {
  it("normalizes a GitHub issue into the existing NormalizedIssue shape", () => {
    const issue = mapGitHubIssue({
      owner: "octo",
      repo: "demo",
      issue: {
        number: 42,
        html_url: "https://github.com/octo/demo/issues/42",
        title: "Bug: demo issue",
        body: "Issue body with user supplied content",
        labels: [{ name: "bug" }, "triage"],
        assignees: [{ login: "maintainer" }],
        milestone: { title: "v1" },
        state: "open",
        updated_at: "2026-01-01T00:00:00Z",
        created_at: "2025-12-31T00:00:00Z"
      } as unknown as Parameters<typeof mapGitHubIssue>[0]["issue"],
      comments: [
        { user: { login: "reporter" }, body: "extra detail" }
      ] as unknown as NonNullable<Parameters<typeof mapGitHubIssue>[0]["comments"]>
    });

    expect(issue.ref).toEqual({ owner: "octo", repo: "demo", number: 42, url: "https://github.com/octo/demo/issues/42" });
    expect(issue.title).toEqual(taintUntrusted("Bug: demo issue"));
    expect(issue.labels).toEqual(["bug", "triage"]);
    expect(issue.assignees).toEqual(["maintainer"]);
    expect(issue.comments[0]?.body).toEqual(taintUntrusted("extra detail"));
    expect(issue.fetchedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("normalizes repository metadata and bounded files into RepoSnapshot", () => {
    const repo = mapGitHubRepoSnapshot({
      owner: "octo",
      repo: { name: "demo", default_branch: "main", pushed_at: "2026-01-01T00:00:00Z" } as unknown as Parameters<typeof mapGitHubRepoSnapshot>[0]["repo"],
      capped: false,
      files: [{ path: "README.md", content: taintUntrusted("# Demo"), sizeBytes: 6 }]
    });

    expect(repo.ref).toEqual({ owner: "octo", name: "demo", defaultBranch: "main", headSha: "2026-01-01T00:00:00Z" });
    expect(repo.files).toHaveLength(1);
    expect(repo.capped).toBe(false);
  });
});
