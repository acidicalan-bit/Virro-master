import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSystemRepositories,
  createTenantSupabaseRepositories,
} from "@/src/infrastructure/persistence/supabase-repositories";
import { SupabaseProjectRepository } from "@/src/infrastructure/persistence/outcome/supabase-outcome-repositories";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";

class QueryStub {
  terminalCalls = 0;
  operation: "read" | "insert" = "read";

  select() { return this; }
  eq() { return this; }
  insert() { this.operation = "insert"; return this; }
  maybeSingle() { this.terminalCalls += 1; return Promise.resolve({ data: null, error: null }); }
  single() { this.terminalCalls += 1; return Promise.resolve({ data: null, error: null }); }
}

function clientStub() {
  const query = new QueryStub();
  const client = { from: () => query } as unknown as SupabaseClient;
  return { client, query };
}

describe("BUILD 001 F5-R2 fail-closed privileged repository scope", () => {
  it("requires a non-empty tenant scope before creating a tenant bundle", () => {
    expect(() => createTenantSupabaseRepositories(undefined as never)).toThrow("TRUST_TENANT_SCOPE_REQUIRED");
    expect(() => createTenantSupabaseRepositories("   ")).toThrow("TRUST_TENANT_SCOPE_REQUIRED");
  });

  it("keeps system repositories free of tenant-canonical capabilities", () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    try {
      const system = createSystemRepositories();
      expect(system).not.toHaveProperty("projects");
      expect(system).not.toHaveProperty("assets");
      expect(system.storageMode).toBe("supabase");
    } finally {
      if (previousUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    }
  });

  it("fails closed before a database terminal operation when tenant scope is absent", async () => {
    const { client, query } = clientStub();
    await expect(new SupabaseProjectRepository(client, undefined).findById("project-b")).rejects.toThrow("TRUST_TENANT_SCOPE_REQUIRED");
    await expect(new SupabaseProjectRepository(client, undefined).create({ ownerTenantId: tenantB, name: "cross-tenant", description: null })).rejects.toThrow("TRUST_TENANT_SCOPE_REQUIRED");
    expect(query.terminalCalls).toBe(0);
    expect(query.operation).toBe("read");
  });

  it("rejects unscoped storage authority", async () => {
    const client = { storage: { from: () => ({ download: () => Promise.resolve({ data: null, error: null }) }) } } as unknown as SupabaseClient;
    await expect(new SupabaseMediaObjectStore(client).get(`tenants/${tenantB}/candidate.png`)).rejects.toThrow("TRUST_TENANT_SCOPE_REQUIRED");
  });

  it("removes the former unscoped productive factory path", () => {
    const source = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/repository-factory.ts"), "utf8");
    expect(source).toContain("createSystemRepositories");
    expect(source).not.toContain("createSupabaseRepositories()");
  });

  it("does not reuse a tenant scope across factory calls", () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    try {
      const first = createTenantSupabaseRepositories(tenantA);
      const second = createTenantSupabaseRepositories(tenantB);
      expect(first).not.toBe(second);
      expect(first.projects).not.toBe(second.projects);
    } finally {
      if (previousUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousUrl;
      if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    }
  });

  it("preserves the scoped mismatch guard", async () => {
    const { client, query } = clientStub();
    await expect(new SupabaseProjectRepository(client, tenantA).create({ ownerTenantId: tenantB, name: "cross-tenant", description: null })).rejects.toThrow("Canonical tenant ownership");
    expect(query.operation).toBe("read");
  });
});
