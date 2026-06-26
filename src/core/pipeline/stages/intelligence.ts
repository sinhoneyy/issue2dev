import type { IntelligenceEngine } from "../../ports/intelligence-engine-port.js";
import type { NormalizedIssue } from "../../domain/issue.js";
import type { RepositoryContext } from "../../domain/repository-context.js";
import type { RepoSnapshot } from "../../domain/repository-snapshot.js";

export async function runIntelligence(input: { issue: NormalizedIssue; repo: RepoSnapshot; engine: IntelligenceEngine }): Promise<RepositoryContext> {
  return input.engine.analyze({ issue: input.issue, repo: input.repo });
}