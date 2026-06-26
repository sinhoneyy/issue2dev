import { describe, expect, it } from "vitest";
import { ingestGitHubIssue } from "../../src/github/ingest.js";

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

describe("GitHub ingestion", () => {
  it("fetches issue, comments, repo metadata, and tree-selected repository files", async () => {
    const calls: string[] = [];
    const fakeClient = {
      rest: {
        issues: {
          async get() {
            calls.push("issues.get");
            return { data: { number: 42, html_url: "https://github.com/octo/demo/issues/42", title: "Add demo", body: "Please add demo", labels: [], assignees: [], state: "open", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" } };
          },
          async listComments() {
            calls.push("issues.listComments");
            return { data: [{ user: { login: "octocat" }, body: "comment body" }] };
          }
        },
        repos: {
          async get() {
            calls.push("repos.get");
            return { data: { name: "demo", default_branch: "main", pushed_at: "2026-01-03T00:00:00Z" } };
          },
          async getContent(input: { path: string }) {
            calls.push(`repos.getContent:${input.path}`);
            if (input.path === "package.json") return { data: { type: "file", path: "package.json", encoding: "base64", content: base64(JSON.stringify({ dependencies: { express: "latest" } })), size: 36 } };
            if (input.path === "readme.md") return { data: { type: "file", path: "readme.md", encoding: "base64", content: base64("# Demo"), size: 6 } };
            if (input.path === "src/index.ts") return { data: { type: "file", path: "src/index.ts", encoding: "base64", content: base64("export const x = 1;"), size: 19 } };
            const error = new Error("not found") as Error & { status: number };
            error.status = 404;
            throw error;
          }
        },
        git: {
          async getTree(input: { tree_sha: string; recursive?: string }) {
            calls.push(`git.getTree:${input.tree_sha}:${input.recursive}`);
            return {
              data: {
                truncated: false,
                tree: [
                  { type: "blob", path: "readme.md", size: 6 },
                  { type: "blob", path: "package.json", size: 36 },
                  { type: "blob", path: "src/index.ts", size: 19 },
                  { type: "tree", path: "src" },
                  { type: "blob", path: "assets/logo.png", size: 2048 },
                  { type: "blob", path: "node_modules/dep/index.js", size: 10 },
                  { type: "blob", path: "huge.ts", size: 999_999 }
                ]
              }
            };
          }
        }
      }
    };

    const bundle = await ingestGitHubIssue({ owner: "octo", repo: "demo", issueNumber: 42 }, { client: fakeClient });
    expect(bundle.issue.ref.number).toBe(42);
    expect(bundle.issue.comments).toHaveLength(1);
    expect(bundle.repo.ref).toEqual({ owner: "octo", name: "demo", defaultBranch: "main", headSha: "2026-01-03T00:00:00Z" });
    // Selected deterministically by priority then path: manifests (package.json, readme.md), then entry point (src/index.ts).
    // Excludes the image asset, node_modules, and the oversize file.
    expect(bundle.repo.files.map((file) => file.path)).toEqual(["package.json", "readme.md", "src/index.ts"]);
    expect(bundle.repo.capped).toBe(false);
    expect(calls).toContain("git.getTree:main:true");
    expect(calls).not.toContain("repos.getContent:assets/logo.png");
    expect(calls).not.toContain("repos.getContent:huge.ts");
  });

  it("degrades repository file fetching without failing issue ingestion", async () => {
    const fakeClient = {
      rest: {
        issues: {
          async get() {
            return { data: { number: 7, html_url: "https://github.com/octo/demo/issues/7", title: "Question", body: null, labels: [], assignees: [], state: "open", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" } };
          },
          async listComments() {
            return { data: [] };
          }
        },
        repos: {
          async get() {
            return { data: { name: "demo", default_branch: "main", pushed_at: "2026-01-03T00:00:00Z" } };
          },
          async getContent() {
            const error = new Error("not found") as Error & { status: number };
            error.status = 404;
            throw error;
          }
        },
        git: {
          async getTree() {
            const error = new Error("rate limited") as Error & { status: number };
            error.status = 403;
            throw error;
          }
        }
      }
    };

    const bundle = await ingestGitHubIssue({ owner: "octo", repo: "demo", issueNumber: 7 }, { client: fakeClient });
    expect(bundle.issue.body.value).toBe("");
    expect(bundle.repo.files).toEqual([]);
    expect(bundle.repo.capped).toBe(true);
  });
});
