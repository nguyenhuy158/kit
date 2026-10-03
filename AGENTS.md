# Repository Guidelines

## Project Structure & Module Organization

kit: the code shared by the `*.huyab.click` apps, as one pnpm workspace.
Consumers install each package as a git dependency pinned to a tag
(`pnpm add "github:nguyenhuy158/kit#vX.Y.Z&path:packages/<name>"`), so there is
no registry and no build step: packages ship their source.

```text
packages/
  config/                  # @huyab/config
    biome.json             #   Shared Biome config (consumers: "extends": ["@huyab/config/biome.json"])
    tsconfig.base.json     #   Strict ES2022 / Bundler base (consumers: "extends": "@huyab/config/tsconfig.base.json")
  sso/                     # @huyab/sso — TypeScript source, Web Crypto only
    src/index.ts           #   verifySsoToken, readSsoToken, getClaimsFromRequest, ssoUrl
    src/hono.ts            #   @huyab/sso/hono: requireUser() middleware (hono = optional peer)
    src/sso.test.ts        #   RS256 key generated per run, JWKS served by a stubbed fetch
  e2e/                     # @huyab/e2e — plain ESM JavaScript for Node scripts
    src/server.js          #   startServer (process-group lifecycle), run, freePort
    src/chromium.js        #   findChromium
    src/harness.js         #   BASE, test/assert/request/expectStatus/finish, assertLocalOnly
    src/sso-mock.js        #   startSsoMock: fake issuer + JWKS + token minting
.github/workflows/
  check.yml                # Reusable workflow (workflow_call) used by every app repo
  ci.yml                   # This repo's CI, calling check.yml
docs/ECOSYSTEM.md          # Map of all personal repos and how they relate
```

Rule for adding code: extract only what already exists in at least two repos,
copying the best existing implementation. No speculative abstractions.

## Build, Test, and Development Commands

- `pnpm install`: install workspace dependencies.
- `pnpm check`: `biome check .` then `tsc` (TS and JSDoc-typed JS, `checkJs`).
- `pnpm test`: Vitest, colocated `*.test.ts` / `*.test.js`.
- `pnpm lint` / `pnpm format`: Biome check / format. Format only files you touch.

Use `pnpm` for everything (`pnpm exec ...`, never `npx`).

## Coding Style & Naming Conventions

Biome rules from `packages/config/biome.json` (two spaces, double quotes,
80 columns). TypeScript is strict. Named exports only, `import type` for
types, kebab-case file names. No magic strings or numbers: name them as
constants near their module. `@huyab/sso` must stay dependency-free and run on
Workers, Node >= 22 and browsers. `@huyab/e2e` stays plain JavaScript with
JSDoc types because Node cannot load TypeScript from `node_modules`.

Every export is a contract for other repos: changing a signature or behavior
is a breaking change and needs a new tag plus consumer updates.

## Testing Guidelines

Test observable behavior only: token accepted/rejected, middleware status and
`c.get("user")`, the local-only guard, the server's process group really
dying. No network: the SSO tests stub `fetch`, the e2e tests spawn local
processes on free ports.

## Commit & Pull Request Guidelines

Conventional Commits with an emoji and a scope, header under 80 characters,
e.g. `✨ feat(sso): add audience check`. To release: bump `version` in changed
packages, tag `vX.Y.Z` on `main`, push the tag, then bump consumers.

## Agent-Specific Instructions

Keep responses short and focused. Never commit secrets. Before changing an
export, check its consumers listed in `docs/ECOSYSTEM.md`.
