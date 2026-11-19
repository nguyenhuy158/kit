# Adopting kit

What every app repo does to follow kit, and which apps do it today. The UI side
(tokens, components, one-screen) is in
[ui-kit `docs/ADOPTION.md`](https://github.com/nguyenhuy158/ui-kit/blob/main/docs/ADOPTION.md).

## Checklist

Pin every item to the latest kit tag. Install commands are in the
[README](../README.md).

1. **CI.** `.github/workflows/ci.yml` calls
   `nguyenhuy158/kit/.github/workflows/check.yml@<tag>` with the `run-*` inputs
   the repo has scripts for. Deploy stays in Cloudflare Workers Builds
   ([delivery rule](AGENTS-SKELETON.md#delivery-rule)).
2. **`@huyab/config`.** `biome.json` extends `@huyab/config/biome.json`,
   `tsconfig.json` extends `@huyab/config/tsconfig.base.json`. This also bans
   native `alert`/`confirm`/`prompt`.
3. **`@huyab/sso`.** Apps behind SSO verify the cookie with `requireUser()` or
   `getClaimsFromRequest()`, not a copied verifier
   ([ECOSYSTEM 4.1](ECOSYSTEM.md#41-huyab_sso-cookie--jwt)). `sso` itself and
   apps with no login skip it.
4. **`@huyab/e2e`.** `e2e/run.mjs` uses `startServer`, `startSsoMock` and the
   harness; writing suites call `assertLocalOnly`
   ([ECOSYSTEM 4.4](ECOSYSTEM.md#44-e2e-production-is-read-only)).
5. **Ignore files.** Root `.gitignore` and `.dockerignore`
   ([ignore files rule](AGENTS-SKELETON.md#ignore-files-rule)).
6. **AGENTS.md.** Follows the [skeleton](AGENTS-SKELETON.md): has
   `## Ecosystem`, `## Agent-Specific Instructions` and the gitleaks rule.
7. **Cache.** Server reads of D1, Turso or external APIs go through
   `@huyab/cache` `readThrough`
   ([ECOSYSTEM 4.6](ECOSYSTEM.md#46-reads-go-through-a-cache-not-straight-to-the-database)).
   Not in the table: only a code review can tell.

## Status

`✅` on the latest tag or done, `⚠️` on an older tag, `❌` missing, `—` does
not apply. Read from each repo's default branch. Refresh after an app changes:

```sh
node scripts/adoption.mjs kit docs/ADOPTION.md
node scripts/adoption.mjs ui ../ui-kit/docs/ADOPTION.md
```

Add a new app to `APPS` in `scripts/adoption.mjs`.

<!-- adoption:kit:start -->
Generated 2026-11-19 by `kit/scripts/adoption.mjs kit`.

Latest kit tag: `v0.5.0`.

| Repo | CI check.yml | @huyab/config | @huyab/sso | @huyab/e2e | Ignore files | AGENTS skeleton | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sso | ⚠️ v0.1.0 | ⚠️ v0.2.0 | — | ⚠️ v0.2.0 | ❌ | ❌ | issuer, signs its own tokens |
| mailer | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ |  |
| chiakeo | ⚠️ v0.1.1 | ⚠️ v0.2.0 | ❌ | ⚠️ v0.2.0 | ❌ | ✅ |  |
| notes | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ |  |
| monitor | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ |  |
| share | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ |  |
| stitch-learn-ai | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ | ai-english web |
| webhook-tester | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ | hooks |
| games | ⚠️ v0.1.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ |  |
| huyabhome | ⚠️ v0.1.0 | ⚠️ v0.2.0 | — | ⚠️ v0.2.0 | ❌ | ✅ |  |
| home | ⚠️ v0.2.1 | ⚠️ v0.1.0 | ❌ | ❌ | ❌ | ❌ |  |
| zalo | ❌ | ⚠️ v0.1.0 | ❌ | ❌ | ❌ | ❌ |  |
| badminton | ❌ | ⚠️ v0.2.0 | ⚠️ v0.2.0 | ❌ | ❌ | ❌ |  |
| digest-vote | ⚠️ v0.2.1 | ⚠️ v0.2.0 | — | ❌ | ❌ | ❌ |  |
| resume | ⚠️ v0.1.0 | ❌ | — | ⚠️ v0.2.0 | ❌ | ❌ |  |
| runlater | ⚠️ v0.2.1 | ⚠️ v0.1.0 | — | ⚠️ v0.1.0 | ❌ | ❌ |  |
| ai-english-expo | ⚠️ v0.1.0 | ⚠️ v0.2.0 | — | ❌ | ❌ | ❌ | Expo, no web UI |
| xo-expo | ⚠️ v0.1.0 | ⚠️ v0.2.0 | — | ❌ | ❌ | ❌ | Expo, no web UI |
| ui-kit | ⚠️ v0.4.0 | ⚠️ v0.4.0 | — | ⚠️ v0.4.0 | ✅ | ✅ | the kit itself |
<!-- adoption:kit:end -->
