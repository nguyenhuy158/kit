// Fake SSO issuer for local E2E: a throwaway RSA key, its JWKS served at
// /.well-known/jwks.json, and `huyab_sso` tokens signed like auth.huyab.click.
// Start the app with SSO_ISSUER pointing here (`wrangler dev --var
// SSO_ISSUER:<issuer>`) and it verifies signature/iss/exp exactly as in prod.
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer } from "node:http";

const KID = "e2e";
const TOKEN_TTL_SECONDS = 3600;
const JWKS_PATH = "/.well-known/jwks.json";

/**
 * @typedef {object} SsoMock
 * @property {string} issuer Origin to pass as SSO_ISSUER, e.g. http://127.0.0.1:53124.
 * @property {(email: string, name?: string) => string} mintToken Signed token valid for one hour.
 * @property {() => void} close
 */

/**
 * Starts the fake issuer on a free port of 127.0.0.1.
 *
 * @returns {Promise<SsoMock>}
 */
export async function startSsoMock() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwks = JSON.stringify({
    keys: [
      {
        ...publicKey.export({ format: "jwk" }),
        kid: KID,
        alg: "RS256",
        use: "sig",
      },
    ],
  });

  const server = createServer((request, response) => {
    if (request.url === JWKS_PATH) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(jwks);
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(undefined)),
  );
  const address = server.address();
  const issuer = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

  /** @type {SsoMock["mintToken"]} */
  const mintToken = (email, name) => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT", kid: KID }),
    ).toString("base64url");
    const claims = Buffer.from(
      JSON.stringify({
        iss: issuer,
        sub: randomUUID(),
        email,
        name,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS,
      }),
    ).toString("base64url");
    const signature = sign(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      privateKey,
    ).toString("base64url");
    return `${header}.${claims}.${signature}`;
  };

  return { issuer, mintToken, close: () => server.close() };
}
