// Tiny assertion harness for smoke suites: plain fetch against the target, no
// browser. E2E_BASE_URL picks the target (default: a local `wrangler dev`).

/** Target of the suite, without a trailing slash. */
export const BASE = (
  process.env.E2E_BASE_URL || "http://127.0.0.1:8787"
).replace(/\/$/, "");

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

let passed = 0;
let failed = 0;

/**
 * Runs one named check; a failure is reported and counted, not thrown.
 *
 * @param {string} name
 * @param {() => unknown | Promise<unknown>} fn
 */
export async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(
      `FAIL ${name}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

/**
 * @param {unknown} condition
 * @param {string} message
 * @returns {asserts condition}
 */
export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Fetches a path on the target without following redirects, so they can be asserted.
 *
 * @param {string} path
 * @param {RequestInit} [init]
 */
export function request(path, init = {}) {
  return fetch(BASE + path, { redirect: "manual", ...init });
}

/**
 * @param {Response} response
 * @param {number} status
 */
export function expectStatus(response, status) {
  assert(
    response.status === status,
    `${response.url}: expected ${status}, got ${response.status}`,
  );
}

/** Prints the tally and exits non-zero when any check failed. */
export function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

/**
 * Guard for suites that write data: throws unless `baseUrl` points at
 * 127.0.0.1 or localhost, so a write suite can never run against production.
 *
 * @param {string} [baseUrl]
 */
export function assertLocalOnly(baseUrl = BASE) {
  let hostname = "";
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    // Not a URL: treated as non-local below.
  }
  if (!LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `refusing to run a suite that writes data against "${baseUrl}"; use a local server`,
    );
  }
}
