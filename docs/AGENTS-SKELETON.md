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
| 7 | `## Deploy & CI` | Only for repos that deploy |
| 8 | Repo-specific sections | For example `## Architecture Decisions & Pitfalls` |
| 9 | `## Agent-Specific Instructions` | Always last |

Add new repo-specific sections at step 8, never after `Agent-Specific Instructions`.
