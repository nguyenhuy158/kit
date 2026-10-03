import { generateKeyPairSync, type KeyObject, sign } from "node:crypto";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireUser, type SsoVariables } from "./hono";
import { readSsoToken, SSO_COOKIE, verifySsoToken } from "./index";

const KID = "test-key";
const HOUR_SECONDS = 3600;

const issuerKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const strangerKey = generateKeyPairSync("rsa", { modulusLength: 2048 });

function mint(
  claims: Record<string, unknown>,
  privateKey: KeyObject = issuerKey.privateKey,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: KID }),
  ).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(
    "sha256",
    Buffer.from(`${header}.${payload}`),
    privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Each test gets its own issuer so the per-issuer key cache never leaks between tests. */
let issuer: string;
let jwksAvailable: boolean;
let issuerCount = 0;

function claimsFor(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: issuer,
    sub: "42",
    aud: "huyab.click",
    email: "user@example.com",
    name: "User",
    iat: now,
    exp: now + HOUR_SECONDS,
    ...overrides,
  };
}

beforeEach(() => {
  issuerCount += 1;
  issuer = `https://issuer-${issuerCount}.test`;
  jwksAvailable = true;
  const jwk = {
    ...issuerKey.publicKey.export({ format: "jwk" }),
    kid: KID,
    alg: "RS256",
    use: "sig",
  };
  vi.stubGlobal("fetch", async (url: string) =>
    jwksAvailable && url === `${issuer}/.well-known/jwks.json`
      ? Response.json({ keys: [jwk] })
      : new Response("unavailable", { status: 503 }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("verifySsoToken", () => {
  it("returns the claims of a token signed by the issuer's JWKS key", async () => {
    const claims = claimsFor();
    expect(await verifySsoToken(mint(claims), issuer)).toEqual(claims);
  });

  it("rejects an expired token", async () => {
    const token = mint(claimsFor({ exp: Math.floor(Date.now() / 1000) - 1 }));
    expect(await verifySsoToken(token, issuer)).toBeNull();
  });

  it("rejects a token whose iss is not the expected issuer", async () => {
    const token = mint(claimsFor({ iss: "https://evil.test" }));
    expect(await verifySsoToken(token, issuer)).toBeNull();
  });

  it("rejects a token signed by a key outside the JWKS", async () => {
    expect(
      await verifySsoToken(mint(claimsFor(), strangerKey.privateKey), issuer),
    ).toBeNull();
  });

  it("enforces the audience only when one is requested", async () => {
    const token = mint(claimsFor({ aud: "other.app" }));
    expect(
      await verifySsoToken(token, issuer, { audience: "huyab.click" }),
    ).toBeNull();
    expect(await verifySsoToken(token, issuer)).not.toBeNull();
  });

  it("recovers once the JWKS comes back instead of caching the outage", async () => {
    const token = mint(claimsFor());
    jwksAvailable = false;
    expect(await verifySsoToken(token, issuer)).toBeNull();
    jwksAvailable = true;
    expect(await verifySsoToken(token, issuer)).not.toBeNull();
  });
});

describe("readSsoToken", () => {
  it("prefers the SSO cookie over a Bearer header", () => {
    const headers = new Headers({
      Cookie: `a=1; ${SSO_COOKIE}=cookie-token`,
      Authorization: "Bearer bearer-token",
    });
    expect(readSsoToken(headers)).toBe("cookie-token");
  });

  it("falls back to Bearer and ignores cookies that merely end with the name", () => {
    const headers = new Headers({
      Cookie: `x${SSO_COOKIE}=spoof`,
      Authorization: "Bearer bearer-token",
    });
    expect(readSsoToken(headers)).toBe("bearer-token");
  });
});

describe("requireUser", () => {
  function app() {
    const hono = new Hono<{
      Bindings: { SSO_ISSUER: string };
      Variables: SsoVariables;
    }>();
    hono.get("/me", requireUser(), (c) =>
      c.json({ email: c.get("user").email }),
    );
    return (headers: Record<string, string>) =>
      hono.request("/me", { headers }, { SSO_ISSUER: issuer });
  }

  it("answers 401 when the request carries no valid token", async () => {
    const response = await app()({
      Authorization: `Bearer ${mint(claimsFor({ iss: "https://evil.test" }))}`,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("verifies against the SSO_ISSUER binding and exposes the claims as user", async () => {
    const response = await app()({
      Cookie: `${SSO_COOKIE}=${mint(claimsFor())}`,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "user@example.com" });
  });
});
