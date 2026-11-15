# kit

Code shared by the `*.huyab.cfd` apps. One pnpm workspace, consumed straight
from GitHub as git dependencies pinned to a tag — no registry, no build step.
How the repos relate is mapped in [docs/ECOSYSTEM.md](docs/ECOSYSTEM.md).

| Package | What it is |
| --- | --- |
| [`@huyab/config`](#huyabconfig) | Shared `biome.json` and `tsconfig.base.json` |
| [`@huyab/sso`](#huyabsso) | Verify the `huyab_sso` cookie / Bearer JWT from auth.huyab.cfd; Hono `requireUser()` |
| [`@huyab/cron`](#huyabcron) | Cron hub protocol: the hub sends a tick every minute, each spoke runs the jobs that are due and ignores the rest |
| [`@huyab/e2e`](#huyabe2e) | Local E2E plumbing: dev-server lifecycle, Chromium lookup, fetch harness, local-only guard, fake SSO issuer |

Install any package with its path inside this repo (quote it: `&` is special in
the shell):

```sh
pnpm add "github:nguyenhuy158/kit#v0.1.0&path:packages/<name>"
```

## UI components: use `ui-kit`

kit has no UI code. Every app with a UI must use
[`ui-kit`](https://github.com/nguyenhuy158/ui-kit) (gallery:
https://uikit.huyab.cfd) for design tokens and UI primitives. It is copy-paste, not
a package. If a primitive is missing, add it to `ui-kit` first, then copy it into the
app. Do not hand-roll one in the app. Details: `docs/ECOSYSTEM.md` section 4.3.

## `@huyab/config`

```sh
pnpm add -D "github:nguyenhuy158/kit#v0.1.0&path:packages/config"
```

`biome.json` (Biome 2.5):

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "extends": ["@huyab/config/biome.json"]
}
```

`tsconfig.json` — the base sets strict ES2022/ESNext/Bundler with `noEmit`;
add the runtime's `lib`/`types` and `include`:

```json
{
  "extends": "@huyab/config/tsconfig.base.json",
  "compilerOptions": { "types": ["@cloudflare/workers-types"] },
  "include": ["src"]
}
```

## `@huyab/sso`

```sh
pnpm add "github:nguyenhuy158/kit#v0.1.0&path:packages/sso"
```

Plain TypeScript source on Web Crypto, no dependency. Wrangler, Vite and Vitest
bundle it as-is; Next.js needs `transpilePackages: ["@huyab/sso"]`. The
consumer's `lib`/`types` must provide `fetch` and `crypto` (Workers types or
`DOM`).

```ts
import { requireUser, type SsoVariables } from "@huyab/sso/hono";

type Env = { Bindings: { SSO_ISSUER: string }; Variables: SsoVariables };
const app = new Hono<Env>();

// 401 {"error":"unauthorized"} unless the cookie or Bearer token verifies
// against the SSO_ISSUER binding (fallback https://auth.huyab.cfd).
app.use("/api/*", requireUser());
app.get("/api/me", (c) => c.json({ email: c.get("user").email }));
```

Without Hono:

```ts
import { getClaimsFromRequest, ssoUrl } from "@huyab/sso";

const claims = await getClaimsFromRequest(request, env.SSO_ISSUER); // SsoClaims | null
if (!claims) return Response.redirect(ssoUrl(env.SSO_ISSUER, "/login", request.url), 302);
```

| Export | |
| --- | --- |
| `verifySsoToken(token, issuer, { audience? })` | `SsoClaims` or `null` (never throws). Checks RS256 signature against `<issuer>/.well-known/jwks.json` (keys cached per isolate, failures not cached), `iss`, `exp`, `sub`, `email`, and `aud` when `audience` is given. |
| `readSsoToken(headers)` | `huyab_sso` cookie, else `Authorization: Bearer`, else `null`. |
| `getClaimsFromRequest(request, issuer, { audience? })` | `readSsoToken` + `verifySsoToken`. |
| `ssoUrl(issuer, "/login" \| "/logout", redirectTo)` | Issuer URL that returns the visitor to `redirectTo`. |
| `SSO_COOKIE`, `DEFAULT_SSO_ISSUER` | `"huyab_sso"`, `"https://auth.huyab.cfd"`. |
| `type SsoClaims`, `type VerifyOptions` | |
| `@huyab/sso/hono`: `requireUser({ issuer?, audience? })`, `type SsoVariables`, `type RequireUserOptions` | Middleware; sets `c.get("user")`. `hono` is an optional peer dependency. |

## `@huyab/e2e`

```sh
pnpm add -D "github:nguyenhuy158/kit#v0.1.0&path:packages/e2e"
```

Plain ESM JavaScript for Node >= 22 scripts (`node e2e/run.mjs`).

`e2e/run.mjs` — one command: fake SSO, local server, suites, teardown:

```js
import { freePort, run, startServer, startSsoMock } from "@huyab/e2e";

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const sso = await startSsoMock();
const server = await startServer({
  command: "pnpm",
  args: ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", port, "--var", `SSO_ISSUER:${sso.issuer}`],
  readyUrl: `${base}/api/version`,
});
let failed = false;
try {
  await run("node", ["e2e/ui-smoke.mjs"], {
    label: "ui smoke",
    env: { E2E_BASE_URL: base, E2E_SSO_TOKEN: sso.mintToken("e2e@app.local", "E2E") },
  });
} catch (error) {
  failed = true;
  console.error("E2E FAIL:", error.message);
} finally {
  await server.stop();
  sso.close();
}
process.exit(failed ? 1 : 0);
```

A suite that writes data:

```js
import { assert, assertLocalOnly, expectStatus, finish, request, test } from "@huyab/e2e";

assertLocalOnly(); // throws unless E2E_BASE_URL is 127.0.0.1/localhost
await test("health", async () => expectStatus(await request("/api/version"), 200));
finish();
```

| Export | |
| --- | --- |
| `startServer({ command, args, readyUrl, env?, timeoutMs? })` | Spawns detached (own process group), resolves once `readyUrl` answers 2xx, rejects if the process exits first. `stop()` sends SIGTERM to the group, SIGKILL after 5 s; Ctrl-C kills the group and exits 130. |
| `run(command, args, { label?, env? })` | Runs to completion; rejects on non-zero exit. |
| `freePort()` | A free TCP port on 127.0.0.1, as a string. |
| `findChromium()` | `PLAYWRIGHT_CHROMIUM_PATH`, then Playwright browser folders, then system Chrome/Chromium, else `undefined`. |
| `BASE`, `test`, `assert`, `request`, `expectStatus`, `finish` | Fetch harness; `BASE` is `E2E_BASE_URL` (default `http://127.0.0.1:8787`). |
| `expectDeployed(baseUrl = BASE)` | The deploy check every app must pass: `GET /api/version` is 200 with a non-empty `commit`, `GET /api/health` is 200 with `ok: true`. Returns `{ commit }`. GET only, safe against production. |
| `assertLocalOnly(baseUrl = BASE)` | Throws unless the host is `127.0.0.1` or `localhost`. |
| `startSsoMock()` | Fake issuer on a free port: `{ issuer, mintToken(email, name?), close() }`. |

## `@huyab/cron`

One hub Worker has the only cron trigger (`* * * * *`). Every spoke Worker keeps its
own schedule next to its code and gets a tick through a service binding.

```sh
pnpm add "github:nguyenhuy158/kit#v0.3.0&path:packages/cron"
```

Spoke (`wrangler.jsonc` has no `triggers`; secret `HUB_KEY` is the same on the hub):

```ts
import { handleTick, TICK_PATH, type TickJob } from "@huyab/cron";

const jobs: TickJob<Env>[] = [
  { name: "scan", schedule: "*/15 * * * *", run: async (env) => { /* ... */ } },
];

// in fetch(): route the tick, everything else is your app
if (url.pathname === TICK_PATH) {
  return handleTick(request, env, { jobs, key: env.HUB_KEY, dedupe: env.CRON_KV });
}
```

Hub (`scheduled` handler, one service binding per spoke):

```ts
import { dispatchTick } from "@huyab/cron";

await dispatchTick(
  [{ name: "badminton", fetcher: env.BADMINTON }],
  { key: env.HUB_KEY, scheduledTime: event.scheduledTime },
);
```

| Export | What it does |
| --- | --- |
| `handleTick(request, env, { jobs, key, timeZone?, dedupe? })` | `POST /__cron/tick` only. `401` on a wrong bearer, `400` on a bad body. Runs jobs whose schedule matches the tick minute, reports `{ ran, skipped, failed }`, answers `500` if a job threw. `dedupe` is a KV-like store that stops the same job running twice in one minute. |
| `dispatchTick(spokes, { key, scheduledTime, timeoutMs? })` | Sends the tick to every spoke in parallel and returns one `{ spoke, ok, status, ran, error }` each. A slow or dead spoke never blocks the others. |
| `isDue(expression, date, timeZone?)` | Standard 5-field cron (`*`, lists, ranges, steps). Default zone `Asia/Ho_Chi_Minh`. Day of month and day of week are OR-ed when both are set. |

Jobs must be safe to run twice. Free plan: a hub can tick about 49 spokes per run (50 subrequests).

## Reusable CI

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  check:
    uses: nguyenhuy158/kit/.github/workflows/check.yml@v0.1.0
    with:
      run-test: true   # pnpm test
      run-build: true  # pnpm build
      run-e2e: true    # pnpm e2e, Chromium installed when playwright-core is a dependency
```

Always runs `pnpm install --frozen-lockfile` and `pnpm check` on the Node
version in the caller's `.nvmrc`. Every input defaults to `false`.

## Releasing

Consumers pin a tag, so `main` can move freely. After `pnpm check && pnpm test`
pass, bump `version` in the changed packages, tag `vX.Y.Z` on `main`, push the
tag, then bump the `#vX.Y.Z` in consumers.
