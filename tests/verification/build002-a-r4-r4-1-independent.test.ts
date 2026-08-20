import { describe, expect, it } from "vitest";

import {
  BUILD002_DEFAULT_EVALUATOR_VERSION,
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  BUILD002_EVALUATOR_SCHEMA_VERSION,
  BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  BUILD002_SIGNAL_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  currentDefaultEvaluator,
  evaluateDelegationReadiness,
  evaluateReadinessValidity,
  evaluateSignalQualification,
  isDelegable,
  sameEvaluatorIdentity,
  verifyEvaluatorIdentity,
  verifyQualificationHash,
  verifyReadinessHash,
  verifySignalContentHash,
  type DelegationReadiness,
  type EvaluatorIdentity,
  type Signal,
  type SignalQualification,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const TENANT = "71000000-0000-4000-8000-000000000001";
const TRANSACTION = "72000000-0000-4000-8000-000000000002";
const BLUEPRINT_HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const POLICY_HASH = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SOURCE_HASH = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const EVALUATION = "2026-08-20T12:00:00.000Z";
const BEFORE = "2026-08-20T11:00:00.000Z";
const FUTURE = "2026-08-20T13:00:00.000Z";
const AFTER = "2026-08-20T14:00:00.000Z";

const subject = { kind: "OUTCOME_TRANSACTION" as const, ownerTenantId: TENANT, transactionId: TRANSACTION };
const current = currentDefaultEvaluator();
const legacy: EvaluatorIdentity = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: "0.1.0",
  definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0" }),
};
const badEvaluator: EvaluatorIdentity = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: BUILD002_DEFAULT_EVALUATOR_VERSION,
  definitionHash: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
};

function id(n: number): string {
  return `73000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function makeRequirement(requirementId: string, cardinality: "SINGLE_VALUED" | "MULTI_VALUED" = "SINGLE_VALUED", critical = true): SignalRequirement {
  return compileSignalRequirement({
    requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEMPORAL_CONTROL",
    critical,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality, humanReviewRequired: false },
    dependencySelectors: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true }],
    blueprintId: "74000000-0000-4000-8000-000000000001",
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: "policy.r4-independent",
    policyHash: POLICY_HASH,
    definitionSchemaVersion: BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  }, EVALUATION);
}

function makeSignal(requirement: SignalRequirement, payload: string, capturedAt: string, validUntil: string | null, number: number): Signal {
  return createSignal({
    signalId: id(number),
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload,
    source: { identity: "independent.capture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt,
    validUntil,
    dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
  });
}

function makeDependency(requirements: SignalRequirement[], signals: Signal[]) {
  return createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: requirements.map((requirement) => requirement.requirementDefinitionHash),
    signalReferences: signals.map((signal) => ({ requirementId: signal.requirementId, signalId: signal.signalId, contentHash: signal.contentHash })),
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: BLUEPRINT_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: POLICY_HASH },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: POLICY_HASH,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: SOURCE_HASH,
    contextLensHash: null,
  });
}

function qualify(requirement: SignalRequirement, signals: Signal[], dependency: ReturnType<typeof makeDependency>, evaluationTime = EVALUATION, evaluator: EvaluatorIdentity = current): SignalQualification {
  return evaluateSignalQualification({ requirement, signals, currentDependencySnapshot: dependency, evaluationTime, evaluator });
}

function readiness(requirements: SignalRequirement[], qualifications: SignalQualification[], dependency: ReturnType<typeof makeDependency>, evaluator: EvaluatorIdentity = current, conditionCodes?: string[]): DelegationReadiness {
  return evaluateDelegationReadiness({ subject, requirements, qualifications, dependencySnapshot: dependency, evaluationTime: EVALUATION, evaluator, conditionCodes, idFactory: () => id(900) });
}

function retagQualification(qualification: SignalQualification, evaluator: EvaluatorIdentity): SignalQualification {
  const material = { ...qualification, evaluator };
  const { id: _id, qualificationContentHash: _hash, ...hashMaterial } = material;
  void _id;
  void _hash;
  return { ...material, qualificationContentHash: canonicalSha256(hashMaterial) };
}

function retagReadiness(value: DelegationReadiness, evaluator: EvaluatorIdentity): DelegationReadiness {
  const material = { ...value, evaluator };
  const { id: _id, createdAt: _createdAt, readinessContentHash: _hash, ...hashMaterial } = material;
  void _id;
  void _createdAt;
  void _hash;
  return { ...material, readinessContentHash: canonicalSha256(hashMaterial) };
}

describe("independent BUILD 002-A R4 temporal causality", () => {
  it("allows past and same-instant capture, but rejects future capture", () => {
    const requirement = makeRequirement("independent.temporal.basic");
    const past = makeSignal(requirement, "past", BEFORE, null, 1);
    const same = makeSignal(requirement, "same", EVALUATION, null, 2);
    const future = makeSignal(requirement, "future", FUTURE, null, 3);
    expect(qualify(requirement, [past], makeDependency([requirement], [past])).outcome).toBe("QUALIFIED");
    expect(qualify(requirement, [same], makeDependency([requirement], [same])).outcome).toBe("QUALIFIED");
    const futureQualification = qualify(requirement, [future], makeDependency([requirement], [future]));
    expect(futureQualification.outcome).toBe("INVALID");
    expect(futureQualification.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });

  it("proves content-hash equality does not grant temporal eligibility", () => {
    const requirement = makeRequirement("independent.temporal.hash");
    const old = makeSignal(requirement, "same semantic value", BEFORE, null, 4);
    const future = makeSignal(requirement, "same semantic value", FUTURE, null, 5);
    expect(old.contentHash).toBe(future.contentHash);
    expect(verifySignalContentHash(future)).toBe(true);
    const qualification = qualify(requirement, [future], makeDependency([requirement], [future]));
    expect(qualification.outcome).toBe("INVALID");
    expect(qualification.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });

  it("distinguishes coherent, expired, equal and reversed validity windows", () => {
    const requirement = makeRequirement("independent.temporal.windows");
    const coherent = makeSignal(requirement, "coherent", BEFORE, AFTER, 6);
    const expired = makeSignal(requirement, "expired", BEFORE, EVALUATION, 7);
    const equal = makeSignal(requirement, "equal", EVALUATION, EVALUATION, 8);
    const reversed = makeSignal(requirement, "reversed", AFTER, EVALUATION, 9);
    expect(coherent.capturedAt).toBe("2026-08-20T11:00:00.000Z");
    expect(coherent.validUntil).toBe("2026-08-20T14:00:00.000Z");
    expect(qualify(requirement, [coherent], makeDependency([requirement], [coherent])).outcome).toBe("QUALIFIED");
    const expiredQualification = qualify(requirement, [expired], makeDependency([requirement], [expired]));
    expect(expiredQualification.outcome).toBe("STALE_SOURCE");
    expect(expiredQualification.reasonCode).toBe("SIGNAL_EXPIRED");
    for (const signal of [equal, reversed]) {
      const qualification = qualify(requirement, [signal], makeDependency([requirement], [signal]));
      expect(qualification.outcome).toBe("INVALID");
      expect(qualification.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
    }
  });

  it("uses temporal-window failure before future failure independent of array order", () => {
    const requirement = makeRequirement("independent.temporal.precedence", "MULTI_VALUED");
    const incoherentFuture = makeSignal(requirement, "bad window", FUTURE, EVALUATION, 10);
    const future = makeSignal(requirement, "future", FUTURE, null, 11);
    const forward = qualify(requirement, [incoherentFuture, future], makeDependency([requirement], [incoherentFuture, future]));
    const reverse = qualify(requirement, [future, incoherentFuture], makeDependency([requirement], [future, incoherentFuture]));
    expect(forward.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
    expect(reverse.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
    expect(forward.qualificationContentHash).toBe(reverse.qualificationContentHash);
  });

  it.each(["SINGLE_VALUED", "MULTI_VALUED"] as const)("rejects a future member for %s evidence", (cardinality) => {
    const requirement = makeRequirement(`independent.temporal.future.${cardinality}`, cardinality);
    const valid = makeSignal(requirement, "valid", BEFORE, null, cardinality === "SINGLE_VALUED" ? 12 : 14);
    const future = makeSignal(requirement, "future", FUTURE, null, cardinality === "SINGLE_VALUED" ? 13 : 15);
    const qualification = qualify(requirement, [valid, future], makeDependency([requirement], [valid, future]));
    expect(qualification.outcome).toBe("INVALID");
    expect(qualification.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });

  it.each(["SINGLE_VALUED", "MULTI_VALUED"] as const)("rejects an incoherent member for %s evidence", (cardinality) => {
    const requirement = makeRequirement(`independent.temporal.window.${cardinality}`, cardinality);
    const valid = makeSignal(requirement, "valid", BEFORE, null, cardinality === "SINGLE_VALUED" ? 16 : 18);
    const invalid = makeSignal(requirement, "invalid", AFTER, EVALUATION, cardinality === "SINGLE_VALUED" ? 17 : 19);
    const qualification = qualify(requirement, [valid, invalid], makeDependency([requirement], [valid, invalid]));
    expect(qualification.outcome).toBe("INVALID");
    expect(qualification.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
  });

  it("makes future critical evidence insufficient while preserving the current READY path", () => {
    const requirement = makeRequirement("independent.readiness.critical");
    const future = makeSignal(requirement, "future", FUTURE, null, 20);
    const futureDependency = makeDependency([requirement], [future]);
    const futureQualification = qualify(requirement, [future], futureDependency);
    const blocked = readiness([requirement], [futureQualification], futureDependency);
    expect(blocked.state).toBe("INSUFFICIENT_SIGNAL");
    expect(blocked.state).not.toBe("READY_WITH_CONDITIONS");
    expect(isDelegable(blocked, "CURRENT")).toBe(false);

    const present = makeSignal(requirement, "present", BEFORE, null, 21);
    const presentDependency = makeDependency([requirement], [present]);
    const presentQualification = qualify(requirement, [present], presentDependency);
    const currentReadiness = readiness([requirement], [presentQualification], presentDependency);
    expect(currentReadiness.state).toBe("READY");
    expect(isDelegable(currentReadiness, "CURRENT")).toBe(true);
  });
});

describe("independent BUILD 002-A R4-1 evaluator revocation", () => {
  it("derives and verifies the exact current evaluator identity", () => {
    const expected = {
      schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
      version: "0.2.0",
      definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.2.0" }),
    };
    expect(currentDefaultEvaluator()).toEqual(expected);
    expect(current).toEqual(expected);
    expect(verifyEvaluatorIdentity(current)).toBe(true);
  });

  it("fails closed for a syntactically valid but semantically bad evaluator hash", () => {
    expect(verifyEvaluatorIdentity(badEvaluator)).toBe(false);
    const requirement = makeRequirement("independent.evaluator.bad");
    const signal = makeSignal(requirement, "value", BEFORE, null, 30);
    const qualification = qualify(requirement, [signal], makeDependency([requirement], [signal]), EVALUATION, badEvaluator);
    expect(qualification.outcome).toBe("INVALID");
    expect(qualification.reasonCode).toBe("INVALID_EVALUATOR_IDENTITY");
  });

  it("revokes a hash-valid legacy qualification from current readiness", () => {
    const requirement = makeRequirement("independent.evaluator.legacy");
    const signal = makeSignal(requirement, "value", BEFORE, null, 31);
    const dependency = makeDependency([requirement], [signal]);
    const legacyQualification = retagQualification(qualify(requirement, [signal], dependency), legacy);
    expect(verifyQualificationHash(legacyQualification)).toBe(true);
    const result = readiness([requirement], [legacyQualification], dependency);
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.state).not.toBe("READY");
    expect(result.state).not.toBe("READY_WITH_CONDITIONS");
    expect(result.blockingCodes).toContain("QUALIFICATION_EVALUATOR_MISMATCH");
  });

  it("does not ignore an optional legacy qualification", () => {
    const critical = makeRequirement("independent.optional.critical");
    const optional = makeRequirement("independent.optional.legacy", "SINGLE_VALUED", false);
    const criticalSignal = makeSignal(critical, "critical", BEFORE, null, 32);
    const optionalSignal = makeSignal(optional, "optional", BEFORE, null, 33);
    const dependency = makeDependency([critical, optional], [criticalSignal, optionalSignal]);
    const criticalQualification = qualify(critical, [criticalSignal], dependency);
    const optionalLegacy = retagQualification(qualify(optional, [optionalSignal], dependency), legacy);
    const result = readiness([critical, optional], [criticalQualification, optionalLegacy], dependency);
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("QUALIFICATION_EVALUATOR_MISMATCH");
  });

  it("fails closed for a mixed three-requirement evaluator set independent of order", () => {
    const requirements = [
      makeRequirement("independent.mixed.a"),
      makeRequirement("independent.mixed.b"),
      makeRequirement("independent.mixed.c"),
    ];
    const signals = requirements.map((requirement, index) => makeSignal(requirement, requirement.requirementId, BEFORE, null, 40 + index));
    const dependency = makeDependency(requirements, signals);
    const qualifications = requirements.map((requirement, index) => {
      const value = qualify(requirement, [signals[index]], dependency);
      return index === 2 ? retagQualification(value, legacy) : value;
    });
    const forward = readiness(requirements, qualifications, dependency);
    const reverse = readiness([...requirements].reverse(), [...qualifications].reverse(), dependency);
    expect(forward.state).toBe("INSUFFICIENT_SIGNAL");
    expect(reverse.state).toBe("INSUFFICIENT_SIGNAL");
    expect(forward.blockingCodes).toEqual(reverse.blockingCodes);
    expect(forward.readinessContentHash).toBe(reverse.readinessContentHash);
  });

  it("separates bad qualification artifact integrity from evaluator authority", () => {
    const requirement = makeRequirement("independent.evaluator.bad-qualification");
    const signal = makeSignal(requirement, "value", BEFORE, null, 50);
    const dependency = makeDependency([requirement], [signal]);
    const badQualification = retagQualification(qualify(requirement, [signal], dependency), badEvaluator);
    expect(verifyQualificationHash(badQualification)).toBe(true);
    expect(sameEvaluatorIdentity(badQualification.evaluator, current)).toBe(false);
    const result = readiness([requirement], [badQualification], dependency);
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
  });

  it("marks legacy readiness stale by default but current under an explicit historical lens", () => {
    const requirement = makeRequirement("independent.readiness.legacy");
    const signal = makeSignal(requirement, "value", BEFORE, null, 51);
    const dependency = makeDependency([requirement], [signal]);
    const qualification = qualify(requirement, [signal], dependency);
    const legacyReadiness = retagReadiness(readiness([requirement], [qualification], dependency), legacy);
    expect(verifyReadinessHash(legacyReadiness)).toBe(true);
    expect(evaluateReadinessValidity(legacyReadiness, dependency, EVALUATION)).toBe("STALE");
    expect(isDelegable(legacyReadiness, "STALE")).toBe(false);
    expect(evaluateReadinessValidity(legacyReadiness, dependency, EVALUATION, legacy)).toBe("CURRENT");
    expect(isDelegable(legacyReadiness, "CURRENT")).toBe(false);
  });

  it("keeps current readiness current and rejects bad evaluator readiness authority", () => {
    const requirement = makeRequirement("independent.readiness.current");
    const signal = makeSignal(requirement, "value", BEFORE, null, 52);
    const dependency = makeDependency([requirement], [signal]);
    const qualification = qualify(requirement, [signal], dependency);
    const currentReadiness = readiness([requirement], [qualification], dependency);
    expect(evaluateReadinessValidity(currentReadiness, dependency, EVALUATION)).toBe("CURRENT");
    expect(isDelegable(currentReadiness, "CURRENT")).toBe(true);
    const badReadiness = retagReadiness(currentReadiness, badEvaluator);
    expect(verifyReadinessHash(badReadiness)).toBe(true);
    expect(evaluateReadinessValidity(badReadiness, dependency, EVALUATION)).toBe("STALE");
    expect(isDelegable(badReadiness, "CURRENT")).toBe(false);
  });

  it("allows explicit legacy replay only as non-delegable historical output", () => {
    const requirement = makeRequirement("independent.replay");
    const signal = makeSignal(requirement, "value", BEFORE, null, 53);
    const dependency = makeDependency([requirement], [signal]);
    const replayQualification = qualify(requirement, [signal], dependency, EVALUATION, legacy);
    const replayReadiness = readiness([requirement], [replayQualification], dependency, legacy);
    expect(replayQualification.outcome).toBe("QUALIFIED");
    expect(replayReadiness.state).toBe("READY");
    expect(evaluateReadinessValidity(replayReadiness, dependency, EVALUATION)).toBe("STALE");
    expect(isDelegable(replayReadiness, "STALE")).toBe(false);
  });
});
