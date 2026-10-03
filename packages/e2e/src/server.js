import { spawn } from "node:child_process";
import { createServer } from "node:net";

const SERVER_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;
const STOP_GRACE_MS = 5000;
const EXIT_CODE_SIGINT = 130;

/**
 * Runs a command to completion with inherited stdio; rejects on a non-zero exit.
 * `env` is merged over `process.env`.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{ label?: string, env?: Record<string, string> }} [options]
 * @returns {Promise<void>}
 */
export function run(command, args, { label = command, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${label} failed (exit ${code})`)),
    );
  });
}

/**
 * A TCP port that is free on 127.0.0.1 right now.
 *
 * @returns {Promise<string>}
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(String(port)));
    });
  });
}

/**
 * @typedef {object} StartServerOptions
 * @property {string} command Executable, e.g. "pnpm".
 * @property {string[]} args e.g. ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", port].
 * @property {string} readyUrl Polled until it answers 2xx.
 * @property {Record<string, string>} [env] Merged over `process.env`.
 * @property {number} [timeoutMs] How long to wait for `readyUrl` (default 120 s).
 */

/**
 * @typedef {object} RunningServer
 * @property {import("node:child_process").ChildProcess} child
 * @property {() => Promise<void>} stop SIGTERM the process group, SIGKILL it after 5 s.
 */

/**
 * Starts a long-running dev server (e.g. `wrangler dev`) and resolves once
 * `readyUrl` answers 2xx.
 *
 * The server gets its own process group (`detached`): `pnpm exec` spawns more
 * node layers, and killing only the parent PID would orphan wrangler/workerd
 * holding the port. `stop()` therefore signals the whole group. Because the
 * group is detached, Ctrl-C no longer reaches it, so a SIGINT handler kills it
 * before exiting with 130.
 *
 * @param {StartServerOptions} options
 * @returns {Promise<RunningServer>}
 */
export async function startServer({
  command,
  args,
  readyUrl,
  env = {},
  timeoutMs = SERVER_TIMEOUT_MS,
}) {
  // CI=1 keeps wrangler (and similar CLIs) non-interactive.
  const child = spawn(command, args, {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CI: "1", ...env },
    detached: true,
  });
  /** @type {Error | undefined} */
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
  });
  const exited = new Promise((resolve) => child.once("exit", resolve));

  /** @param {NodeJS.Signals} signal */
  const signalGroup = (signal) => {
    try {
      if (child.pid !== undefined) process.kill(-child.pid, signal);
    } catch {
      // The group is already gone.
    }
  };

  const onSigint = () => {
    signalGroup("SIGKILL");
    process.exit(EXIT_CODE_SIGINT);
  };
  process.once("SIGINT", onSigint);

  const stop = async () => {
    process.off("SIGINT", onSigint);
    if (child.exitCode === null && child.signalCode === null && !spawnError) {
      signalGroup("SIGTERM");
      /** @type {NodeJS.Timeout | undefined} */
      let timer;
      const stopped = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(false), STOP_GRACE_MS);
        }),
      ]);
      clearTimeout(timer);
      if (!stopped)
        console.error(`${command} did not stop after SIGTERM, sending SIGKILL`);
    }
    // Always finish the group off: the leader can exit before its children are done.
    signalGroup("SIGKILL");
  };

  try {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(
          `${command} exited early (${child.exitCode ?? child.signalCode})`,
        );
      }
      if (Date.now() >= deadline)
        throw new Error(`${readyUrl} not ready after ${timeoutMs}ms`);
      try {
        if ((await fetch(readyUrl)).ok) break;
      } catch {
        // Not listening yet.
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  } catch (error) {
    await stop();
    throw error;
  }

  return { child, stop };
}
