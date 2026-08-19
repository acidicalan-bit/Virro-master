import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import {
  compileSignalRequirements,
  InMemoryOutcomeRequirementProfileRegistry,
  publishOutcomeRequirementProfile,
  verifyOutcomeRequirementProfileBlueprintBinding,
  verifyOutcomeRequirementProfileHash,
  type OutcomeRequirementProfileDefinition,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";
import { publishOutcomeBlueprint, verifyOutcomeBlueprintHash, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { verifySignalRequirementHash } from "@/src/domain/outcome/signal-readiness";

const PUBLISHED_AT = "2026-08-19T12:00:00.000Z";
const CREATED_AT = "2026-08-19T12:01:00.000Z";
const PROFILE_ID = "80000000-0000-4000-8000-000000000001";

function blueprint(): OutcomeBlueprint {
  return publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), PUBLISHED_AT);
}

function definition(overrides: Partial<OutcomeRequirementProfileDefinition> = {}, current = blueprint()): OutcomeRequirementProfileDefinition {
  return {
    schemaVersion: "outcome-requirement-profile-v0.1",
    id: PROFILE_ID,
    version: 1,
    previousVersionHash: null,
    blueprint: { id: current.id, version: current.version, hash: current.hash },
    policy: null,
    requirements: [
      {
        requirementId: "context.intent",
        semanticType: "text",
        critical: true,
        acceptedProvenance: ["CUSTOMER_STATED", "INFERRED"],
        qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
        dependencySelectors: [{ identity: "transaction.semantic", required: true }, { identity: "blueprint", required: true }],
      },
      {
        requirementId: "source.version",
        semanticType: "hash",
        critical: true,
        acceptedProvenance: ["OBSERVED"],
        qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
        dependencySelectors: [{ identity: "asset.version", required: true }],
      },
      {
        requirementId: "review.note",
        semanticType: "text",
        critical: false,
        acceptedProvenance: ["APPROVED"],
        qualificationRule: { version: "1", cardinality: "MULTI_VALUED", humanReviewRequired: true },
        dependencySelectors: [],
      },
    ],
    ...overrides,
  };
}

function published(overrides: Partial<OutcomeRequirementProfileDefinition> = {}, current = blueprint()) {
  const input = definition({ ...overrides, blueprint: overrides.blueprint ?? { id: current.id, version: current.version, hash: current.hash } }, current);
  return publishOutcomeRequirementProfile(input, PUBLISHED_AT, current);
}

describe("BUILD002-C0-A OutcomeRequirementProfile", () => {
  it("publishes an immutable, valid profile with normalized requirements", () => {
    const profile = published();
    expect(profile.status).toBe("PUBLISHED");
    expect(profile.requirements.map((item) => item.requirementId)).toEqual(["context.intent", "review.note", "source.version"]);
    expect(profile.requirements[0].acceptedProvenance).toEqual(["CUSTOMER_STATED", "INFERRED"]);
    expect(Object.isFrozen(profile)).toBe(true);
    expect(verifyOutcomeRequirementProfileHash(profile)).toBe(true);
    expect(verifyOutcomeRequirementProfileBlueprintBinding(profile, blueprint())).toBe(true);
  });

  it("makes semantic hash independent of requirement, provenance and selector order", () => {
    const base = definition();
    const permuted = definition({ requirements: [...base.requirements].reverse().map((item) => ({ ...item, acceptedProvenance: [...item.acceptedProvenance].reverse(), dependencySelectors: [...item.dependencySelectors].reverse() })) });
    expect(published().hash).toBe(publishOutcomeRequirementProfile(permuted, PUBLISHED_AT, blueprint()).hash);
    expect(published().requirements[0].dependencySelectors).toEqual([{ identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }]);
  });

  it("rejects duplicate requirements and conflicting dependency selectors", () => {
    const base = definition();
    expect(() => published({ requirements: [base.requirements[0], base.requirements[0]] })).toThrow("DUPLICATE_REQUIREMENT_ID");
    expect(() => published({ requirements: [{ ...base.requirements[0], dependencySelectors: [{ identity: "blueprint", required: true }, { identity: "blueprint", required: false }] }, base.requirements[1], base.requirements[2]] })).toThrow("CONFLICTING_SELECTOR");
    expect(() => published({ requirements: [{ ...base.requirements[0], acceptedProvenance: [] }, base.requirements[1], base.requirements[2]] })).toThrow();
  });

  it("detects mutations while ignoring status and publication timestamp", () => {
    const profile = published();
    expect(verifyOutcomeRequirementProfileHash({ ...profile, requirements: profile.requirements.map((item) => item.requirementId === "review.note" ? { ...item, critical: true } : item) })).toBe(false);
    expect(verifyOutcomeRequirementProfileHash({ ...profile, blueprint: { ...profile.blueprint, hash: "f".repeat(64) } })).toBe(false);
    expect(verifyOutcomeRequirementProfileHash({ ...profile, policy: { id: "policy-v1", hash: "a".repeat(64) } })).toBe(false);
    expect(verifyOutcomeRequirementProfileHash({ ...profile, previousVersionHash: "b".repeat(64) })).toBe(false);
    expect(verifyOutcomeRequirementProfileHash({ ...profile, publishedAt: "2026-08-20T12:00:00.000Z", status: "RETIRED" })).toBe(true);
  });

  it("enforces the immutable profile version chain", () => {
    const registry = new InMemoryOutcomeRequirementProfileRegistry();
    const first = registry.publish(definition(), PUBLISHED_AT, blueprint());
    const second = registry.publish(definition({ version: 2, previousVersionHash: first.hash }), PUBLISHED_AT, blueprint());
    expect(second.version).toBe(2);
    expect(registry.get(PROFILE_ID, 1)?.hash).toBe(first.hash);
    expect(() => registry.publish(definition({ version: 1, previousVersionHash: "a".repeat(64) }), PUBLISHED_AT, blueprint())).toThrow();
    expect(() => registry.publish(definition({ version: 2, previousVersionHash: "c".repeat(64) }), PUBLISHED_AT, blueprint())).toThrow("immutable");
    expect(() => registry.publish(definition({ version: 3, previousVersionHash: "d".repeat(64) }), PUBLISHED_AT, blueprint())).toThrow("INVALID_VERSION_CHAIN");
  });

  it("compiles exact BUILD002-A SignalRequirements without TaskSpec authority", () => {
    const profile = published();
    const compiled = compileSignalRequirements(profile, CREATED_AT, blueprint());
    expect(compiled).toHaveLength(3);
    expect(compiled.map((item) => item.requirementId)).toEqual(["context.intent", "review.note", "source.version"]);
    expect(compiled.every((item) => item.subjectKind === "OUTCOME_TRANSACTION")).toBe(true);
    expect(compiled.every((item) => item.blueprintId === profile.blueprint.id && item.blueprintVersion === profile.blueprint.version && item.blueprintHash === profile.blueprint.hash)).toBe(true);
    expect(compiled.every((item) => item.policyId === null && item.policyHash === null)).toBe(true);
    expect(compiled[0].critical).toBe(true);
    expect(compiled[0].acceptedProvenance).toEqual(["CUSTOMER_STATED", "INFERRED"]);
    expect(compiled[1].qualificationRule).toEqual({ version: "1", cardinality: "MULTI_VALUED", humanReviewRequired: true });
    expect(compiled[0].dependencySelectors).toEqual([{ identity: "blueprint", required: true }, { identity: "transaction.semantic", required: true }]);
    expect(compiled.every(verifySignalRequirementHash)).toBe(true);
    const source = readFileSync(resolve(process.cwd(), "src/domain/outcome/specification/outcome-requirement-profile.ts"), "utf8");
    expect(source).not.toContain("TaskSpec");
  });

  it("keeps definition hashes independent of createdAt and compiler permutations", () => {
    const profile = published();
    const first = compileSignalRequirements(profile, "2026-08-19T12:01:00.000Z");
    const second = compileSignalRequirements(profile, "2026-08-20T12:01:00.000Z");
    expect(first.map((item) => item.requirementDefinitionHash)).toEqual(second.map((item) => item.requirementDefinitionHash));
    const reversed = publishOutcomeRequirementProfile(definition({ requirements: [...profile.requirements].reverse() }), PUBLISHED_AT, blueprint());
    expect(compileSignalRequirements(reversed, CREATED_AT).map((item) => item.requirementDefinitionHash)).toEqual(first.map((item) => item.requirementDefinitionHash));
  });

  it("fails closed for unpublished or hash-invalid profiles", () => {
    const profile = published();
    expect(() => compileSignalRequirements({ ...profile, status: "RETIRED" }, CREATED_AT)).toThrow("NOT_PUBLISHED");
    expect(() => compileSignalRequirements({ ...profile, hash: "e".repeat(64) }, CREATED_AT)).toThrow("HASH_INVALID");
    expect(() => compileSignalRequirements({ ...profile, schemaVersion: "unsupported-v9" as never }, CREATED_AT)).toThrow();
  });

  it("rejects invalid, retired, and mismatched Blueprint bindings", () => {
    const current = blueprint();
    const other = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition({ outcomeType: "OTHER_OUTCOME" }), PUBLISHED_AT);
    expect(() => published({ blueprint: { id: other.id, version: other.version, hash: other.hash } }, current)).toThrow("BLUEPRINT_MISMATCH");
    expect(verifyOutcomeRequirementProfileBlueprintBinding(published(), { ...current, hash: "0".repeat(64) })).toBe(false);
    expect(verifyOutcomeRequirementProfileBlueprintBinding(published(), { ...current, status: "RETIRED" })).toBe(false);
    expect(verifyOutcomeBlueprintHash(current)).toBe(true);
  });

  it("preserves nullable policy and rejects malformed profile input", () => {
    const profile = published({ policy: { id: "policy-v1", hash: "a".repeat(64) } });
    expect(profile.policy).toEqual({ id: "policy-v1", hash: "a".repeat(64) });
    expect(compileSignalRequirements(profile, CREATED_AT).every((item) => item.policyId === "policy-v1" && item.policyHash === "a".repeat(64))).toBe(true);
    expect(() => published({ requirements: [] })).toThrow();
    expect(() => published({ blueprint: { id: "not-a-uuid" as never, version: 1, hash: "a".repeat(64) } })).toThrow();
  });

  it("does not alter OutcomeBlueprint, BUILD002-A, TaskSpec or BUILD002-B files", () => {
    const profileSource = readFileSync(resolve(process.cwd(), "src/domain/outcome/specification/outcome-requirement-profile.ts"), "utf8");
    expect(profileSource).toContain("compileSignalRequirement");
    expect(profileSource).not.toContain("from \"@/src/domain/outcome/specification/task-spec\"");
    expect(profileSource).not.toContain("inputRequirements");
  });
});
