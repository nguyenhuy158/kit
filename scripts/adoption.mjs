import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const OWNER = "nguyenhuy158";
const KIT_REPO = "kit";
const UI_KIT_REPO = "ui-kit";
const UI_KIT_COMPONENT_DIR = "src/ui/";
const UI_KIT_SKIPPED_FILES = new Set(["index.ts"]);
const KIT_CHECK_WORKFLOW =
  /kit\/\.github\/workflows\/check\.yml@(v\d+\.\d+\.\d+)/;
const KIT_PIN = /#(v\d+\.\d+\.\d+)/;
const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const IGNORED_DIR = /(^|\/)(node_modules|vendor|dist)\//;
const AGENTS_FILE = "AGENTS.md";
const AGENTS_SECTIONS = ["## Ecosystem", "## Agent-Specific Instructions"];
const SECRET_SCAN_WORD = "gitleaks";
const ONE_SCREEN_WORD = "assertFitsViewport";
const TOKENS_FILE = "tokens.css";
const SCREEN_FILES = ["Screen.tsx", "PagedList.tsx"];
const POPUP_FILE = "ConfirmProvider.tsx";
const ROOT_IGNORE_FILES = [".gitignore", ".dockerignore"];

export const MARK = { done: "✅", missing: "❌", na: "—", old: "⚠️" };

/** @typedef {{ repo: string, ui: boolean, sso: boolean, note?: string }} App */

/** @type {App[]} */
export const APPS = [
  { repo: "sso", ui: true, sso: false, note: "issuer, signs its own tokens" },
  { repo: "mailer", ui: false, sso: true },
  { repo: "chiakeo", ui: true, sso: true },
  { repo: "notes", ui: true, sso: true },
  { repo: "monitor", ui: true, sso: true },
  { repo: "share", ui: true, sso: true },
  { repo: "stitch-learn-ai", ui: true, sso: true, note: "ai-english web" },
  { repo: "webhook-tester", ui: true, sso: true, note: "hooks" },
  { repo: "games", ui: true, sso: true },
  { repo: "huyabhome", ui: true, sso: false },
  { repo: "home", ui: true, sso: true },
  { repo: "zalo", ui: true, sso: true },
  { repo: "badminton", ui: true, sso: true },
  { repo: "digest-vote", ui: true, sso: false },
  { repo: "resume", ui: true, sso: false },
  { repo: "runlater", ui: false, sso: false },
  { repo: "ai-english-expo", ui: false, sso: false, note: "Expo, no web UI" },
  { repo: "xo-expo", ui: false, sso: false, note: "Expo, no web UI" },
  { repo: "ui-kit", ui: true, sso: false, note: "the kit itself" },
];

/** @param {string[]} args */
function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** @param {string} repo */
function listFiles(repo) {
  const out = gh([
    "api",
    `repos/${OWNER}/${repo}/git/trees/HEAD?recursive=1`,
    "--jq",
    '.tree[] | select(.type == "blob") | .path',
  ]);
  return out.split("\n").filter((path) => path && !IGNORED_DIR.test(path));
}

/** @param {string} repo @param {string} path */
function readFile(repo, path) {
  return gh([
    "api",
    "-H",
    "Accept: application/vnd.github.raw",
    `repos/${OWNER}/${repo}/contents/${path}`,
  ]);
}

function latestTag(/** @type {string} */ repo) {
  return gh(["api", `repos/${OWNER}/${repo}/tags`, "--jq", ".[0].name"]).trim();
}

/** @param {string} version @param {string} latest */
export function versionMark(version, latest) {
  if (!version) return MARK.missing;
  if (version === latest) return `${MARK.done} ${version}`;
  return `${MARK.old} ${version}`;
}

/** @param {Record<string, string>} deps @param {string} name */
export function kitPin(deps, name) {
  const spec = deps[`@huyab/${name}`];
  if (!spec) return "";
  return spec.match(KIT_PIN)?.[1] ?? spec;
}

/** @param {string} text */
export function workflowPin(text) {
  return text.match(KIT_CHECK_WORKFLOW)?.[1] ?? "";
}

/** @param {boolean} ok */
const yes = (ok) => (ok ? MARK.done : MARK.missing);

/** @param {string} repo @param {string[]} files */
function collectDeps(repo, files) {
  /** @type {Record<string, string>} */
  const deps = {};
  for (const path of files.filter(
    (file) => basename(file) === "package.json",
  )) {
    const pkg = JSON.parse(readFile(repo, path));
    Object.assign(deps, pkg.dependencies, pkg.devDependencies);
  }
  return deps;
}

/** @param {App} app @param {string} kitTag */
function kitRow(app, kitTag) {
  const files = listFiles(app.repo);
  const deps = collectDeps(app.repo, files);
  const workflows = files
    .filter((path) => WORKFLOW_FILE.test(path))
    .map((path) => readFile(app.repo, path))
    .join("\n");
  const agents = files.includes(AGENTS_FILE)
    ? readFile(app.repo, AGENTS_FILE)
    : "";
  const pin = (/** @type {string} */ name) =>
    versionMark(kitPin(deps, name), kitTag);
  return [
    app.repo,
    versionMark(workflowPin(workflows), kitTag),
    pin("config"),
    app.sso ? pin("sso") : MARK.na,
    pin("e2e"),
    yes(ROOT_IGNORE_FILES.every((file) => files.includes(file))),
    yes(
      AGENTS_SECTIONS.every((section) => agents.includes(section)) &&
        agents.includes(SECRET_SCAN_WORD),
    ),
    app.note ?? "",
  ];
}

/** @param {App} app @param {Set<string>} uiKitFiles */
function uiRow(app, uiKitFiles) {
  const files = listFiles(app.repo);
  const names = new Set(files.map((path) => basename(path)));
  const agents = names.has(AGENTS_FILE) ? readFile(app.repo, AGENTS_FILE) : "";
  const copied = [...uiKitFiles].filter((file) => names.has(file)).length;
  return [
    app.repo,
    yes(names.has(TOKENS_FILE)),
    copied ? `${copied}/${uiKitFiles.size}` : MARK.missing,
    yes(SCREEN_FILES.every((file) => names.has(file))),
    yes(names.has(POPUP_FILE)),
    yes(agents.includes(ONE_SCREEN_WORD)),
    app.note ?? "",
  ];
}

/** @param {string[]} header @param {string[][]} rows */
export function table(header, rows) {
  const line = (/** @type {string[]} */ cells) => `| ${cells.join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join(
    "\n",
  );
}

function kitTable() {
  const kitTag = latestTag(KIT_REPO);
  const rows = APPS.map((app) => kitRow(app, kitTag));
  const header = [
    "Repo",
    "CI check.yml",
    "@huyab/config",
    "@huyab/sso",
    "@huyab/e2e",
    "Ignore files",
    "AGENTS skeleton",
    "Note",
  ];
  return `Latest kit tag: \`${kitTag}\`.\n\n${table(header, rows)}`;
}

function uiTable() {
  const uiKitFiles = new Set(
    listFiles(UI_KIT_REPO)
      .filter((path) => path.startsWith(UI_KIT_COMPONENT_DIR))
      .map((path) => basename(path))
      .filter((file) => !UI_KIT_SKIPPED_FILES.has(file)),
  );
  const rows = APPS.filter((app) => app.ui && app.repo !== UI_KIT_REPO).map(
    (app) => uiRow(app, uiKitFiles),
  );
  const header = [
    "Repo",
    "tokens.css",
    "Components copied",
    "Screen + PagedList",
    "ConfirmProvider",
    "One-screen rule in AGENTS",
    "Note",
  ];
  return table(header, rows);
}

/** @param {string} text @param {string} section @param {string} body */
export function replaceSection(text, section, body) {
  const start = `<!-- adoption:${section}:start -->`;
  const end = `<!-- adoption:${section}:end -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from < 0 || to < from) throw new Error(`missing ${start} … ${end}`);
  return `${text.slice(0, from + start.length)}\n${body}\n${text.slice(to)}`;
}

function main() {
  const [section, target] = process.argv.slice(2);
  const build = { kit: kitTable, ui: uiTable }[section ?? ""];
  if (!build) {
    console.error("usage: node scripts/adoption.mjs <kit|ui> [file-to-update]");
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const body = `Generated ${today} by \`kit/scripts/adoption.mjs ${section}\`.\n\n${build()}`;
  if (!target) {
    console.log(body);
    return;
  }
  writeFileSync(
    target,
    replaceSection(readFileSync(target, "utf8"), section, body),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
