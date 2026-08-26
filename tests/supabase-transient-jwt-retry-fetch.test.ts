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

  it("restarts one complete PostgREST transaction for SQLSTATE 40001", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('{"code":"40001","message":"restart"}', { status: 409 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      serializationRetryLimit: 1,
      sleep: vi.fn(),
    });

    const response = await retryFetch(
      new Request("https://example.supabase.co/rest/v1/rpc/build002_admit_delegability", {
        method: "POST",
        body: '{"same":"technical-attempt"}',
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstBody = await (fetchImpl.mock.calls[0][0] as Request).text();
    const secondBody = await (fetchImpl.mock.calls[1][0] as Request).text();
    expect(secondBody).toBe(firstBody);
  });

  it.each(["40P01", "55P03", "57014", "XX000"])(
    "fails closed without technical retry for SQLSTATE %s",
    async (code) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code, message: "fail closed" }), { status: 409 }),
      );
      const retryFetch = createTransientJwtRetryFetch({ fetchImpl: fetchImpl as typeof fetch });

      const response = await retryFetch("https://example.supabase.co/rest/v1/rpc/protected");

      expect(response.status).toBe(409);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
});
