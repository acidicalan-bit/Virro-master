import { describe, expect, it, vi } from "vitest";

import {
  BUILD002_002E_SERIALIZATION_RETRY_ENDPOINTS_TOTAL,
  createTransientJwtRetryFetch,
} from "@/src/infrastructure/supabase/transient-jwt-retry-fetch";

const SUPABASE_URL = "https://example.supabase.co";

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
      supabaseUrl: SUPABASE_URL,
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

  it.each(["40P01", "55P03", "57014", "42501", "23505", "XX000"])(
    "fails closed without technical retry for SQLSTATE %s",
    async (code) => {
      const fetchImpl = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code, message: "fail closed" }), { status: 409 }),
      );
      const retryFetch = createTransientJwtRetryFetch({ fetchImpl: fetchImpl as typeof fetch, supabaseUrl: SUPABASE_URL });

      const response = await retryFetch(new Request(
        `${SUPABASE_URL}/rest/v1/rpc/build002_admit_delegability`,
        { method: "POST", body: "{}" },
      ));

      expect(response.status).toBe(409);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("derives exactly 40 protected HTTP endpoints for the 41 canonical templates", () => {
    expect(BUILD002_002E_SERIALIZATION_RETRY_ENDPOINTS_TOTAL).toBe(40);
  });

  it.each([
    ["Storage", `${SUPABASE_URL}/storage/v1/object/media/x`],
    ["Auth", `${SUPABASE_URL}/auth/v1/user`],
    ["Functions", `${SUPABASE_URL}/functions/v1/edit`],
    ["external origin", "https://attacker.example/rest/v1/outcome_transactions"],
    ["nonprotected PostgREST", `${SUPABASE_URL}/rest/v1/projects`],
    ["substring spoof", `${SUPABASE_URL}/outside/rest/v1/outcome_transactions`],
  ])("does not retry 40001 on %s", async (_label, url) => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"code":"40001","message":"not eligible"}', { status: 409 }),
    );
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      supabaseUrl: SUPABASE_URL,
    });

    const response = await retryFetch(new Request(url, { method: "POST" }));

    expect(response.status).toBe(409);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry protected paths with a non-write method", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"code":"40001"}', { status: 409 }));
    const retryFetch = createTransientJwtRetryFetch({ fetchImpl: fetchImpl as typeof fetch, supabaseUrl: SUPABASE_URL });
    await retryFetch(`${SUPABASE_URL}/rest/v1/outcome_transactions`);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      '{"message":"JWT issued at future"}',
      '{"code":"40001"}',
    ],
    [
      '{"code":"40001"}',
      '{"message":"JWT issued at future"}',
    ],
  ])("keeps JWT and serialization retry budgets independent", async (first, second) => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(first, { status: 401 }))
      .mockResolvedValueOnce(new Response(second, { status: 409 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const retryFetch = createTransientJwtRetryFetch({
      fetchImpl: fetchImpl as typeof fetch,
      retryDelaysMs: [0],
      sleep: vi.fn(),
      supabaseUrl: SUPABASE_URL,
    });

    const response = await retryFetch(new Request(
      `${SUPABASE_URL}/rest/v1/rpc/build002_admit_delegability`,
      { method: "POST", body: "{}" },
    ));

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["malformed JSON", "40001"],
    ["text-only code", "server failed with 40001"],
    ["wrong JSON code type", '{"code":40001}'],
  ])("does not retry %s", async (_label, body) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(body, { status: 500 }));
    const retryFetch = createTransientJwtRetryFetch({ fetchImpl: fetchImpl as typeof fetch, supabaseUrl: SUPABASE_URL });
    await retryFetch(new Request(`${SUPABASE_URL}/rest/v1/outcome_transactions`, { method: "POST" }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("replays at most once after repeated 40001 responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"code":"40001"}', { status: 409 }));
    const retryFetch = createTransientJwtRetryFetch({ fetchImpl: fetchImpl as typeof fetch, supabaseUrl: SUPABASE_URL });
    const response = await retryFetch(new Request(`${SUPABASE_URL}/rest/v1/outcome_transactions`, { method: "POST" }));
    expect(response.status).toBe(409);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
