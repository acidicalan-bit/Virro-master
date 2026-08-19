import { describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { publishOutcomeRequirementProfile, type OutcomeRequirementProfile } from "@/src/domain/outcome/specification/outcome-requirement-profile";
import { SupabaseRequirementCatalogRepository } from "@/src/infrastructure/persistence/outcome/supabase-requirement-catalog-repository";

const at = "2026-08-19T12:00:00.000Z";

function blueprint(id = "80000000-0000-4000-8000-000000000001", version = 1, previousVersionHash: string | null = null): OutcomeBlueprint {
  return publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ id, version, previousVersionHash }), at);
}

function profile(bp: OutcomeBlueprint, id = "80000000-0000-4000-8000-000000000101", version = 1, previousVersionHash: string | null = null): OutcomeRequirementProfile {
  return publishOutcomeRequirementProfile({
    schemaVersion: "outcome-requirement-profile-v0.1", id, version, previousVersionHash,
    blueprint: { id: bp.id, version: bp.version, hash: bp.hash }, policy: null,
    requirements: [{ requirementId: "catalog.minimum", semanticType: "text", critical: true, acceptedProvenance: ["OBSERVED"], qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false }, dependencySelectors: [] }],
  }, at, bp);
}

function bpRow(value: OutcomeBlueprint, hash = value.hash): Record<string, unknown> {
  const { hash: ignored, status, publishedAt, ...definition } = value;
  void ignored;
  return { definition, hash, status, published_at: publishedAt };
}

function profileRow(value: OutcomeRequirementProfile, hash = value.hash): Record<string, unknown> {
  const { hash: ignored, status, publishedAt, ...definition } = value;
  void ignored;
  return { definition, hash, status, published_at: publishedAt };
}

function fakeClient(rows: Record<string, Record<string, unknown> | null>, rpcResult: unknown = { data: "ok", error: null }) {
  let rpcCalls = 0;
  const client = {
    rpc: async () => { rpcCalls += 1; return rpcResult; },
    from: (table: string) => {
      const result = rows[table] ?? null;
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: result, error: null }),
      };
      return builder;
    },
  } as never;
  return { client, calls: () => rpcCalls };
}

describe("independent C0-B R3 repository authority boundary", () => {
  it("requires persisted Blueprint authority and blocks stale domain hashes before RPC", async () => {
    const bp = blueprint();
    const p = profile(bp);
    const absent = fakeClient({ outcome_blueprints: null });
    const repoAbsent = new SupabaseRequirementCatalogRepository(absent.client);
    await expect(repoAbsent.publishRequirementProfile(p)).rejects.toThrow("BUILD002_PROFILE_PERSISTED_BLUEPRINT_MISMATCH");
    expect(absent.calls()).toBe(0);

    const staleBp = { ...bp, outcomeType: "MUTATED" };
    const staleBpClient = fakeClient({});
    await expect(new SupabaseRequirementCatalogRepository(staleBpClient.client).publishBlueprint(staleBp)).rejects.toThrow("BUILD002_BLUEPRINT_DOMAIN_HASH_INVALID");
    expect(staleBpClient.calls()).toBe(0);

    const staleProfile = { ...p, requirements: [{ ...p.requirements[0], critical: false }] };
    const staleProfileClient = fakeClient({ outcome_blueprints: bpRow(bp) });
    await expect(new SupabaseRequirementCatalogRepository(staleProfileClient.client).publishRequirementProfile(staleProfile)).rejects.toThrow("BUILD002_PROFILE_DOMAIN_HASH_INVALID");
    expect(staleProfileClient.calls()).toBe(0);
  });

  it("rejects lookup address mismatches independently of semantic validity", async () => {
    const wanted = blueprint("80000000-0000-4000-8000-000000000002");
    const foreign = blueprint("80000000-0000-4000-8000-000000000003");
    const wrongVersion = blueprint(wanted.id, 2, wanted.hash);
    const foreignClient = fakeClient({ outcome_blueprints: bpRow(foreign) });
    await expect(new SupabaseRequirementCatalogRepository(foreignClient.client).getBlueprint(wanted.id, 1)).rejects.toThrow("BUILD002_BLUEPRINT_PERSISTED_ADDRESS_MISMATCH");
    const versionClient = fakeClient({ outcome_blueprints: bpRow(wrongVersion) });
    await expect(new SupabaseRequirementCatalogRepository(versionClient.client).getBlueprint(wanted.id, 1)).rejects.toThrow("BUILD002_BLUEPRINT_PERSISTED_ADDRESS_MISMATCH");

    const wantedProfile = profile(wanted, "80000000-0000-4000-8000-000000000102");
    const foreignProfile = profile(wanted, "80000000-0000-4000-8000-000000000103");
    const foreignProfileClient = fakeClient({ outcome_requirement_profiles: profileRow(foreignProfile), outcome_blueprints: bpRow(wanted) });
    await expect(new SupabaseRequirementCatalogRepository(foreignProfileClient.client).getRequirementProfile(wantedProfile.id, 1)).rejects.toThrow("BUILD002_PROFILE_PERSISTED_ADDRESS_MISMATCH");
  });

  it("rejects semantic tampering and exact Profile-to-Blueprint drift", async () => {
    const bp = blueprint("80000000-0000-4000-8000-000000000004");
    const p = profile(bp, "80000000-0000-4000-8000-000000000104");
    const bpTampered = fakeClient({ outcome_blueprints: bpRow(bp, "a".repeat(64)) });
    await expect(new SupabaseRequirementCatalogRepository(bpTampered.client).getBlueprint(bp.id, bp.version)).rejects.toThrow("BUILD002_BLUEPRINT_PERSISTED_INVALID");
    const pTampered = fakeClient({ outcome_requirement_profiles: profileRow(p, "b".repeat(64)), outcome_blueprints: bpRow(bp) });
    await expect(new SupabaseRequirementCatalogRepository(pTampered.client).getRequirementProfile(p.id, p.version)).rejects.toThrow("BUILD002_PROFILE_PERSISTED_INVALID");

    const otherBp = blueprint("80000000-0000-4000-8000-000000000005");
    const boundToOther = profile(otherBp, "80000000-0000-4000-8000-000000000105");
    const bindingClient = fakeClient({ outcome_requirement_profiles: profileRow(boundToOther), outcome_blueprints: bpRow(bp) });
    await expect(new SupabaseRequirementCatalogRepository(bindingClient.client).getRequirementProfile(boundToOther.id, 1)).rejects.toThrow("BUILD002_BLUEPRINT_PERSISTED_ADDRESS_MISMATCH");
  });
});
