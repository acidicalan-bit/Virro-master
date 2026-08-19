import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";
import { SupabaseRequirementCatalogRepository } from "@/src/infrastructure/persistence/outcome/supabase-requirement-catalog-repository";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260819140000_build_002_c0_requirement_catalog.sql");

describe("BUILD002-C0-B persistent requirement catalog contract", () => {
  it("defines two global immutable catalogs with exact relational address", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create table if not exists public.outcome_blueprints");
    expect(sql).toContain("create table if not exists public.outcome_requirement_profiles");
    expect(sql).toContain("primary key (id, version)");
    expect(sql).toContain("unique (id, version, hash)");
    expect(sql).toContain("foreign key (blueprint_id, blueprint_version, blueprint_hash)");
    expect(sql).toContain("references public.outcome_blueprints(id, version, hash)");
  });

  it("uses server-owned RPCs and denies direct catalog writes", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql.match(/security definer/g)?.length).toBe(2);
    expect(sql).toContain("build002_publish_outcome_blueprint");
    expect(sql).toContain("build002_publish_outcome_requirement_profile");
    expect(sql).toContain("revoke all on table public.outcome_blueprints from public, anon, authenticated, service_role");
    expect(sql).toContain("grant select on table public.outcome_blueprints to service_role");
    expect(sql).toContain("grant execute on function public.build002_publish_outcome_blueprint(jsonb) to service_role");
    expect(sql).toContain("grant execute on function public.build002_publish_outcome_requirement_profile(jsonb) to service_role");
  });

  it("enforces lineage, publication status, null policy and immutable triggers in SQL", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("BUILD002_BLUEPRINT_INVALID_VERSION_CHAIN");
    expect(sql).toContain("BUILD002_PROFILE_INVALID_VERSION_CHAIN");
    expect(sql).toContain("BUILD002_PROFILE_POLICY_MUST_BE_NULL");
    expect(sql).toContain("before update or delete on public.outcome_blueprints");
    expect(sql).toContain("before update or delete on public.outcome_requirement_profiles");
    expect(sql).toContain("BUILD002_CATALOG_IMMUTABLE_%");
  });

  it("keeps C0-B server-only and outside tenant or HTTP authority", () => {
    const repositorySource = readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-requirement-catalog-repository.ts"), "utf8");
    expect(repositorySource).toContain('import "server-only"');
    expect(repositorySource).not.toContain("ownerTenantId");
    expect(repositorySource).not.toContain("createUserScopedSupabaseClient");
    expect(repositorySource).toContain("verifyOutcomeBlueprintHash");
    expect(repositorySource).toContain("verifyOutcomeRequirementProfileHash");
    expect(repositorySource).toContain("verifyOutcomeRequirementProfileBlueprintBinding");
    expect(repositorySource).toContain('from("outcome_blueprints")');
    expect(repositorySource).toContain('from("outcome_requirement_profiles")');
  });

  it("rejects stale domain hashes before any RPC", async () => {
    const rpc = async () => ({ data: null, error: null });
    const client = { rpc } as never;
    const repository = new SupabaseRequirementCatalogRepository(client);
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-19T12:00:00.000Z");
    await expect(repository.publishBlueprint({ ...blueprint, outcomeType: "MUTATED" })).rejects.toThrow("DOMAIN_HASH_INVALID");
  });

  it("requires a persisted Blueprint for Profile publication", async () => {
    let rpcCalls = 0;
    const client = {
      rpc: async () => { rpcCalls += 1; return { data: null, error: null }; },
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
    } as never;
    const repository = new SupabaseRequirementCatalogRepository(client);
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-19T12:00:00.000Z");
    const profile = publishOutcomeRequirementProfile({
      schemaVersion: "outcome-requirement-profile-v0.1",
      id: "80000000-0000-4000-8000-000000000099",
      version: 1,
      previousVersionHash: null,
      blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
      policy: null,
      requirements: [{
        requirementId: "catalog.minimum",
        semanticType: "text",
        critical: true,
        acceptedProvenance: ["OBSERVED"],
        qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
        dependencySelectors: [],
      }],
    }, "2026-08-19T12:00:00.000Z", blueprint);
    await expect(repository.publishRequirementProfile(profile)).rejects.toThrow("PERSISTED_BLUEPRINT_MISMATCH");
    expect(rpcCalls).toBe(0);
  });
});
