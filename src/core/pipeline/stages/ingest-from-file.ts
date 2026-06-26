import { readFile } from "node:fs/promises";
import { z } from "zod";
import { NormalizedIssueSchema } from "../../domain/issue.js";
import { RepoSnapshotSchema } from "../../domain/repository-snapshot.js";
import { taintUntrusted } from "../../domain/trust.js";

const RawIssueSchema = z.object({
  ref: z.object({ owner: z.string(), repo: z.string(), number: z.number().int().positive(), url: z.string().url().optional() }),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([]),
  state: z.enum(["open", "closed"]).default("open"),
  comments: z.array(z.object({ author: z.string(), body: z.string() })).default([])
});
const RawRepoSchema = z.object({
  ref: z.object({ owner: z.string().optional(), name: z.string(), defaultBranch: z.string().default("main"), headSha: z.string().optional() }),
  capped: z.boolean().default(false),
  files: z.array(z.object({ path: z.string(), content: z.string(), sizeBytes: z.number().int().nonnegative().optional() }))
});
const FromFileSchema = z.object({ issue: RawIssueSchema, repository: RawRepoSchema });

export type FromFileIngestion = {
  issue: z.infer<typeof NormalizedIssueSchema>;
  repo: z.infer<typeof RepoSnapshotSchema>;
};

export async function ingestFromFile(filePath: string): Promise<FromFileIngestion> {
  const raw = FromFileSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
  const issue = NormalizedIssueSchema.parse({
    ref: raw.issue.ref,
    title: taintUntrusted(raw.issue.title),
    body: taintUntrusted(raw.issue.body),
    labels: raw.issue.labels,
    assignees: raw.issue.assignees,
    state: raw.issue.state,
    comments: raw.issue.comments.map((comment) => ({ author: comment.author, body: taintUntrusted(comment.body) })),
    linkedIssues: [],
    linkedPRs: [],
    timeline: []
  });
  const repo = RepoSnapshotSchema.parse({
    ref: raw.repository.ref,
    capped: raw.repository.capped,
    files: raw.repository.files.map((file) => ({ path: file.path, content: taintUntrusted(file.content), ...(file.sizeBytes === undefined ? {} : { sizeBytes: file.sizeBytes }) }))
  });
  return { issue, repo };
}