import { describe, expect, it } from "vitest";
import { assertLocalOnly } from "./harness.js";
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
    "https://notes.huyab.click",
    "http://staging.huyab.click",
    "http://127.0.0.1.nip.io:8787",
    "http://localhost.huyab.click",
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
