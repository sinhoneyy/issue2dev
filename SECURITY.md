# Security Policy

## Reporting A Vulnerability

Please report suspected vulnerabilities privately. Do not open a public issue for security-sensitive reports.

Send a concise report to the project maintainer with:

- affected version or commit
- reproduction steps
- expected and actual behavior
- any relevant logs or output with secrets removed

If a dedicated security contact is not yet published for this repository, contact the maintainer through the repository owner profile and request a private disclosure channel.

## Current Security Scope

Issue2Dev v0.1 performs read-only issue ingestion and writes local output files. It does not write comments to GitHub, modify repositories, run a server, or load plugins.

GitHub access uses `GITHUB_TOKEN` only when provided by the user. Do not include tokens, secrets, or private repository data in public bug reports.