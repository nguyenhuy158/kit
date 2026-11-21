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
7. Publish with a tag from CI or by hand, never from an unreviewed branch. Check with
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

## Package

- [ ] Plain Node ESM, Node 22 or newer, no build step, no dependencies.
- [ ] `README.md` shows the install command, `up`, and the Node version.
- [ ] The install works with `npm i -g <app>` and with `mise use -g npm:<app>`
      (mise hides a release for its first 24 hours: pin it with `<app>@<version>`).

## Tests

- [ ] An e2e step runs the real binary with a temporary config path: `up`, one read,
      one write, check the output, `down`, and a call after `down` must fail.
- [ ] The e2e step checks the English text (not the app UI text).
