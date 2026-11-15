import { DEFAULT_TIME_ZONE, floorToMinute, isDue } from "./schedule";

export const TICK_PATH = "/__cron/tick";
export const DEDUPE_TTL_SECONDS = 120;

export type Tick = { scheduledTime: number };

export type TickJob<Env> = {
  name: string;
  schedule: string;
  run: (env: Env, tick: Tick) => Promise<void>;
};

export type KvLike = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl: number },
  ): Promise<void>;
};

export type TickOptions<Env> = {
  jobs: TickJob<Env>[];
  key: string;
  timeZone?: string;
  dedupe?: KvLike;
};

export type TickResult = {
  ran: string[];
  skipped: string[];
  failed: { job: string; error: string }[];
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sameSecret(actual: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(actual);
  const right = encoder.encode(expected);
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

async function readTick(request: Request): Promise<Tick | null> {
  try {
    const body = (await request.json()) as { scheduledTime?: unknown };
    if (
      typeof body.scheduledTime !== "number" ||
      !Number.isFinite(body.scheduledTime)
    )
      return null;
    return { scheduledTime: floorToMinute(body.scheduledTime) };
  } catch {
    return null;
  }
}

export async function handleTick<Env>(
  request: Request,
  env: Env,
  options: TickOptions<Env>,
): Promise<Response> {
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!options.key || !sameSecret(bearer, options.key))
    return json({ error: "unauthorized" }, 401);
  const tick = await readTick(request);
  if (!tick) return json({ error: "invalid_tick" }, 400);

  const at = new Date(tick.scheduledTime);
  const zone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const result: TickResult = { ran: [], skipped: [], failed: [] };
  for (const job of options.jobs) {
    if (!isDue(job.schedule, at, zone)) {
      result.skipped.push(job.name);
      continue;
    }
    const lock = `cron:${job.name}:${tick.scheduledTime}`;
    if (options.dedupe) {
      if (await options.dedupe.get(lock)) {
        result.skipped.push(job.name);
        continue;
      }
      await options.dedupe.put(lock, "1", {
        expirationTtl: DEDUPE_TTL_SECONDS,
      });
    }
    try {
      await job.run(env, tick);
      result.ran.push(job.name);
    } catch (error) {
      result.failed.push({
        job: job.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return json(result, result.failed.length ? 500 : 200);
}
