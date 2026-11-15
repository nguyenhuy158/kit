import { floorToMinute } from "./schedule";
import { TICK_PATH, type TickResult } from "./spoke";

export const DEFAULT_TIMEOUT_MS = 10_000;

export type Spoke = {
  name: string;
  fetcher: { fetch(request: Request): Promise<Response> };
};

export type SpokeResult = {
  spoke: string;
  ok: boolean;
  status?: number;
  ran?: string[];
  error?: string;
};

export type DispatchOptions = {
  key: string;
  scheduledTime: number;
  timeoutMs?: number;
};

async function tickOne(
  spoke: Spoke,
  options: DispatchOptions,
): Promise<SpokeResult> {
  const request = new Request(`https://${spoke.name}${TICK_PATH}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      scheduledTime: floorToMinute(options.scheduledTime),
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  try {
    const response = await spoke.fetcher.fetch(request);
    const body = (await response.json().catch(() => null)) as TickResult | null;
    return {
      spoke: spoke.name,
      ok: response.ok,
      status: response.status,
      ran: body?.ran,
    };
  } catch (error) {
    return {
      spoke: spoke.name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function dispatchTick(
  spokes: Spoke[],
  options: DispatchOptions,
): Promise<SpokeResult[]> {
  return Promise.all(spokes.map((spoke) => tickOne(spoke, options)));
}
