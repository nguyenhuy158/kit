import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { assertLocalOnly, expectDeployed } from "./harness.js";
import { freePort, startServer } from "./server.js";

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

describe("expectDeployed", () => {
  /** @param {Record<string, { status: number; body: unknown }>} routes */
  async function serve(routes) {
    const server = createServer((request, response) => {
      const route = routes[request.url ?? ""];
      if (!route) {
        response.statusCode = 404;
        response.end("{}");
        return;
      }
      response.statusCode = route.status;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(route.body));
    });
    await new Promise((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve(undefined)),
    );
    const { port } = /** @type {import("node:net").AddressInfo} */ (
      server.address()
    );
    return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
  }

  it("returns the deployed commit when version and health are fine", async () => {
    const app = await serve({
      "/api/version": { status: 200, body: { commit: "5495baa" } },
      "/api/health": { status: 200, body: { ok: true } },
    });
    try {
      await expect(expectDeployed(app.url)).resolves.toEqual({
        commit: "5495baa",
      });
    } finally {
      app.close();
    }
  });

  it("fails when the commit is missing", async () => {
    const app = await serve({
      "/api/version": { status: 200, body: { commit: "" } },
      "/api/health": { status: 200, body: { ok: true } },
    });
    try {
      await expect(expectDeployed(app.url)).rejects.toThrow(/no commit/);
    } finally {
      app.close();
    }
  });

  it("fails when health is not ok", async () => {
    const app = await serve({
      "/api/version": { status: 200, body: { commit: "5495baa" } },
      "/api/health": { status: 500, body: { ok: false } },
    });
    try {
      await expect(expectDeployed(app.url)).rejects.toThrow(/api\/health/);
    } finally {
      app.close();
    }
  });

  it("fails when an endpoint is missing", async () => {
    const app = await serve({});
    try {
      await expect(expectDeployed(app.url)).rejects.toThrow(
        /expected 200, got 404/,
      );
    } finally {
      app.close();
    }
  });
});
