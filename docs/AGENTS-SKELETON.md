# AGENTS.md skeleton

Every repo's `AGENTS.md` uses the same top-level sections in the same order. Keep
the section names exactly. Skip a section only when it does not apply (for
example, a lib with no deploy has no `Deploy & CI`).

| # | Section | Notes |
|---|---|---|
| - | `# Repository Guidelines` | Title |
| 1 | `## Project Structure & Module Organization` | What the repo is, file tree |
| 2 | `## Ecosystem` | Link to `kit/docs/ECOSYSTEM.md`, what it talks to |
| 3 | `## Build, Test, and Development Commands` | `pnpm` scripts |
| 4 | `## Coding Style & Naming Conventions` | Includes the `ui-kit` rule for apps with a UI |
| 5 | `## Testing Guidelines` | Unit and e2e |
| 6 | `## Commit & Pull Request Guidelines` | Conventional Commits with an emoji |
| 7 | `## Deploy & CI` | Every repo: CI (lint + check), Cloudflare Workers Builds for repos that deploy, no local deploy |
| 8 | Repo-specific sections | For example `## Architecture Decisions & Pitfalls` |
| 9 | `## Agent-Specific Instructions` | Always last |

Every `Agent-Specific Instructions` must keep the secret-scan rule (gitleaks
pre-commit hook, no `--no-verify`, CI gitleaks job).

Add new repo-specific sections at step 8, never after `Agent-Specific Instructions`.

## One-screen rule

Applies to every app with a UI and to `ui-kit`. Add this sentence to the repo's
`Agent-Specific Instructions`:

> Design every screen to fit one viewport with no scrolling: use ui-kit `Screen`
> and `PagedList`, and check it in e2e with `assertFitsViewport` from
> `@huyab/e2e`. Exceptions: reading-only pages and form Sheets/Modals.

Details: `ECOSYSTEM.md` section 4.5.

## Delivery rule

Applies to `kit`, `ui-kit` and every app that uses them.

- Every repo runs CI on each pull request and on `main`: install, `pnpm lint`,
  `pnpm check`, and tests, build and e2e where the repo has them. Use the
  reusable `kit/.github/workflows/check.yml`.
- Every repo that ships (apps, the `ui-kit` gallery) is deployed by Cloudflare
  Workers Builds from `main`. Never run `wrangler deploy` or `pnpm deploy` from a
  local machine: it skips CI and nobody else can check it.
- Libraries with no deploy (`kit`) get CI only. A release is a tag, not a local
  publish.
- Local runs are for checking. Confirm a deploy with the live version endpoint
  (for example `/api/version`).
