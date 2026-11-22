# CLI checklist

Rule: `docs/AGENTS-SKELETON.md`, "CLI rule". Reference: `chia-keo` `cli/`. Use this
list in a pull request that adds or changes a command line. Tick each line or write
why it does not apply.

## Create a new CLI

1. Make a `cli/` folder in the app repo with `<app>.mjs`, `package.json` and
   `README.md`.
2. Put `#!/usr/bin/env node` on the first line and `chmod +x` the file.
3. In `package.json`: `"type": "module"`, `"bin": { "<app>": "<app>.mjs" }`,
   `"files"` with the script and README, `"engines": { "node": ">=22" }`, and
   `repository.directory` set to `cli`.
4. Add a root script (`"cli": "node cli/<app>.mjs"`) so people can run it from the repo.
5. Add the sign-in routes to the app (device code: start, poll, approve page).
6. Add the e2e check and a short section in the app `AGENTS.md`.
7. Publish from CI, never by hand: copy `.github/workflows/publish-cli.yml` from
   `chia-keo`. It runs when `cli/package.json` changes on `main`, skips a version that
   is already on npm (`npm view <app>@<version>`), and runs `npm publish` with the repo
   secret `NPM_TOKEN`. To release: bump `version` and merge the PR. Check with
   `npm view <app> version`.

## Text

- [ ] All text is simple English (CEFR A2): help, prompts, errors, success lines.
- [ ] Each message is one short line. Errors say what to do next
      (for example `You are not signed in. Run: chiakeo up`).
- [ ] No Vietnamese or other language in the CLI, even if the app UI has it.
      Names and data from the app are printed as they are.
- [ ] No comment that only repeats the code. No magic string or number: name them.

## Behavior

- [ ] No argument (or an unknown command) prints the help and exits with `0`.
- [ ] Missing or bad arguments, and API errors, print one line and exit with `1`.
- [ ] The help lists every command, every flag and the env variables.
- [ ] A write command prints what it did (`Created game ...`). A read command prints
      only data.
- [ ] Amounts, dates and ids are validated before the request.

## Sign-in and secrets

- [ ] Sign-in is a device code: `up` prints a link and a code, the user approves on
      the web. The CLI never asks for a password.
- [ ] `down` deletes the local token and says how to revoke it on the server.
- [ ] The token file is `~/.config/<app>/config.json` with mode 600 (`chmod` after
      writing). `<APP>_CONFIG` can change the path.
- [ ] The server stores only a hash of the token and the user can revoke it.
- [ ] The token is never printed, logged or put in an error message.

## Device sign-in (RFC 8628)

Standard: [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628). Use it for
every CLI, native app or device that cannot show a web sign-in page.

Server (routes live under `/api/*`):

- [ ] `POST /api/login/device/code` returns `device_code`, `user_code`,
      `verification_uri`, `expires_in` and `interval`. It accepts JSON and
      form-urlencoded.
- [ ] `POST /api/login/oauth/access_token` accepts
      `grant_type=urn:ietf:params:oauth:grant-type:device_code` and `device_code`.
- [ ] Poll errors use HTTP 400 with `error`: `authorization_pending`, `slow_down`,
      `expired_token`, `access_denied`. A wrong `grant_type` or an unknown
      `device_code` is an error too, never a token.
- [ ] `device_code` is long and random. The server stores only its SHA-256.
- [ ] `user_code` is short, easy to type (no `0/O`, `1/I`), shown in groups
      (`ABCD-EFGH`) and compared without case or dash.
- [ ] Codes live 10 minutes at most. `interval` is 5 seconds. Polling faster gets
      `slow_down` and the CLI adds 5 seconds.
- [ ] Wrong `user_code` tries are rate limited, so nobody can guess a code.
- [ ] The approve page (`/login/device`) needs a real web session. It shows which
      app and device ask for access, and asks to approve or deny.
- [ ] The server creates the token when the user approves. The CLI gets it once,
      then the row is deleted.
- [ ] The device token cannot create other tokens (no `/api/mcp-tokens`).
- [ ] The approve page is a root route, not inside the app layout, and uses only
      ui-kit parts.

CLI:

- [ ] `up` prints the link and the code, then polls. It stops on `expired_token`
      or `access_denied` with one line and exit code `1`.
- [ ] The poll waits `interval` seconds and obeys `slow_down`.
- [ ] The CLI sends a device name so the user sees it on the approve page.

## Package

- [ ] Plain Node ESM, Node 22 or newer, no build step, no dependencies.
- [ ] `README.md` shows the install command, `up`, and the Node version.
- [ ] The release is a version bump merged to `main`. CI publishes it (`NPM_TOKEN` secret
      set on the repo); nobody runs `npm publish` by hand.
- [ ] A PR that adds a feature to the app adds its CLI command in the same PR, or says why
      not (for example photo upload needs image resizing).
- [ ] The install works with `npm i -g <app>` and with `mise use -g npm:<app>`
      (mise hides a release for its first 24 hours: pin it with `<app>@<version>`).

## Tests

- [ ] An e2e step runs the real binary with a temporary config path: `up`, one read,
      one write, check the output, `down`, and a call after `down` must fail.
- [ ] The e2e step checks the English text (not the app UI text).
