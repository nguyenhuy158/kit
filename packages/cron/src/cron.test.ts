import { describe, expect, it } from "vitest";
import { dispatchTick } from "./hub";
import { isDue, parseSchedule } from "./schedule";
import { handleTick, type KvLike, TICK_PATH, type TickJob } from "./spoke";

const KEY = "hub-secret";
const utc = (text: string) => new Date(`${text}Z`);

function memoryKv(): KvLike {
  const store = new Map<string, string>();
  return {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => {
      store.set(key, value);
    },
  };
}

function tickRequest(scheduledTime: number, key = KEY): Request {
  return new Request(`https://spoke${TICK_PATH}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: JSON.stringify({ scheduledTime }),
  });
}

describe("isDue", () => {
  it("matches every minute", () => {
    expect(isDue("* * * * *", utc("2026-11-15T10:07:00"))).toBe(true);
  });

  it("matches steps", () => {
    expect(isDue("*/15 * * * *", utc("2026-11-15T10:30:00"))).toBe(true);
    expect(isDue("*/15 * * * *", utc("2026-11-15T10:31:00"))).toBe(false);
    expect(isDue("5/15 * * * *", utc("2026-11-15T10:20:00"))).toBe(true);
  });

  it("reads the hour in Asia/Ho_Chi_Minh by default", () => {
    expect(isDue("30 13 * * *", utc("2026-11-15T06:30:00"))).toBe(true);
    expect(isDue("30 13 * * *", utc("2026-11-15T13:30:00"))).toBe(false);
    expect(isDue("30 13 * * *", utc("2026-11-15T13:30:00"), "UTC")).toBe(true);
  });

  it("matches lists and ranges", () => {
    expect(isDue("0 9-11 * * *", utc("2026-11-15T03:00:00"))).toBe(true);
    expect(isDue("0,30 * * * *", utc("2026-11-15T10:30:00"))).toBe(true);
  });

  it("treats 0 and 7 as Sunday", () => {
    const sunday = utc("2026-11-15T03:00:00");
    expect(isDue("0 10 * * 0", sunday)).toBe(true);
    expect(isDue("0 10 * * 7", sunday)).toBe(true);
    expect(isDue("0 10 * * 1", sunday)).toBe(false);
  });

  it("uses OR when both day of month and day of week are set", () => {
    const sunday15th = utc("2026-11-15T03:00:00");
    expect(isDue("0 10 1 * 0", sunday15th)).toBe(true);
    expect(isDue("0 10 15 * 1", sunday15th)).toBe(true);
    expect(isDue("0 10 1 * 1", sunday15th)).toBe(false);
  });

  it("rejects bad expressions", () => {
    expect(() => parseSchedule("* * * *")).toThrow("5 fields");
    expect(() => parseSchedule("60 * * * *")).toThrow("out of range");
    expect(() => parseSchedule("a * * * *")).toThrow("Invalid minute");
    expect(() => parseSchedule("*/0 * * * *")).toThrow("out of range");
    expect(() => parseSchedule("5-1 * * * *")).toThrow("Invalid minute range");
  });
});

describe("handleTick", () => {
  const ran: string[] = [];
  const jobs: TickJob<object>[] = [
    {
      name: "every-minute",
      schedule: "* * * * *",
      run: async () => void ran.push("every-minute"),
    },
    {
      name: "noon",
      schedule: "0 12 * * *",
      run: async () => void ran.push("noon"),
    },
  ];
  const at = Date.parse("2026-11-15T10:07:30Z");

  it("rejects a wrong or missing bearer", async () => {
    expect(
      (await handleTick(tickRequest(at, "nope"), {}, { jobs, key: KEY }))
        .status,
    ).toBe(401);
    expect(
      (await handleTick(tickRequest(at), {}, { jobs, key: "" })).status,
    ).toBe(401);
  });

  it("rejects other methods and bad bodies", async () => {
    const get = new Request(`https://spoke${TICK_PATH}`);
    expect((await handleTick(get, {}, { jobs, key: KEY })).status).toBe(405);
    const bad = new Request(`https://spoke${TICK_PATH}`, {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}` },
      body: "{}",
    });
    expect((await handleTick(bad, {}, { jobs, key: KEY })).status).toBe(400);
  });

  it("runs due jobs and ignores the rest", async () => {
    ran.length = 0;
    const response = await handleTick(tickRequest(at), {}, { jobs, key: KEY });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ran: ["every-minute"],
      skipped: ["noon"],
      failed: [],
    });
    expect(ran).toEqual(["every-minute"]);
  });

  it("does not run the same job twice in one minute", async () => {
    ran.length = 0;
    const dedupe = memoryKv();
    await handleTick(tickRequest(at), {}, { jobs, key: KEY, dedupe });
    const second = await handleTick(
      tickRequest(at + 20_000),
      {},
      { jobs, key: KEY, dedupe },
    );
    expect(await second.json()).toEqual({
      ran: [],
      skipped: ["every-minute", "noon"],
      failed: [],
    });
    expect(ran).toEqual(["every-minute"]);
  });

  it("reports a failing job with status 500 and keeps going", async () => {
    const failing: TickJob<object>[] = [
      {
        name: "boom",
        schedule: "* * * * *",
        run: async () => {
          throw new Error("broke");
        },
      },
      { name: "fine", schedule: "* * * * *", run: async () => {} },
    ];
    const response = await handleTick(
      tickRequest(at),
      {},
      { jobs: failing, key: KEY },
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ran: ["fine"],
      skipped: [],
      failed: [{ job: "boom", error: "broke" }],
    });
  });
});

describe("dispatchTick", () => {
  it("sends the tick to every spoke and reports each result", async () => {
    const seen: { url: string; auth: string | null; body: unknown }[] = [];
    const spokeOk = {
      fetch: async (request: Request) => {
        seen.push({
          url: request.url,
          auth: request.headers.get("authorization"),
          body: await request.json(),
        });
        return Response.json({ ran: ["a"], skipped: [], failed: [] });
      },
    };
    const spokeDown = {
      fetch: async () => {
        throw new Error("unreachable");
      },
    };
    const spokeFail = {
      fetch: async () => Response.json({ error: "x" }, { status: 500 }),
    };
    const results = await dispatchTick(
      [
        { name: "ok", fetcher: spokeOk },
        { name: "down", fetcher: spokeDown },
        { name: "fail", fetcher: spokeFail },
      ],
      { key: KEY, scheduledTime: Date.parse("2026-11-15T10:07:30Z") },
    );
    expect(results).toEqual([
      { spoke: "ok", ok: true, status: 200, ran: ["a"] },
      { spoke: "down", ok: false, error: "unreachable" },
      { spoke: "fail", ok: false, status: 500, ran: undefined },
    ]);
    expect(seen).toEqual([
      {
        url: `https://ok${TICK_PATH}`,
        auth: `Bearer ${KEY}`,
        body: { scheduledTime: Date.parse("2026-11-15T10:07:00Z") },
      },
    ]);
  });
});
