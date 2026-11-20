# RBAC checklist

Rule: `docs/AGENTS-SKELETON.md`, "Access control rule". Use this list in a pull
request that adds or changes a route, a table, a role or a token. Tick each line or
write why it does not apply.

## New route

- [ ] It needs sign-in (`requireUser()` or the app's check). If it is public, the pull
      request says why.
- [ ] The role that may call it is named: owner, collaborator, admin or token scope.
- [ ] The check is in a policy or use-case function, not in the route and not in the UI.
- [ ] Rows are loaded by id and owner together.
- [ ] A row that is not the user's gives `404`. `403` is used only when the user can
      see the resource.
- [ ] Input ids are validated before they reach the database.
- [ ] The response has no secret, token or password hash.

## New table or resource

- [ ] It has an owner column (`user_id` or `user_email`) and the owner is set on the
      server, never taken from the request body.
- [ ] Every list, search, export and "on this day" query filters by owner (and by
      `deleted_at IS NULL` when the table uses soft delete).
- [ ] Sharing, if any, is a separate table (collaborators or a link token), not a
      flag that skips the owner filter.

## New role or scope

- [ ] The role is stored in the app's data, not read from the SSO token.
- [ ] The policy function has one case for the role, and a test for it.
- [ ] A token scope is added in both places that must match (the scope list and the
      tool or route that checks it).
- [ ] The admin is set by an environment variable, not by a hard-coded email.

## Tokens and machine access

- [ ] The token is random, stored as a hash, shown once and can be revoked.
- [ ] It has the smallest scope that works.
- [ ] A service call uses a service binding plus a secret header, not a public URL.
- [ ] A public share link has a random token, a rate limit and an off switch.

## Tests

- [ ] Owner is allowed.
- [ ] Another signed-in user gets `404`.
- [ ] A collaborator cannot do an owner-only action.
- [ ] No sign-in gets `401`.
- [ ] A read-only smoke test (`e2e:prod`) stays GET-only and signed out.

## UI (ui-kit apps)

- [ ] The UI hides or disables an action the user may not do, as a hint only. The
      server still refuses it.
- [ ] A disabled control says why (text or tooltip), not just a grey style.
