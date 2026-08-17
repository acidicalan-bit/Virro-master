import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SupabaseFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/supabase-field-beta-repository";
import { SupabaseCandidateAssetRepository, SupabaseProjectRepository } from "@/src/infrastructure/persistence/outcome/supabase-outcome-repositories";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";

class QueryStub {
  readonly filters: Array<[string, unknown]> = [];
  operation: "read" | "insert" | "update" = "read";
  payload: unknown;

  select() { return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { return Promise.resolve({ data: null, error: null }); }
  single() { return Promise.resolve({ data: null, error: null }); }
  insert(payload: unknown) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: unknown) { this.operation = "update"; this.payload = payload; return this; }
}

function clientStub() {
  const queries = new Map<string, QueryStub>();
  const client = {
    from(table: string) {
      const query = new QueryStub();
      queries.set(table, query);
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, queries };
}

describe("BUILD 001 F5 canonical tenant ownership", () => {
  it("uses canonical owner_tenant_id for privileged reads", async () => {
    const { client, queries } = clientStub();
    await new SupabaseProjectRepository(client, tenantA).findById("project-a");
    await new SupabaseCandidateAssetRepository(client, tenantA).findById("candidate-a");
    const projectFilters = queries.get("projects")!.filters;
    const candidateFilters = queries.get("candidate_assets")!.filters;
    expect(projectFilters).toContainEqual(["owner_tenant_id", tenantA]);
    expect(projectFilters).not.toContainEqual(["tenant_id", tenantA]);
    expect(candidateFilters).toContainEqual(["owner_tenant_id", tenantA]);
  });

  it("does not allow a scoped writer to choose a conflicting owner", async () => {
    const { client, queries } = clientStub();
    await expect(new SupabaseProjectRepository(client, tenantA).create({
      ownerTenantId: tenantB,
      name: "cross-tenant",
      description: null,
    })).rejects.toThrow("Canonical tenant ownership");
    expect(queries.get("projects")!.operation).toBe("read");
  });

  it("keeps legacy tenant metadata non-authoritative for Field Beta", async () => {
    const { client, queries } = clientStub();
    await new SupabaseFieldBetaRepository(client, tenantA).findOutcome("outcome-a");
    const filters = queries.get("field_outcomes")!.filters;
    expect(filters).toContainEqual(["owner_tenant_id", tenantA]);
    expect(filters).not.toContainEqual(["tenant_id", tenantA]);
  });

  it("rejects descendant storage access outside the canonical tenant namespace", async () => {
    const download = () => Promise.resolve({ data: null, error: null });
    const client = { storage: { from: () => ({ download }) } } as unknown as SupabaseClient;
    await expect(new SupabaseMediaObjectStore(client, "media", tenantA).get(`tenants/${tenantB}/candidate.png`)).rejects.toThrow("canonical tenant namespace");
  });
});
