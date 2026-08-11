const DEFAULT_RETRY_DELAYS_MS = [250, 750, 1_500] as const;
const FUTURE_JWT_MESSAGE = /jwt issued at future/i;

type Sleep = (delayMs: number) => Promise<void>;

interface TransientJwtRetryOptions {
  fetchImpl?: typeof fetch;
  retryDelaysMs?: readonly number[];
  sleep?: Sleep;
}

export function createTransientJwtRetryFetch(
  options: TransientJwtRetryOptions = {},
): typeof fetch {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  return async (input, init) => {
    for (let attempt = 0; ; attempt += 1) {
      const requestInput = input instanceof Request ? input.clone() : input;
      const response = await fetchImpl(requestInput, init);
      const canRetry = attempt < retryDelaysMs.length && !response.ok;

      if (!canRetry || !FUTURE_JWT_MESSAGE.test(await response.clone().text())) {
        return response;
      }

      await sleep(retryDelaysMs[attempt]);
    }
  };
}
