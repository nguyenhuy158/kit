import type { MiddlewareHandler } from "hono";
import {
  DEFAULT_SSO_ISSUER,
  getClaimsFromRequest,
  type SsoClaims,
  type VerifyOptions,
} from "./index";

/** Context variables set by `requireUser`; merge into the app's `Variables`. */
export type SsoVariables = { user: SsoClaims };

export type RequireUserOptions = VerifyOptions & {
  /** Fixed issuer. Default: the `SSO_ISSUER` binding, else `DEFAULT_SSO_ISSUER`. */
  issuer?: string;
};

const HTTP_UNAUTHORIZED = 401;

/**
 * Rejects the request with `401 {"error":"unauthorized"}` unless it carries a
 * valid SSO token (cookie or Bearer); otherwise exposes the claims as
 * `c.get("user")` to the handlers after it.
 */
export function requireUser(
  options: RequireUserOptions = {},
): MiddlewareHandler<{ Variables: SsoVariables }> {
  const { issuer, ...verifyOptions } = options;
  return async (c, next) => {
    const bindings = c.env as { SSO_ISSUER?: string } | undefined;
    const claims = await getClaimsFromRequest(
      c.req.raw,
      issuer ?? (bindings?.SSO_ISSUER || DEFAULT_SSO_ISSUER),
      verifyOptions,
    );
    if (!claims) return c.json({ error: "unauthorized" }, HTTP_UNAUTHORIZED);
    c.set("user", claims);
    await next();
  };
}
