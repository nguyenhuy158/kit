import { describe, expect, it, vi } from "vitest";
import { readThrough } from "./index";

const TTL_MS = 60_000;
const RETRY_MS = 5_000;

function clock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("readThrough", () => {
  it("loads once and serves the cached value while fresh", async () => {
    const time = clock();
    const load = vi.fn().mockResolvedValue("rows-1");
    const cache = readThrough(load, { ttlMs: TTL_MS, now: time.now });

    expect(await cache.get()).toBe("rows-1");
    time.advance(TTL_MS - 1);
    expect(await cache.get()).toBe("rows-1");

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one load between concurrent first reads", async () => {
    const load = vi.fn().mockResolvedValue("rows-1");
    const cache = readThrough(load, { ttlMs: TTL_MS });

    const results = await Promise.all([cache.get(), cache.get(), cache.get()]);

    expect(results).toEqual(["rows-1", "rows-1", "rows-1"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the stale value at once and refreshes in the background", async () => {
    const time = clock();
    const load = vi
      .fn()
      .mockResolvedValueOnce("rows-1")
      .mockResolvedValueOnce("rows-2");
    const cache = readThrough(load, { ttlMs: TTL_MS, now: time.now });
    await cache.get();
    time.advance(TTL_MS);

    expect(await cache.get()).toBe("rows-1");
    await settle();

    expect(await cache.get()).toBe("rows-2");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("refreshes after invalidate, as a write would", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce("rows-1")
      .mockResolvedValueOnce("rows-2");
    const cache = readThrough(load, { ttlMs: TTL_MS });
    await cache.get();

    cache.invalidate();
    expect(cache.peek().stale).toBe(true);
    await cache.get();
    await settle();

    expect(await cache.get()).toBe("rows-2");
  });

  it("keeps the old value on a failed refresh and retries after retryMs", async () => {
    const time = clock();
    const load = vi
      .fn()
      .mockResolvedValueOnce("rows-1")
      .mockRejectedValueOnce(new Error("D1 limit reached"))
      .mockResolvedValueOnce("rows-2");
    const cache = readThrough(load, {
      ttlMs: TTL_MS,
      retryMs: RETRY_MS,
      now: time.now,
    });
    await cache.get();
    time.advance(TTL_MS);

    expect(await cache.get()).toBe("rows-1");
    await settle();
    expect(cache.peek().error?.message).toBe("D1 limit reached");

    time.advance(RETRY_MS - 1);
    await cache.get();
    expect(load).toHaveBeenCalledTimes(2);

    time.advance(1);
    await cache.get();
    await settle();
    expect(await cache.get()).toBe("rows-2");
    expect(cache.peek().error).toBeNull();
  });

  it("does not reload on every read while the first load keeps failing", async () => {
    const time = clock();
    const load = vi.fn().mockRejectedValue(new Error("down"));
    const cache = readThrough(load, {
      ttlMs: TTL_MS,
      retryMs: RETRY_MS,
      now: time.now,
    });

    await expect(cache.get()).rejects.toThrow("down");
    await expect(cache.get()).rejects.toThrow("down");
    expect(load).toHaveBeenCalledTimes(1);

    time.advance(RETRY_MS);
    await expect(cache.get()).rejects.toThrow("down");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
