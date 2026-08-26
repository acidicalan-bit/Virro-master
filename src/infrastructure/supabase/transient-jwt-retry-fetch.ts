const DEFAULT_RETRY_DELAYS_MS = [250, 750, 1_500] as const;
const FUTURE_JWT_MESSAGE = /jwt issued at future/i;

type Sleep = (delayMs: number) => Promise<void>;

interface TransientJwtRetryOptions {
  fetchImpl?: typeof fetch;
  retryDelaysMs?: readonly number[];
  serializationRetryLimit?: number;
  sleep?: Sleep;
}

export function createTransientJwtRetryFetch(
  options: TransientJwtRetryOptions = {},
): typeof fetch {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const serializationRetryLimit = options.serializationRetryLimit ?? 1;
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  return async (input, init) => {
    let jwtAttempts = 0;
    let serializationAttempts = 0;
    for (;;) {
      const requestInput = input instanceof Request ? input.clone() : input;
      const response = await fetchImpl(requestInput, init);
      if (response.ok) return response;

      const responseText = await response.clone().text();
      if (isSerializationFailure(responseText) && serializationAttempts < serializationRetryLimit) {
        // Replaying the same PostgREST request creates a fresh READ COMMITTED
        // technical transaction. No business input or D6 attempt is changed.
        serializationAttempts += 1;
        continue;
      }

      if (FUTURE_JWT_MESSAGE.test(responseText) && jwtAttempts < retryDelaysMs.length) {
        await sleep(retryDelaysMs[jwtAttempts]);
        jwtAttempts += 1;
        continue;
      }
      return response;
    }
  };
}

function isSerializationFailure(responseText: string): boolean {
  try {
    const value = JSON.parse(responseText) as { code?: unknown };
    return value.code === "40001";
  } catch {
    return false;
  }
}
