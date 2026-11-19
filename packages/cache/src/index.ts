export interface CacheOptions {
  ttlMs: number;
  retryMs?: number;
  now?: () => number;
}

export interface CacheState<T> {
  value: T | undefined;
  loadedAt: number | null;
  error: Error | null;
  loading: boolean;
  stale: boolean;
}

export interface ReadThroughCache<T> {
  get(): Promise<T>;
  peek(): CacheState<T>;
  invalidate(): void;
}

export function readThrough<T>(
  load: () => Promise<T>,
  options: CacheOptions,
): ReadThroughCache<T> {
  const now = options.now ?? Date.now;
  const retryMs = options.retryMs ?? options.ttlMs;
  let value: T | undefined;
  let hasValue = false;
  let loadedAt: number | null = null;
  let attemptedAt = Number.NEGATIVE_INFINITY;
  let error: Error | null = null;
  let inFlight: Promise<T> | null = null;
  let writes = 0;
  let loadedWrites = 0;

  const isStale = () =>
    !hasValue || loadedAt === null || now() - loadedAt >= options.ttlMs;
  const isDue = () => now() - attemptedAt >= (error ? retryMs : options.ttlMs);

  const refresh = (): Promise<T> => {
    if (inFlight) return inFlight;
    attemptedAt = now();
    const writesAtStart = writes;
    inFlight = load()
      .then((loaded) => {
        value = loaded;
        hasValue = true;
        loadedAt = now();
        loadedWrites = writesAtStart;
        error = null;
        return loaded;
      })
      .catch((cause: unknown) => {
        error = cause instanceof Error ? cause : new Error(String(cause));
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    async get() {
      if (!hasValue) {
        if (error && !inFlight && !isDue()) throw error;
        return refresh();
      }
      if (loadedWrites !== writes) {
        await refresh();
        return loadedWrites === writes ? (value as T) : refresh();
      }
      if (isStale() && isDue()) refresh().catch(() => undefined);
      return value as T;
    },
    peek() {
      return {
        value,
        loadedAt,
        error,
        loading: inFlight !== null,
        stale: isStale() || loadedWrites !== writes,
      };
    },
    invalidate() {
      writes += 1;
      attemptedAt = Number.NEGATIVE_INFINITY;
    },
  };
}
