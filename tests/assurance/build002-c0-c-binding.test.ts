import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createOutcomeTransactionRequirementBinding,
  publishOutcomeTransactionRequirementBinding,
  verifyOutcomeTransactionRequirementBindingHash,
} from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260819150000_build_002_c0_c_transaction_requirement_binding.sql");
const repositoryPath = resolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-transaction-requirement-binding-repository.ts");

const definition = {
  schemaVersion: "outcome-transaction-requirement-binding-v0.1" as const,
  ownerTenantId: "10000000-0000-4000-8000-000000000001",
  outcomeTransactionId: "20000000-0000-4000-8000-000000000001",
  blueprint: { id: "30000000-0000-4000-8000-000000000001", version: 1, hash: "a".repeat(64) },
  requirementProfile: { id: "40000000-0000-4000-8000-000000000001", version: 1, hash: "b".repeat(64) },
  policy: { id: null, hash: null },
};

describe("BUILD002-C0-C transaction requirement binding contract", () => {
  it("binds exact tenant, transaction, Blueprint and Profile addresses", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("primary key (owner_tenant_id, outcome_transaction_id)");
    expect(sql).toContain("references public.outcome_transactions(owner_tenant_id, id) on delete restrict");
    expect(sql).toContain("references public.outcome_blueprints(id, version, hash) on delete restrict");
    expect(sql).toContain("references public.outcome_requirement_profiles(id, version, hash) on delete restrict");
    expect(sql).toContain("build002_binding_tenant_transaction_guard");
    expect(sql).toContain("build002_binding_profile_blueprint_guard");
  });

  it("has one immutable RPC write boundary and no direct writes", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql.match(/security definer/g)?.length).toBe(1);
    expect(sql).toContain("build002_bind_outcome_transaction_requirements(jsonb)");
    expect(sql).toContain("revoke all on table public.outcome_transaction_requirement_bindings from public, anon, authenticated, service_role");
    expect(sql).toContain("grant select on table public.outcome_transaction_requirement_bindings to service_role");
    expect(sql).toContain("grant execute on function public.build002_bind_outcome_transaction_requirements(jsonb) to service_role");
    expect(sql).toContain("before update or delete on public.outcome_transaction_requirement_bindings");
    expect(sql).toContain("BUILD002_BINDING_IMMUTABLE_%");
  });

  it("uses a canonical hash that excludes boundAt metadata", () => {
    const first = publishOutcomeTransactionRequirementBinding(definition, "2026-08-19T12:00:00.000Z");
    const second = publishOutcomeTransactionRequirementBinding(definition, "2026-08-19T13:00:00.000Z");
    expect(first.bindingHash).toBe(second.bindingHash);
    expect(verifyOutcomeTransactionRequirementBindingHash(first)).toBe(true);
    expect(verifyOutcomeTransactionRequirementBindingHash({ ...first, blueprint: { ...first.blueprint, hash: "c".repeat(64) } })).toBe(false);
  });

  it("derives references only from published, semantically verified catalog objects", () => {
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-19T12:00:00.000Z");
    const profile = publishOutcomeRequirementProfile({
      schemaVersion: "outcome-requirement-profile-v0.1",
      id: "40000000-0000-4000-8000-000000000001",
      version: 1,
      previousVersionHash: null,
      blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash },
      policy: null,
      requirements: [{
        requirementId: "binding.minimum",
        semanticType: "text",
        critical: true,
        acceptedProvenance: ["OBSERVED"],
        qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
        dependencySelectors: [],
      }],
    }, "2026-08-19T12:00:00.000Z", blueprint);
    const binding = createOutcomeTransactionRequirementBinding({
      ownerTenantId: definition.ownerTenantId,
      outcomeTransactionId: definition.outcomeTransactionId,
      blueprint,
      requirementProfile: profile,
      boundAt: "2026-08-19T12:00:00.000Z",
    });
    expect(binding.blueprint.hash).toBe(blueprint.hash);
    expect(binding.requirementProfile.hash).toBe(profile.hash);
    expect(binding.policy).toEqual({ id: null, hash: null });
  });

  it("keeps the repository server-only and revalidates C0-B authority", () => {
    const source = readFileSync(repositoryPath, "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain("TRUST_TENANT_SCOPE_REQUIRED");
    expect(source).toContain("getRequirementProfile");
    expect(source).toContain("getBlueprint");
    expect(source).toContain("verifyOutcomeTransactionRequirementBindingHash");
    expect(source).not.toContain("update(");
    expect(source).not.toContain("delete(");
    expect(source).not.toContain("listAll");
  });

  it("does not introduce later-phase orchestration", () => {
    const docs = readFileSync(resolve(process.cwd(), "docs/builds/build-002/002-C0-C/00_TRANSACTION_REQUIREMENT_BINDING.md"), "utf8");
    expect(docs).toContain("no HTTP route");
    expect(docs).toContain("readiness evaluation");
    expect(docs).toContain("signal ingestion");
    expect(docs).toContain("executor");
  });
});
