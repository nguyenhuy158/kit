import { afterEach, describe, expect, it, vi } from "vitest";
import { assertLocalOnly } from "./harness.js";
import { freePort, startServer } from "./server.js";
import {
  assertFitsViewport,
  collectOverflowOffenders,
  findScrollOverflow,
} from "./viewport.js";

describe("assertLocalOnly", () => {
  it.each([
    "http://127.0.0.1:8787",
    "http://localhost:5173/",
    "https://localhost",
  ])("allows %s", (url) => {
    expect(() => assertLocalOnly(url)).not.toThrow();
  });

  it.each([
    "https://notes.huyab.cfd",
    "http://staging.huyab.cfd",
    "http://127.0.0.1.nip.io:8787",
    "http://localhost.huyab.cfd",
    "not a url",
  ])("refuses %s", (url) => {
    expect(() => assertLocalOnly(url)).toThrow(/refusing/);
  });
});

describe("startServer", () => {
  it("stop() kills the whole process group, including grandchildren", async () => {
    const port = await freePort();
    const readyUrl = `http://127.0.0.1:${port}/`;
    const serve = `require("node:http").createServer((_, res) => res.end("ok")).listen(${port}, "127.0.0.1")`;
    // `; true` stops sh from exec-ing node, so node is a grandchild like workerd under pnpm.
    const server = await startServer({
      command: "sh",
      args: ["-c", `"${process.execPath}" -e '${serve}'; true`],
      readyUrl,
    });

    await server.stop();

    await expect(fetch(readyUrl)).rejects.toThrow();
  });

  it("rejects when the server exits before it is ready", async () => {
    const start = startServer({
      command: process.execPath,
      args: ["-e", "process.exit(3)"],
      readyUrl: `http://127.0.0.1:${await freePort()}/`,
    });

    await expect(start).rejects.toThrow(/exited early \(3\)/);
  });
});

describe("viewport helpers", () => {
  /** @param {Record<string, unknown>} overrides */
  const box = (overrides) => ({
    tagName: "DIV",
    scrollHeight: 100,
    clientHeight: 100,
    scrollWidth: 100,
    clientWidth: 100,
    style: { overflowX: "visible", overflowY: "visible" },
    getAttribute: () => null,
    id: "",
    closest: () => null,
    ...overrides,
  });

  /** @param {{ root?: object, elements: object[] }} dom */
  const stubDom = ({ root, elements }) => {
    vi.stubGlobal("window", { innerHeight: 800, innerWidth: 400 });
    vi.stubGlobal("document", {
      documentElement: { scrollHeight: 800, scrollWidth: 400, ...root },
      body: { querySelectorAll: () => elements },
    });
    vi.stubGlobal("getComputedStyle", (/** @type {any} */ el) => el.style);
  };

  afterEach(() => vi.unstubAllGlobals());

  it("reports nothing for a screen that fits", () => {
    stubDom({ elements: [box({})] });
    expect(collectOverflowOffenders([])).toEqual([]);
  });

  it("reports page scroll in both directions", () => {
    stubDom({ root: { scrollHeight: 900, scrollWidth: 500 }, elements: [] });
    expect(collectOverflowOffenders([])).toEqual([
      "page (vertical)",
      "page (horizontal)",
    ]);
  });

  it("reports a scrollable pane but not clipped overflow", () => {
    stubDom({
      elements: [
        box({
          id: "list",
          scrollHeight: 300,
          style: { overflowX: "visible", overflowY: "auto" },
        }),
        box({
          scrollHeight: 300,
          style: { overflowX: "hidden", overflowY: "hidden" },
        }),
      ],
    });
    expect(collectOverflowOffenders([])).toEqual(["div[list] (vertical)"]);
  });

  it("skips elements inside an ignored selector", () => {
    stubDom({
      elements: [
        box({
          scrollHeight: 300,
          style: { overflowX: "visible", overflowY: "scroll" },
          closest: (/** @type {string} */ selector) =>
            selector === "[role=dialog]" ? {} : null,
        }),
      ],
    });
    expect(collectOverflowOffenders(["[role=dialog]"])).toEqual([]);
  });

  /** @param {Record<number, string[]>} offendersByWidth */
  const fakePage = (offendersByWidth) => {
    let size = { width: 1000, height: 1000 };
    /** @type {number[]} */
    const sizes = [];
    return {
      sizes,
      viewportSize: () => size,
      setViewportSize: async (
        /** @type {{ width: number, height: number }} */ next,
      ) => {
        size = next;
        sizes.push(next.width);
      },
      evaluate: async (
        /** @type {unknown} */ fn,
        /** @type {unknown} */ arg,
      ) =>
        fn === collectOverflowOffenders
          ? (offendersByWidth[size.width] ?? [])
          : arg,
    };
  };

  it("lists failing viewports and restores the original size", async () => {
    const page = fakePage({ 390: ["page (vertical)"] });
    const failures = await findScrollOverflow(page, {
      viewports: [
        { name: "phone", width: 390, height: 844 },
        { name: "desktop", width: 1280, height: 720 },
      ],
    });
    expect(failures).toEqual([
      { viewport: "phone", offenders: ["page (vertical)"] },
    ]);
    expect(page.sizes).toEqual([390, 1280, 1000]);
  });

  it("assertFitsViewport throws with the viewport and offender", async () => {
    const page = fakePage({ 390: ["div[list] (vertical)"] });
    await expect(
      assertFitsViewport(page, {
        label: "Chi tab",
        viewports: [{ name: "phone", width: 390, height: 844 }],
      }),
    ).rejects.toThrow(/Chi tab.*phone: div\[list\] \(vertical\)/);
  });

  it("assertFitsViewport passes when nothing scrolls", async () => {
    const page = fakePage({ 390: [] });
    await expect(
      assertFitsViewport(page, {
        viewports: [{ name: "phone", width: 390, height: 844 }],
      }),
    ).resolves.toBeUndefined();
  });
});
