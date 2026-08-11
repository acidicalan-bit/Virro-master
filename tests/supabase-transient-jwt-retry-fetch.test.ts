import { describe, expect, it, vi } from "vitest";

import { createTransientJwtRetryFetch } from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";

describe("Supabase transient JWT retry fetch", () => {
  it("retries a future-issued JWT rejection and returns the next response", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('{"message":"JWT issued at future"}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      retryDelaysMs: [250],
      sleep,
    });

    const response = await retryFetch("https://example.supabase.co/rest/v1/studies");

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });

  it("does not retry unrelated authentication failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"message":"Invalid API key"}', { status: 401 }),
    );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      retryDelaysMs: [250, 750],
      sleep,
    });

    const response = await retryFetch("https://example.supabase.co/rest/v1/studies");

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("stops after the configured retry budget", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"message":"JWT issued at future"}', { status: 401 }),
    );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      retryDelaysMs: [100, 200],
      sleep,
    });

    const response = await retryFetch("https://example.supabase.co/rest/v1/studies");

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 200);
  });
});
