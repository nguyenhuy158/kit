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

## Help rule

Applies to every app with a UI that people must learn to use. `chia-keo` is the
reference: `frontend/src/routes/HelpPage.tsx`, `help-content.ts`,
`HelpPage.dom.test.ts` and the screenshots in `public/help/`.

- The app has a `/help` page, linked from its menu or settings. It is a
  reading-only page, so it may scroll (exception in the One-screen rule).
- The text is data, not JSX: one `help-content.ts` file exports groups, each with
  topics. A group has `id`, `title` and `topics`. A topic has `id`, `title`,
  `steps` (strings), an optional `image` (`src`, `alt`) and optional `links`
  (`label`, `to`).
- One topic is one task the user wants to do. Group topics by that goal, not by
  screen. Write steps as short commands and put the exact button name in quotes.
- Show topics in the ui-kit `Accordion`: one `h1` for the page and one `h2` per
  group (`aria-labelledby`). Do not hand-roll an accordion.
- Screenshots live in `public/help/<topic-id>.png`. Every image has `alt` text. Use
  test data only: no real names, amounts, account numbers or secrets.
- `to` in a link is a union of the app's real routes, so the type checker rejects
  a page that does not exist.
- Write the help in the languages the app UI supports (same i18n as the app).
- A pull request that renames a button, moves a screen or adds a feature updates
  the matching help topic in the same pull request.
- Add a test that checks: topic ids are unique, every topic has at least one step,
  every `alt` is not empty, every image file exists, every link target is a known
  page.

## Settings rule

Applies to every app with a UI that has options the user can change. References:
`notes` `frontend/src/screens/SettingsScreen.tsx` (full page) and `chia-keo`
`frontend/src/routes/SettingsPage.tsx`. An existing app moves to this rule when
its Settings page is next changed.

- The app has one Settings page, linked from its menu or bottom nav. Every option
  the user can change lives there, not spread over other screens.
- Groups come in this order; skip a group the app does not have: account (name
  and email from SSO), look (theme, language), app options, data (export, trash),
  the `/help` link, sign out.
- One group is one ui-kit `Card` with a title. Use only ui-kit primitives:
  `Switch` for on/off, `Radio` or `Listbox` for a choice, `Field` + `Input` for
  text and numbers, `ThemeToggle` for the theme. Do not hand-roll a control.
- A switch or a choice saves at once. A text or number field has its own Save
  button. There is no Save button for the whole page. A failed save shows a
  Toast and puts the old value back.
- Where a value lives: an option for this device only (theme, language, PIN lock)
  goes in `localStorage`; an option the server needs or that must follow the user
  to other devices goes in the app's database through the API (`monitor`:
  `PUT /api/settings`; `chia-keo`: `user_preferences`).
- Read stored values with care: an unknown key or a broken value falls back to
  the default. One bad row must not break the page.
- Sign out is the last item, in the danger style, and goes to `/logout`. An action
  that deletes data asks first with `useConfirm()`.
- The One-screen rule still applies. When the options do not fit one viewport,
  split them with ui-kit `Tabs` or open a group as its own screen.
- A secret (API token, PIN) is shown once or never, not printed back on the page.
- Write the labels in the languages the app UI supports (same i18n as the app).

## Access control rule

Applies to every app and API with sign-in. Checklist: `docs/RBAC-CHECKLIST.md`.

- Who you are comes only from SSO (`@huyab/sso`: the `huyab_sso` cookie, or a Bearer
  token for CLIs and native apps). No sign-in means `401`; in Hono use
  `requireUser()` from `@huyab/sso/hono`.
- Deny by default. Every `/api/*` route needs the sign-in check, except the ones
  named public on purpose (`/api/version`, `/api/health`, a share link). A new route
  is private until someone writes down why it is public.
- Roles live in the app's data, not in the SSO token. SSO says who you are, the app
  says what you may do. The roles in use:
  - owner: the user who created the row (`user_id` or `user_email` column);
  - collaborator: invited to one resource (`chia-keo` game collaborators);
  - admin: the email equals an `ADMIN_EMAIL` variable (the `mailer` log page).
- Check on the server, in one place, never in the UI. Put the rule in one policy or
  use-case function (`chia-keo`: `getAccessibleGame` for owner and collaborator,
  `getOwnedGame` for owner only) and make every route call it.
- Load a row by id and owner together (`WHERE id = ? AND user_id = ?`), never by id
  alone (`notes`: `findOwnedNote`).
- Status codes: `401` not signed in. `404` when the row is not yours or does not
  exist (do not tell which). `403` only when the user can already see the resource
  but may not do this action.
- Machine access is narrower than user access: a token has scopes (`chia-keo` MCP
  `MCP_SCOPES`), is stored as a hash and shown once. Service-to-service calls use a
  service binding plus a secret header (`mailer`: `INTERNAL_API_KEY`). A master
  password is for CLIs and agents only (`share`).
- A public link uses a random token, a rate limit and a way to turn it off
  (`chia-keo` share links).
- Never put a secret, token or password hash in a log or an API response.
- Test the roles: owner is allowed, another user gets `404`, a collaborator cannot do
  an owner-only action, no sign-in gets `401`.

## Analytics rule

Applies to every app with a UI that uses PostHog. Personal apps use the bws key
`POSTHOG_PERSONAL_KEY`, passed as the build variable `VITE_POSTHOG_KEY` (and
`VITE_POSTHOG_HOST` if the project is not on US cloud). Never commit the key.
No key means no events. No session recording and no user identity. See
`docs/ECOSYSTEM.md` section 4.6.

## CLI rule

Applies to every repo that ships a command line. `chia-keo` is the reference:
`cli/chiakeo.mjs`, `cli/package.json` and `cli/README.md`.
Checklist and steps to create one: `docs/CLI-CHECKLIST.md`.

- Write all CLI text in simple English (CEFR A2): help, prompts, errors and
  success messages. Short sentences, common words. The CLI does not follow the
  app UI language.
- One file per CLI, plain Node ESM (Node 22 or newer), no build step and no
  dependencies. The `bin` name is the app name.
- Sign in with a device code: `up` prints a link and a code, the user approves on
  the web, and `down` deletes the token. The CLI never asks for a password.
- Save the token in `~/.config/<app>/config.json` with mode 600. An env variable
  (`<APP>_CONFIG`) can change the path. Never print the token.
- Running the CLI with no arguments prints the help. A wrong command, a missing
  argument or an API error prints one short line and exits with code 1.
- Name every magic string and number as a constant. Do not add comments that only
  repeat the code.
- Add an e2e check that runs the real binary: `up`, one read, one write, `down`.

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
