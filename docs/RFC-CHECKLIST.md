# RFC checklist

Rule: `docs/AGENTS-SKELETON.md`, "Standards rule". Use this list in a pull request
that adds or changes an API, sign-in, a token or a cookie. Tick each line or write why
it does not apply. Device sign-in has its own list in `docs/CLI-CHECKLIST.md`
(RFC 8628).

Links use `https://datatracker.ietf.org/doc/html/rfc<number>`.

## OAuth and tokens

- RFC 6749 (OAuth 2.0), RFC 9700 (security best practice, BCP 240)
  - [ ] Use the authorization code flow with PKCE. No implicit flow and no password grant.
  - [ ] Redirect URIs are compared exactly. No wildcards.
  - [ ] Tokens are short lived. Refresh tokens are rotated.
- RFC 7636 (PKCE)
  - [ ] Every SPA and native app sends `code_challenge` with method `S256`, never `plain`.
- RFC 6750 (Bearer token)
  - [ ] The token goes in `Authorization: Bearer <token>`. Never in a URL or a query string.
  - [ ] Missing or bad token: `401` with a `WWW-Authenticate: Bearer` header.
  - [ ] Too few scopes: `403` with `error="insufficient_scope"`.
- RFC 7009 (revocation)
  - [ ] The user can revoke a token. The server stores only a hash.
  - [ ] A revoked token fails on the next call.
- RFC 7662 (introspection)
  - [ ] A service that only holds an opaque token asks the issuer. It never guesses.
- RFC 9068 (JWT access token)
  - [ ] Check `iss`, `aud`, `exp` and the signature on every call.

## JWT and keys

- RFC 7519 (JWT), RFC 8725 (JWT best practice)
  - [ ] The verifier fixes the allowed algorithm (`RS256`). It never trusts the `alg`
        in the token and never accepts `none`.
  - [ ] Check `exp`, `nbf`, `iss` and `aud`. Allow a small clock skew only.
- RFC 7515 (JWS), RFC 7517 (JWK), RFC 7518 (algorithms)
  - [ ] Keys come from the issuer JWKS. Cache them and refetch on an unknown `kid`.
  - [ ] Key rotation does not break sign-in. Old and new keys are both listed for a while.

## HTTP and API

- RFC 9110 (HTTP semantics)
  - [ ] `GET` is safe and never writes. `PUT` and `DELETE` are idempotent.
  - [ ] Use the right status: `201` created, `204` no body, `400` bad input,
        `401` not signed in, `404` not found, `409` conflict, `422` valid shape but
        bad value.
- RFC 9111 (caching)
  - [ ] Private data sends `Cache-Control: private, no-store`. Public data sets a `max-age`.
  - [ ] A response that changes with a header sends `Vary` for it.
- RFC 9457 (problem details)
  - [ ] Every `/api/*` error is `application/problem+json` with `type`, `title`,
        `status` and `detail`. Add `errors` for field errors.
  - [ ] `detail` never has a secret, a stack trace or SQL.
- RFC 6585 (`429`)
  - [ ] A rate limit answers `429` with `Retry-After` in seconds.
- RFC 8288 (`Link` header)
  - [ ] A paged list sends `Link` with `rel="next"` and `rel="prev"`.
- RFC 6797 (HSTS)
  - [ ] Every site sends `Strict-Transport-Security` (`max-age` of one year or more).
- RFC 6265 (cookies)
  - [ ] A session cookie is `HttpOnly; Secure; SameSite=Lax` (or `Strict`).
  - [ ] Set `Domain` only when sub-domains must share it (`.huyab.cfd` for SSO).
- RFC 6454 (origin) and CORS
  - [ ] CORS lists exact origins. With `credentials: true` never use `*`.

## Data formats

- RFC 3986 (URI)
  - [ ] Encode every user value that goes into a URL. Build URLs with `URL`, not strings.
- RFC 8259 (JSON)
  - [ ] Send `Content-Type: application/json` as UTF-8. No comments, no trailing commas.
  - [ ] Big ids are strings. Dates are RFC 3339 (`2026-11-21T10:00:00Z`).
- RFC 4122 and RFC 9562 (UUID)
  - [ ] Ids are UUIDs. Validate them at the edge and return `400` for a bad one.
  - [ ] Prefer UUIDv7 for new sortable ids. Never put a secret in an id.
- RFC 5321 and RFC 5322 (email)
  - [ ] Compare emails in lower case. Validate with a simple check, then send a mail to prove it.

## MCP and discovery

- RFC 9728 (protected resource metadata)
  - [ ] An API that takes OAuth tokens (for example an MCP server) serves
        `/.well-known/oauth-protected-resource` with its `authorization_servers`.
  - [ ] A `401` points to it with `resource_metadata` in `WWW-Authenticate`.
- RFC 8414 (authorization server metadata)
  - [ ] The issuer serves `/.well-known/oauth-authorization-server` with its endpoints,
        `jwks_uri` and supported grants.

## Frontend

- RFC 5646 (BCP 47 language tags)
  - [ ] `<html lang>` matches the UI language (`vi`, `en`). Set it again when the user changes language.
  - [ ] Use `Intl` with the same tag for dates, numbers and money. Mark a block in another language with its own `lang`.
- RFC 4648 (Base64)
  - [ ] Use base64url (no `+`, `/` or `=`) for PKCE, JWT parts and anything in a URL.
  - [ ] Plain base64 is only for bodies and `data:` URIs.
- RFC 2397 (`data:` URI)
  - [ ] Use `data:` only for small images (thumbnails, previews). Big files go by URL.
  - [ ] Never put a user-given `data:` URL in `href` or `src` without checking the media type.
- RFC 3339 (date and time)
  - [ ] API times are RFC 3339 in UTC (`2026-11-21T10:00:00Z`). The UI converts to local time.
  - [ ] A date with no time stays `"YYYY-MM-DD"` (ui-kit `DatePicker`). Never build it from a `Date` in local time.
- RFC 7396 (JSON Merge Patch), RFC 6902 (JSON Patch)
  - [ ] A partial update sends only the changed fields. An absent field means "no change".
  - [ ] Clear a field with an explicit `null`, not by leaving it out.
- RFC 5861 (`stale-while-revalidate`), RFC 8246 (`immutable`)
  - [ ] Files with a hash in the name send `Cache-Control: public, max-age=31536000, immutable`.
  - [ ] `index.html` and API reads use `no-cache` or `stale-while-revalidate`, never a long `max-age`.
  - [ ] A client cache (ui-kit `useCachedFetch`) revalidates when stale and does not poll.
- RFC 8288 (`Link` header)
  - [ ] Preload the main font and the main script with `Link: <...>; rel=preload`.
  - [ ] A paged list follows `rel="next"` from the server, not a built URL.
- RFC 6455 (WebSocket)
  - [ ] Use `wss://` only. Check the `Origin` on the server and sign in before the upgrade.
  - [ ] Reconnect with a growing delay and a limit. Close the socket when the page hides.
- RFC 9116 (`security.txt`)
  - [ ] Every public site serves `/.well-known/security.txt` with `Contact` and `Expires`.

## Web standards that are not RFCs

- CORS (WHATWG Fetch): see HTTP and API above. A browser call with cookies needs the exact origin.
- CSP and SRI (W3C): send a `Content-Security-Policy` without `unsafe-inline` where the app allows.
  Add `integrity` to every script or style loaded from a CDN.
- WCAG 2.2 AA (W3C): ui-kit runs axe-core in `e2e/a11y.mjs`. Apps run the same check on their screens.
- WHATWG HTML and URL: build URLs with `URL` and `URLSearchParams`, never with string joins.
