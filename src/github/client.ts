import { Octokit } from "@octokit/rest";

const silentLog = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

export function createGitHubClient(input: { token?: string } = {}): Octokit {
  const auth = input.token ?? process.env.GITHUB_TOKEN;
  return new Octokit({
    auth: auth && auth.length > 0 ? auth : undefined,
    log: silentLog,
    userAgent: "issue2dev/0.0.0"
  });
}
