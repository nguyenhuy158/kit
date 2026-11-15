export const DEFAULT_VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "small-phone", width: 360, height: 640 },
  { name: "desktop", width: 1280, height: 720 },
];

const SETTLE_FRAMES = 2;

/**
 * Runs inside the page, so it must not use anything defined outside itself. Lists what makes the screen scroll: the page itself,
 * and any element whose overflow is auto/scroll and whose content is larger
 * than its box. Elements matching an `ignore` selector (and their children)
 * are skipped. Clipped (`overflow: hidden`) content is not an offender.
 * @param {string[]} ignore CSS selectors that may scroll on purpose
 * @returns {string[]}
 */
export function collectOverflowOffenders(ignore) {
  const scrollable = ["auto", "scroll"];
  const tolerance = 1;
  const root = document.documentElement;
  const offenders = [];
  if (root.scrollHeight > window.innerHeight + tolerance)
    offenders.push("page (vertical)");
  if (root.scrollWidth > window.innerWidth + tolerance)
    offenders.push("page (horizontal)");
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (ignore.some((selector) => el.closest(selector))) continue;
    const style = getComputedStyle(el);
    const scrollsY =
      scrollable.includes(style.overflowY) &&
      el.scrollHeight > el.clientHeight + tolerance;
    const scrollsX =
      scrollable.includes(style.overflowX) &&
      el.scrollWidth > el.clientWidth + tolerance;
    if (scrollsY || scrollsX) {
      const label = el.getAttribute("aria-label") || el.id;
      offenders.push(
        `${el.tagName.toLowerCase()}${label ? `[${label}]` : ""}${
          scrollsY ? " (vertical)" : " (horizontal)"
        }`,
      );
    }
  }
  return offenders;
}

/**
 * @typedef {{
 *   viewportSize(): { width: number, height: number } | null,
 *   setViewportSize(size: { width: number, height: number }): Promise<void>,
 *   evaluate(fn: (arg: any) => any, arg?: any): Promise<any>,
 * }} PageLike the slice of a Playwright `Page` used here
 * @typedef {{ name: string, width: number, height: number }} Viewport
 * @typedef {{
 *   viewports?: Viewport[],
 *   ignore?: string[],
 * }} FitsViewportOptions
 */

/**
 * Resizes a Playwright page to each viewport and reports what scrolls.
 * Restores the original viewport afterwards.
 * @param {PageLike} page
 * @param {FitsViewportOptions} [options]
 * @returns {Promise<{ viewport: string, offenders: string[] }[]>} only viewports with offenders
 */
export async function findScrollOverflow(
  page,
  { viewports = DEFAULT_VIEWPORTS, ignore = [] } = {},
) {
  const original = page.viewportSize();
  const failures = [];
  try {
    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.evaluate(
        /** @param {number} frames */
        (frames) =>
          new Promise((resolve) => {
            /** @param {number} left */
            const tick = (left) =>
              left === 0
                ? resolve(undefined)
                : requestAnimationFrame(() => tick(left - 1));
            tick(frames);
          }),
        SETTLE_FRAMES,
      );
      const offenders = await page.evaluate(collectOverflowOffenders, ignore);
      if (offenders.length > 0)
        failures.push({ viewport: viewport.name, offenders });
    }
  } finally {
    if (original) await page.setViewportSize(original);
  }
  return failures;
}

/**
 * Throws when the current screen scrolls at any viewport.
 * @param {PageLike} page
 * @param {FitsViewportOptions & { label?: string }} [options]
 */
export async function assertFitsViewport(page, options = {}) {
  const failures = await findScrollOverflow(page, options);
  if (failures.length === 0) return;
  const detail = failures
    .map(({ viewport, offenders }) => `${viewport}: ${offenders.join(", ")}`)
    .join("; ");
  throw new Error(
    `${options.label ?? "screen"} does not fit one viewport: ${detail}`,
  );
}
