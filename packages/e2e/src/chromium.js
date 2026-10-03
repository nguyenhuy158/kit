// Finds a Chromium for playwright-core: env var first, then browser folders
// installed by `playwright install` (CI image / dev container), then a system
// Chrome/Chromium (dev laptop); otherwise let playwright-core decide.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BROWSER_ROOTS = [
  process.env.PLAYWRIGHT_BROWSERS_PATH,
  "/opt/pw-browsers",
  join(homedir(), ".cache", "ms-playwright"),
].filter(Boolean);

const BINARY_SUBPATHS = [
  "chrome-linux64/chrome",
  "chrome-linux/chrome",
  "chrome-linux/headless_shell",
  "chrome",
  "headless_shell",
];

const SYSTEM_BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
];

/**
 * Path of a usable Chromium, or `undefined` to let playwright-core pick.
 * `PLAYWRIGHT_CHROMIUM_PATH` always wins.
 *
 * @returns {string | undefined}
 */
export function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH)
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  for (const root of BROWSER_ROOTS) {
    if (!root || !existsSync(root)) continue;
    const entries = readdirSync(root).filter((name) =>
      name.startsWith("chromium"),
    );
    // Full builds (chromium-*) before headless_shell, for the complete feature set.
    entries.sort(
      (a, b) =>
        Number(b.startsWith("chromium-")) - Number(a.startsWith("chromium-")),
    );
    for (const entry of entries) {
      for (const subpath of BINARY_SUBPATHS) {
        const candidate = join(root, entry, subpath);
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  return SYSTEM_BROWSERS.find((candidate) => existsSync(candidate));
}
