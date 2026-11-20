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
| 4 | `## Coding Style & Naming Conventions` | Includes the `ui-kit` rule for apps with a UI, and its grid (4 columns on mobile, 12 from 48rem) |
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

## No native dialogs rule

Applies to every app with a UI and to `ui-kit`. Never call the browser's
`alert()`, `confirm()` or `prompt()` (also not as `window.confirm`): they ignore
the theme and look like a browser error. Use the ui-kit popups instead:
`useConfirm()` for yes/no, `usePrompt()` for a text answer, and a Toast for a
notice. `@huyab/config` enforces it with Biome `style/noRestrictedGlobals`
(the rule does not see `window.confirm`, so review for it).

## Frontend checklist rule

Applies to every app with a UI and to `ui-kit`. Check UI work against the
[Front-End Checklist rules](https://frontendchecklist.io/rules) (accessibility,
CSS, HTML, images, performance, security). Critical and High rules block a
merge unless the PR says why a rule does not apply. A library skips the
page-level groups it cannot own (SEO, privacy, hosting headers).

## Mobile keyboard rule

Applies to every app with a UI and to `ui-kit`. Every text field opens the
keyboard that matches its data: `type="email"`, `"tel"`, `"url"` or
`"search"`, and `inputMode="numeric"` (default text type, not
`type="number"`) for money, quantities and codes. Add `autoComplete`
(`email`, `tel`, `one-time-code`, `current-password`) so the phone can fill
it. ui-kit `Input` adds `inputMode` and `autoComplete` from `type`; plain HTML
fields set them by hand.

## Layout rule

Applies to every app that has a browser frontend and a Worker backend in one
repo (for example `chia-keo`). New apps follow it from the start; an existing app
moves when its owner next restructures it, in its own pull request.

- Frontend code lives in `frontend/src/`, backend (Worker) code in `backend/src/`.
- Code used by both lives in `shared/` at the repo root: pure logic and types, no
  IO, no `window`, no `fetch`.
- Root files stay at the root: `index.html`, `public/`, `vite.config.ts`,
  `wrangler.toml`, `package.json`.
- Name the TypeScript project for the Worker `tsconfig.backend.json`.
- Libraries (`kit`) and the `ui-kit` gallery have no backend and keep a plain `src/`.

## Analytics rule

Applies to every app with a UI that uses PostHog. Personal apps use the bws key
`POSTHOG_PERSONAL_KEY`, passed as the build variable `VITE_POSTHOG_KEY` (and
`VITE_POSTHOG_HOST` if the project is not on US cloud). Never commit the key.
No key means no events. No session recording and no user identity. See
`docs/ECOSYSTEM.md` section 4.6.

## Delivery rule

Applies to `kit`, `ui-kit` and every app that uses them.

- Every repo runs CI on each pull request and on `main`: install, `pnpm lint`,
  `pnpm check`, `pnpm audit --prod`, a gitleaks scan, and tests, build and e2e
  where the repo has them. Use the
  reusable `kit/.github/workflows/check.yml`.
- Every repo that ships (apps, the `ui-kit` gallery) is deployed by Cloudflare
  Workers Builds from `main`. Never run `wrangler deploy` or `pnpm deploy` from a
  local machine: it skips CI and nobody else can check it.
- Libraries with no deploy (`kit`) get CI only. A release is a tag, not a local
  publish.
- Local runs are for checking. Confirm a deploy with the live version endpoint
  (for example `/api/version`).

## Ignore files rule

Applies to every repo.

- Every repo has a `.gitignore` and a `.dockerignore`, even a repo with no Dockerfile
  (a Worker build or a later container then starts clean).
- Both cover: dependencies (`node_modules/`, `.pnpm-store/`), build and test output
  (`dist/`, `build/`, `coverage/`, `playwright-report/`, `test-results/`, `.vite/`,
  `.turbo/`, `.cache/`, `*.tsbuildinfo`, `e2e-failure.png`), env files (`.env`,
  `.env.*`, `.dev.vars`, `.dev.vars.*`) with the `*.example` files kept, `.wrangler/`,
  logs, OS and editor files, and Claude local files (`.claude/settings.local.json`,
  `CLAUDE.local.md`).
- `.dockerignore` also skips `.git`, `.github` and the Docker files themselves.
- Add only the missing lines to an existing file. A pattern must not match a tracked
  file: check with `git ls-files -ci --exclude-standard` (it prints nothing).
- If a file that is ignored is already tracked, remove it from git with
  `git rm --cached`, in its own pull request.
