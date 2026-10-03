// Sinh logo + favicon "mochi kawaii" cho moi app ca nhan theo docs/BRAND.md.
// Chay: node brand/generate.mjs  ->  brand/out/<app>/{favicon.svg,apple-touch-icon.png,icon-512.png}
// Can rsvg-convert (brew install librsvg).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INK = "#3d2b4f"; // net ve + mat, dung chung moi logo
const BLUSH = "#ff8fab";

/** Moi app: 1 mau nen pastel + 1-2 ky tu tren huy hieu. Them app moi = them 1 dong. */
export const APPS = {
  "chia-keo": { bg: "#ffd6a5", badge: "CK" },
  notes: { bg: "#cdeac0", badge: "N" },
  monitor: { bg: "#bde0fe", badge: "M" },
  "ai-english": { bg: "#ffc8dd", badge: "EN" },
  share: { bg: "#e2cfff", badge: "S" },
  cardstat: { bg: "#fde68a", badge: "$" },
  hooks: { bg: "#c7f0ee", badge: "H" },
  "picaku-mul": { bg: "#ffb5a7", badge: "G" },
  mytools: { bg: "#d0f4de", badge: "T" },
  resume: { bg: "#f1e3d3", badge: "CV" },
  sso: { bg: "#d7d3ff", badge: "A" },
  mailer: { bg: "#ffdfd3", badge: "@" },
  "ui-kit": { bg: "#e4c1f9", badge: "UI" },
};

export function logoSvg({ bg, badge }) {
  const size = badge.length > 1 ? 74 : 92;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="128" fill="${bg}" stroke="${INK}" stroke-width="16"/>
  <path d="M96 352c0-96 72-176 160-176s160 80 160 176c0 40-32 64-80 64H176c-48 0-80-24-80-64z" fill="#fff" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
  <ellipse cx="200" cy="318" rx="16" ry="22" fill="${INK}"/>
  <ellipse cx="312" cy="318" rx="16" ry="22" fill="${INK}"/>
  <circle cx="206" cy="310" r="6" fill="#fff"/>
  <circle cx="318" cy="310" r="6" fill="#fff"/>
  <ellipse cx="160" cy="356" rx="22" ry="12" fill="${BLUSH}" opacity=".7"/>
  <ellipse cx="352" cy="356" rx="22" ry="12" fill="${BLUSH}" opacity=".7"/>
  <path d="M236 352q10 12 20 0q10 12 20 0" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="380" cy="132" r="84" fill="#fff" stroke="${INK}" stroke-width="16"/>
  <text x="380" y="132" dy=".35em" text-anchor="middle" font-family="'Arial Rounded MT Bold','Nunito','Varela Round',system-ui,sans-serif" font-weight="900" font-size="${size}" fill="${INK}">${badge}</text>
  <path d="M112 124l10 22 22 10-22 10-10 22-10-22-22-10 22-10z" fill="#fff" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
</svg>
`;
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "out");
const only = process.argv.slice(2);

for (const [app, spec] of Object.entries(APPS)) {
  if (only.length && !only.includes(app)) continue;
  const dir = join(outDir, app);
  mkdirSync(dir, { recursive: true });
  const svg = join(dir, "favicon.svg");
  writeFileSync(svg, logoSvg(spec));
  for (const [file, px] of [["apple-touch-icon.png", 180], ["icon-512.png", 512], ["favicon-32.png", 32]]) {
    execFileSync("rsvg-convert", ["-w", String(px), "-h", String(px), "-o", join(dir, file), svg]);
  }
  console.log(`ok ${app}`);
}
