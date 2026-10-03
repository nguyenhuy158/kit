/**
 * Verifies the domain-wide `huyab_sso` session issued by auth.huyab.click.
 *
 * Tokens are RS256 JWTs. Relying apps only ever hold the issuer's public key
 * (fetched from its JWKS), so no app can mint a session another app accepts.
 * Plain Web Crypto, no dependency: runs on Workers, Node >= 22 and browsers.
 */

/** Cookie set by the SSO issuer on the parent domain; every app reads this name. */
export const SSO_COOKIE = "huyab_sso";

/** Production issuer; apps override it through their `SSO_ISSUER` variable. */
export const DEFAULT_SSO_ISSUER = "https://auth.huyab.click";

const JWKS_PATH = "/.well-known/jwks.json";
const SIGNING_ALGORITHM = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
} as const;

export type SsoClaims = {
  iss: string;
  sub: string;
  aud?: string;
  email: string;
  name?: string;
  picture?: string;
  iat?: number;
  exp: number;
};

export type VerifyOptions = {
  /** When set, the token's `aud` claim must equal it (the issuer sets `huyab.click`). */
  audience?: string;
};

/** Imported keys are cached per isolate; fetching the JWKS on every request adds a round trip. */
const keyCache = new Map<string, Promise<CryptoKey>>();

function publicKey(issuer: string, kid: string): Promise<CryptoKey> {
  const cacheKey = `${issuer}#${kid}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    const response = await fetch(`${issuer}${JWKS_PATH}`);
    if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`);

    const { keys } = (await response.json()) as {
      keys?: Array<JsonWebKey & { kid?: string }>;
    };
    const jwk = keys?.find((key) => key.kid === kid) ?? keys?.[0];
    if (!jwk) throw new Error("JWKS has no usable key");

    return crypto.subtle.importKey(
      "jwk",
      { ...jwk, ext: true },
      SIGNING_ALGORITHM,
      false,
      ["verify"],
    );
  })();

  keyCache.set(cacheKey, pending);
  // A failed fetch must not poison the cache for the rest of the isolate's life.
  pending.catch(() => keyCache.delete(cacheKey));
  return pending;
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const BEARER_PATTERN = /^Bearer\s+(.+)$/i;
const SSO_COOKIE_PATTERN = new RegExp(`(?:^|;\\s*)${SSO_COOKIE}=([^;]+)`);

/**
 * Returns the claims when the token is valid, `null` for every other case
 * (malformed, wrong algorithm, bad signature, wrong issuer or audience,
 * expired, JWKS unreachable). Never throws: callers treat `null` as "not
 * signed in", there is no partial-trust result.
 */
export async function verifySsoToken(
  token: string,
  issuer: string,
  options: VerifyOptions = {},
): Promise<SsoClaims | null> {
  const [header, payload, signature, ...rest] = token.split(".");
  if (!header || !payload || !signature || rest.length > 0) return null;

  try {
    const { alg, kid } = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(header)),
    ) as {
      alg?: string;
      kid?: string;
    };
    if (alg !== "RS256") return null;

    const valid = await crypto.subtle.verify(
      SIGNING_ALGORITHM.name,
      await publicKey(issuer, kid ?? ""),
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    if (!valid) return null;

    const claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    ) as SsoClaims;
    if (claims.iss !== issuer) return null;
    if (options.audience !== undefined && claims.aud !== options.audience)
      return null;
    if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!claims.sub || !claims.email) return null;

    return claims;
  } catch {
    return null;
  }
}

/**
 * Same JWT, two ways in: browsers send the domain-wide cookie, native apps
 * (no shared cookie jar) send `Authorization: Bearer`. The cookie wins because
 * browsers are most of the traffic. Reading is not trusting: the token still
 * has to pass `verifySsoToken`.
 */
export function readSsoToken(headers: Headers): string | null {
  const cookie = headers.get("Cookie")?.match(SSO_COOKIE_PATTERN)?.[1];
  if (cookie) return cookie;
  return (
    headers.get("Authorization")?.match(BEARER_PATTERN)?.[1]?.trim() || null
  );
}

/** Claims of the signed-in caller of `request`, or `null`. */
export async function getClaimsFromRequest(
  request: Request,
  issuer: string,
  options: VerifyOptions = {},
): Promise<SsoClaims | null> {
  const token = readSsoToken(request.headers);
  return token ? verifySsoToken(token, issuer, options) : null;
}

/** Issuer URL that signs the visitor in or out, then sends them back to `redirectTo`. */
export function ssoUrl(
  issuer: string,
  path: "/login" | "/logout",
  redirectTo: string,
): string {
  const target = new URL(`${issuer}${path}`);
  target.searchParams.set("redirect_uri", redirectTo);
  return target.toString();
}
