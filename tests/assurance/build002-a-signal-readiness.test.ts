import { describe, expect, it } from "vitest";

import {
  BUILD002_SIGNAL_SCHEMA_VERSION,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  BUILD002_EVALUATOR_SCHEMA_VERSION,
  BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEFAULT_EVALUATOR_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  evaluateDelegationReadiness,
  evaluateReadinessValidity,
  evaluateSignalQualification,
  isDelegable,
  parseInstant,
  verifyQualificationHash,
  verifySignalContentHash,
  verifyReadinessHash,
  verifyEvaluatorIdentity,
  sameEvaluatorIdentity,
  type DelegationReadiness,
  type EvaluatorIdentity,
  type SignalQualification,
  type DependencySnapshot,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";

const H_SOURCE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const H_OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const H_BLUEPRINT = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const H_POLICY = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const tenantId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000002";
const subject = { kind: "OUTCOME_TRANSACTION" as const, ownerTenantId: tenantId, transactionId };
const evaluator = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: BUILD002_DEFAULT_EVALUATOR_VERSION,
  definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION }),
};
const at = "2026-08-18T12:00:00.000Z";
const after = "2026-08-18T13:00:00.000Z";

function requirement(idOrOverrides: string | Partial<Parameters<typeof compileSignalRequirement>[0]> = "source.intent", overrides: Partial<Parameters<typeof compileSignalRequirement>[0]> = {}): SignalRequirement {
  const requirementId = typeof idOrOverrides === "string" ? idOrOverrides : "source.intent";
  const effectiveOverrides = typeof idOrOverrides === "string" ? overrides : idOrOverrides;
  return compileSignalRequirement({
    requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "INTENT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [{ identity: "asset.version", required: true }],
    blueprintId: "30000000-0000-4000-8000-000000000003",
    blueprintVersion: 1,
    blueprintHash: H_BLUEPRINT,
    policyId: "policy.default",
    policyHash: H_POLICY,
    definitionSchemaVersion: BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
    ...effectiveOverrides,
  }, at);
}

function signal(req: SignalRequirement, payload: unknown, dependencyHash = H_SOURCE, id = "40000000-0000-4000-8000-000000000004", provenance: "OBSERVED" | "CUSTOMER_STATED" = "OBSERVED", validUntil: string | null = null): Signal {
  return createSignal({
    signalId: id,
    ownerTenantId: tenantId,
    transactionId,
    requirementId: req.requirementId,
    payload,
    source: { identity: "capture.camera", version: "1", hash: H_SOURCE },
    provenance,
    capturedAt: at,
    validUntil,
    dependency: { identity: "asset.version", hash: dependencyHash },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
  });
}

function signalAt(req: SignalRequirement, payload: unknown, capturedAt: string, validUntil: string | null = null, id = "40000000-0000-4000-8000-000000000004"): Signal {
  return createSignal({
    signalId: id,
    ownerTenantId: tenantId,
    transactionId,
    requirementId: req.requirementId,
    payload,
    source: { identity: "capture.camera", version: "1", hash: H_SOURCE },
    provenance: "OBSERVED",
    capturedAt,
    validUntil,
    dependency: { identity: "asset.version", hash: H_SOURCE },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
  });
}

function dependency(signals: Signal[] = [], sourceHash: string | null = H_SOURCE): DependencySnapshot {
  return createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: tenantId,
    transactionId,
    requirementDefinitionHashes: [],
    signalReferences: signals.map((item) => ({ requirementId: item.requirementId, signalId: item.signalId, contentHash: item.contentHash })),
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: sourceHash ?? H_SOURCE },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY },
    ],
    blueprintHash: H_BLUEPRINT,
    policyHash: H_POLICY,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: sourceHash,
    contextLensHash: null,
  });
}

function qualify(req: SignalRequirement, signals: Signal[], current = dependency(signals), evaluationTime = at) {
  const bound = current.requirementDefinitionHashes.includes(req.requirementDefinitionHash)
    ? current
    : (() => { const { dependencySnapshotHash: _hash, ...input } = current; void _hash; return createDependencySnapshot({ ...input, requirementDefinitionHashes: [...current.requirementDefinitionHashes, req.requirementDefinitionHash] }); })();
  return evaluateSignalQualification({ requirement: req, signals, currentDependencySnapshot: bound, evaluator, evaluationTime, idFactory: () => "50000000-0000-4000-8000-000000000005" });
}

function ready(req: SignalRequirement, qualification: ReturnType<typeof qualify>, current = dependency([]), extras: Partial<Parameters<typeof evaluateDelegationReadiness>[0]> = {}) {
  const bound = current.requirementDefinitionHashes.includes(req.requirementDefinitionHash)
    ? current
    : (() => { const { dependencySnapshotHash: _hash, ...input } = current; void _hash; return createDependencySnapshot({ ...input, requirementDefinitionHashes: [...current.requirementDefinitionHashes, req.requirementDefinitionHash] }); })();
  return evaluateDelegationReadiness({ subject, requirements: [req], qualifications: [qualification], dependencySnapshot: bound, evaluator, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000006", ...extras });
}

function boundDependency(requirements: SignalRequirement[], signals: Signal[] = [], overrides: Record<string, unknown> = {}) {
  const base = dependency(signals);
  const { dependencySnapshotHash: _hash, ...input } = base;
  void _hash;
  return createDependencySnapshot({ ...input, requirementDefinitionHashes: requirements.map((requirement) => requirement.requirementDefinitionHash), ...overrides } as never);
}

const legacyEvaluator: EvaluatorIdentity = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: "0.1.0",
  definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "0.1.0" }),
};

const badEvaluator: EvaluatorIdentity = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: BUILD002_DEFAULT_EVALUATOR_VERSION,
  definitionHash: H_OTHER,
};

function withQualificationEvaluator(qualification: SignalQualification, nextEvaluator: EvaluatorIdentity): SignalQualification {
  const material = { ...qualification, evaluator: nextEvaluator };
  const { id: _id, qualificationContentHash: _hash, ...hashMaterial } = material;
  void _id;
  void _hash;
  return { ...material, qualificationContentHash: canonicalSha256(hashMaterial) };
}

function withReadinessEvaluator(readiness: DelegationReadiness, nextEvaluator: EvaluatorIdentity): DelegationReadiness {
  const material = { ...readiness, evaluator: nextEvaluator };
  const { id: _id, createdAt: _createdAt, readinessContentHash: _hash, ...hashMaterial } = material;
  void _id;
  void _createdAt;
  void _hash;
  return { ...material, readinessContentHash: canonicalSha256(hashMaterial) };
}

describe("BUILD 002-A E1 signal qualification and readiness matrix", () => {
  it("qualifies an observed signal", () => { const r = requirement(); const s = signal(r, "portrait"); expect(qualify(r, [s]).outcome).toBe("QUALIFIED"); });
  it("reports MISSING when no signal exists", () => { const r = requirement(); expect(qualify(r, []).outcome).toBe("MISSING"); });
  it("reports UNKNOWN for unknown payload", () => { const r = requirement(); const s = signal(r, null); expect(qualify(r, [s]).outcome).toBe("UNKNOWN"); });
  it("reports incompatible provenance", () => { const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "CUSTOMER_STATED"); expect(qualify(r, [s]).outcome).toBe("INCOMPATIBLE_PROVENANCE"); });
  it("reports STALE_SOURCE when source dependency changed", () => { const r = requirement(); const s = signal(r, "x", H_OTHER); expect(qualify(r, [s], dependency([s], H_SOURCE)).outcome).toBe("STALE_SOURCE"); });
  it("reports INVALID for a tampered signal hash", () => { const r = requirement(); const s = signal(r, "x"); const tampered = { ...s, contentHash: H_OTHER }; expect(qualify(r, [tampered]).outcome).toBe("INVALID"); });
  it("reports human review requirement", () => { const r = requirement({ qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: true } }); const s = signal(r, "x"); expect(qualify(r, [s]).outcome).toBe("REQUIRES_HUMAN_REVIEW"); });
  it("reports contradiction for single-valued divergent signals", () => { const r = requirement(); const a = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [a, b]).outcome).toBe("CONTRADICTORY"); });

  it("needs context when subject is absent", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: null, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }).state).toBe("NEEDS_CONTEXT"); });
  it("is insufficient when a critical requirement is missing", () => { const r = requirement(); const q = qualify(r, []); expect(ready(r, q).state).toBe("INSUFFICIENT_SIGNAL"); });
  it("is ready with conditions", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s]), { conditionCodes: ["LOW_CONFIDENCE"] }).state).toBe("READY_WITH_CONDITIONS"); });
  it("is READY when all critical requirements qualify", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s])).state).toBe("READY"); });
  it("requires human review at readiness", () => { const r = requirement({ qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: true } }); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s])).state).toBe("HUMAN_REVIEW_REQUIRED"); });
  it("blocks by policy", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s]), { policyBlock: "POLICY_DENIED" }).state).toBe("BLOCKED_BY_POLICY"); });

  it("marks matching dependency CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const a = ready(r, q, d); const bound = createDependencySnapshot({ ...(() => { const { dependencySnapshotHash: _hash, ...input } = d; void _hash; return input; })(), requirementDefinitionHashes: [r.requirementDefinitionHash] }); expect(evaluateReadinessValidity(a, bound, at)).toBe("CURRENT"); });
  it("marks changed dependency STALE", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(evaluateReadinessValidity(a, dependency([s], H_OTHER), at)).toBe("STALE"); });
  it("marks elapsed evidence horizon EXPIRED", () => { const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T12:30:00.000Z"); const d = dependency([s]); const q = qualify(r, [s], d); const a = ready(r, q, d); const bound = boundDependency([r], [s]); expect(a.validUntil).toBe("2026-08-18T12:30:00.000Z"); expect(evaluateReadinessValidity(a, bound, "2026-08-18T12:31:00.000Z")).toBe("EXPIRED"); });

  it("canonicalizes dependency references independent of order", () => { const r = requirement(); const a = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(dependency([a, b]).dependencySnapshotHash).toBe(dependency([b, a]).dependencySnapshotHash); });
  it("canonicalizes requirement and qualification sets independent of order", () => { const r1 = requirement({ requirementId: "a.first" }); const r2 = requirement({ requirementId: "b.second" }); const s1 = signal(r1, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const s2 = signal(r2, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = dependency([s1, s2]); const q1 = qualify(r1, [s1], d); const q2 = qualify(r2, [s2], d); const a = evaluateDelegationReadiness({ subject, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); const b = evaluateDelegationReadiness({ subject, requirements: [r2, r1], qualifications: [q2, q1], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); expect(a.readinessContentHash).toBe(b.readinessContentHash); });
  it("keeps signal content hash independent of identity and capture time", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = a; void _hash; const b = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", capturedAt: "2026-08-18T13:00:00.000Z" }); expect(a.contentHash).toBe(b.contentHash); });

  it("rejects a subject from another tenant", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, ownerTenantId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), evaluationTime: at }).state).toBe("NEEDS_CONTEXT"); });
  it("rejects a subject for another transaction", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, transactionId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), evaluationTime: at }).state).toBe("NEEDS_CONTEXT"); });
  it("does not accept a caller-replaced requirement hash", () => { const r = requirement(); const s = signal(r, "x"); const fake = { ...r, requirementDefinitionHash: H_OTHER }; const q = qualify(fake, [s]); expect(q.outcome).toBe("INVALID"); });
  it("does not accept a caller-replaced qualification hash", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const fake = { ...q, qualificationContentHash: H_OTHER }; const a = ready(r, fake, dependency([s])); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("ignores caller-supplied verifier callbacks", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const { dependencySnapshotHash: _hash, ...input } = d; void _hash; const bound = createDependencySnapshot({ ...input, requirementDefinitionHashes: [r.requirementDefinitionHash] }); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: bound, evaluationTime: at, verify: () => ({ state: "READY" }) } as never); expect(a.state).toBe("READY"); });
  it("ignores caller-supplied final state", () => { const r = requirement(); const q = qualify(r, []); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: dependency([]), state: "READY" } as never); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("returns deeply immutable assessment data", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(Object.isFrozen(a)).toBe(true); expect(() => { (a as { state: string }).state = "READY"; }).toThrow(); });
  it("does not treat duplicate equivalent signals as contradictory", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [b, a]).outcome).toBe("QUALIFIED"); });
  it("allows delegation only for READY and CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(isDelegable(a, "CURRENT")).toBe(true); expect(isDelegable(a, "STALE")).toBe(false); const conditioned = ready(r, q, dependency([s]), { conditionCodes: ["REVIEW"] }); expect(isDelegable(conditioned, "CURRENT")).toBe(false); });
  it("rejects INFERRED when the critical definition does not accept it", () => { const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "CUSTOMER_STATED"); const inferred = { ...s, provenance: "INFERRED" as const }; const { contentHash: _hash, ...input } = inferred; void _hash; const rebuilt = createSignal(input); expect(qualify(r, [rebuilt]).outcome).toBe("INCOMPATIBLE_PROVENANCE"); });
  it("qualifies INFERRED only when explicitly accepted by the definition", () => { const r = requirement({ acceptedProvenance: ["INFERRED"] }); const s = signal(r, "x", H_SOURCE, undefined, "CUSTOMER_STATED"); const { contentHash: _hash, ...input } = s; void _hash; const inferred = createSignal({ ...input, provenance: "INFERRED" }); expect(qualify(r, [inferred]).outcome).toBe("QUALIFIED"); });
  it("does not delegate an expired READY assessment", () => { const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T12:30:00.000Z"); const q = qualify(r, [s]); const d = dependency([s]); const a = ready(r, q, d); const bound = boundDependency([r], [s]); expect(evaluateReadinessValidity(a, bound, "2026-08-18T12:31:00.000Z")).toBe("EXPIRED"); expect(isDelegable(a, "EXPIRED")).toBe(false); });
  it("changes the dependency hash when a material source changes", () => { const r = requirement(); const s = signal(r, "x"); expect(dependency([s], H_SOURCE).dependencySnapshotHash).not.toBe(dependency([s], H_OTHER).dependencySnapshotHash); });
  it("changes the requirement definition hash for a material definition change", () => { expect(requirement().requirementDefinitionHash).not.toBe(requirement({ semanticType: "DIFFERENT" }).requirementDefinitionHash); });
  it("changes the signal hash for a material value change", () => { const r = requirement(); expect(signal(r, "x").contentHash).not.toBe(signal(r, "y").contentHash); });
  it("changes qualification and readiness hashes when semantic results change", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const contradictory = qualify(r, [s, signal(r, "y", H_SOURCE, "40000000-0000-4000-8000-000000000014")]); expect(q.qualificationContentHash).not.toBe(contradictory.qualificationContentHash); const current = dependency([s]); const a = ready(r, q, current); const b = ready(r, q, current, { conditionCodes: ["REVIEW"] }); expect(a.readinessContentHash).not.toBe(b.readinessContentHash); });
  it("does not choose an implicit provenance winner", () => { const r = requirement({ acceptedProvenance: ["OBSERVED", "CUSTOMER_STATED"] }); const observed = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED"); const stated = signal(r, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014", "CUSTOMER_STATED"); expect(qualify(r, [observed, stated]).outcome).toBe("CONTRADICTORY"); });
});

describe("BUILD 002-A hash integrity", () => {
  it("verifies generated qualification and readiness hashes", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(verifyQualificationHash(q)).toBe(true); expect(verifyReadinessHash(a)).toBe(true); });
});

describe("BUILD 002-A R1 exact binding regressions", () => {
  it("rejects qualification A reused against dependency B", () => { const r = requirement(); const s = signal(r, "x"); const a = boundDependency([r], [s]); const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: a, evaluationTime: at }); const b = boundDependency([r], [s], { transactionSemanticHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: H_OTHER }] }); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: b }).state).not.toBe("READY"); });
  it("rejects a requirement absent from the dependency snapshot", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([], [s]); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("rejects a signal absent from snapshot references", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], []); expect(evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: d, evaluationTime: at }).outcome).toBe("INVALID"); });
  it("rejects omitted contradictory snapshot evidence", () => { const r = requirement(); const a = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = boundDependency([r], [a, b]); expect(evaluateSignalQualification({ requirement: r, signals: [a], currentDependencySnapshot: d, evaluationTime: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign tenant signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, ownerTenantId: "90000000-0000-4000-8000-000000000009" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign transaction signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, transactionId: "90000000-0000-4000-8000-000000000019" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign requirement signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, requirementId: "other.requirement" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at }).outcome).toBe("INVALID"); });
  it("fails closed for duplicate conflicting requirement ids", () => { const first = requirement("same.id"); const second = requirement("same.id", { semanticType: "DIFFERENT" }); const s = signal(first, "x"); const q = qualify(first, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [first, second], qualifications: [q], dependencySnapshot: boundDependency([first, second], [s]) }).state).not.toBe("READY"); });
  it("fails closed for duplicate qualification ids", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const missing = qualify(r, [], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q, missing], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("keeps qualification permutations deterministic and non-authorizing", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const missing = qualify(r, [], d); const one = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q, missing], dependencySnapshot: d }); const two = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [missing, q], dependencySnapshot: d }); expect(one.state).not.toBe("READY"); expect(two.state).not.toBe("READY"); expect(one.readinessContentHash).toBe(two.readinessContentHash); });
  it("does not contradict equal values from different accepted provenance", () => { const r = requirement("same.value", { acceptedProvenance: ["OBSERVED", "CUSTOMER_STATED"] }); const observed = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED"); const { contentHash: _hash, ...input } = observed; void _hash; const stated = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", provenance: "CUSTOMER_STATED" }); expect(qualify(r, [observed, stated], boundDependency([r], [observed, stated])).outcome).toBe("QUALIFIED"); });
  it("does not contradict equal values from different sources", () => { const r = requirement("same.source"); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = first; void _hash; const second = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", source: { identity: "other", version: "2", hash: H_OTHER } }); expect(qualify(r, [first, second], boundDependency([r], [first, second])).outcome).toBe("QUALIFIED"); });
  it("contradicts distinct semantic values", () => { const r = requirement(); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const second = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [first, second], boundDependency([r], [first, second])).outcome).toBe("CONTRADICTORY"); });
  it("does not qualify an expired signal", () => { const r = requirement(); const expired = signalAt(r, "A", "2026-08-18T10:00:00.000Z", "2026-08-18T11:00:00.000Z"); expect(evaluateSignalQualification({ requirement: r, signals: [expired], currentDependencySnapshot: boundDependency([r], [expired]), evaluationTime: at }).outcome).toBe("STALE_SOURCE"); });
  it("rejects a dependency identity mismatch", () => { const r = requirement(); const s = signal(r, "x"); const { contentHash: _hash, ...input } = s; void _hash; const wrong = createSignal({ ...input, dependency: { identity: "wrong.identity", hash: H_SOURCE } }); expect(qualify(r, [wrong], boundDependency([r], [wrong])).outcome).toBe("STALE_SOURCE"); });
  it("rejects wrong identity even when an unrelated hash coincides", () => { const r = requirement(); const s = signal(r, "x"); const { contentHash: _hash, ...input } = s; void _hash; const wrong = createSignal({ ...input, dependency: { identity: "policy", hash: H_SOURCE } }); expect(() => boundDependency([r], [wrong], { dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }] })).toThrow(); });
  it("rejects contradictory top-level readiness bindings", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, blueprintHash: H_OTHER }).state).not.toBe("READY"); });
  it("does not authorize an empty requirement set", () => { expect(evaluateDelegationReadiness({ subject, requirements: [], qualifications: [], dependencySnapshot: dependency([]) }).state).toBe("INSUFFICIENT_SIGNAL"); });
  it("rejects a qualification for an unknown requirement", () => { const r = requirement(); const unknown = requirement("unknown.requirement"); const s = signal(unknown, "x"); const q = qualify(unknown, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: boundDependency([r], [s]) }).state).not.toBe("READY"); });
  it("rejects an extra snapshot requirement", () => { const r = requirement(); const extra = requirement("extra.requirement"); const s = signal(r, "x"); const d = boundDependency([r, extra], [s]); const q = qualify(r, [s], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("rejects an extra snapshot signal reference omitted from evaluation", () => { const r = requirement(); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const extra = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = boundDependency([r], [first, extra]); expect(evaluateSignalQualification({ requirement: r, signals: [first], currentDependencySnapshot: d, evaluationTime: at }).outcome).toBe("INVALID"); });
  it("rejects conflicting dependency identity duplicates", () => { const r = requirement(); const s = signal(r, "x"); expect(() => boundDependency([r], [s], { dependencyBindings: [{ identity: "asset.version", hash: H_SOURCE }, { identity: "asset.version", hash: H_OTHER }] })).toThrow(); });
  it("proves the exact valid chain is delegable", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }); expect(a.state).toBe("READY"); expect(evaluateReadinessValidity(a, d, at)).toBe("CURRENT"); expect(isDelegable(a, "CURRENT")).toBe(true); });
  it("marks the historical readiness stale after a material dependency change", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }); const changed = boundDependency([r], [s], { transactionSemanticHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: H_OTHER }] }); expect(evaluateReadinessValidity(a, changed, at)).toBe("STALE"); expect(isDelegable(a, "STALE")).toBe(false); });
});

describe("BUILD 002-A R2 temporal and canonical dependency integrity", () => {
  it("rejects requirement blueprint A under snapshot blueprint B", () => {
    const r = requirement(); const s = signal(r, "x");
    const d = boundDependency([r], [s], { blueprintHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_OTHER }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }] });
    expect(qualify(r, [s], d).outcome).toBe("INVALID");
    expect(ready(r, qualify(r, [s], d), d).state).not.toBe("READY");
  });

  it("rejects requirement policy A under snapshot policy B", () => {
    const r = requirement(); const s = signal(r, "x");
    const d = boundDependency([r], [s], { policyHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_OTHER }] });
    expect(qualify(r, [s], d).outcome).toBe("INVALID");
    expect(ready(r, qualify(r, [s], d), d).state).not.toBe("READY");
  });

  it.each([
    ["source projection", { sourceAssetVersionHash: H_OTHER }],
    ["transaction projection", { transactionSemanticHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }, { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: H_SOURCE }] }],
    ["task projection", { taskSpecHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }] }],
    ["context projection", { contextLensHash: H_OTHER, dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }] }],
  ])("rejects canonical %s mismatch", (_label, overrides) => {
    const r = requirement(); const s = signal(r, "x");
    expect(() => boundDependency([r], [s], overrides as Record<string, unknown>)).toThrow();
  });

  it("rejects conflicting canonical identity hashes and preserves permutation hash", () => {
    const r = requirement(); const s = signal(r, "x");
    expect(() => boundDependency([r], [s], { dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_OTHER }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }] })).toThrow();
    const a = boundDependency([r], [s], { dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }, { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }] });
    const b = boundDependency([r], [s], { dependencyBindings: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: H_POLICY }, { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: H_SOURCE }, { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: H_BLUEPRINT }] });
    expect(a.dependencySnapshotHash).toBe(b.dependencySnapshotHash);
  });

  it.each([null, "2026-08-18T14:00:00.000Z", "2026-08-18T15:00:00.000Z"])("rejects validUntil tamper %s", (tampered) => {
    const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at });
    expect(verifyReadinessHash({ ...a, validUntil: tampered } as never)).toBe(false);
  });

  it("derives qualification time and rejects a caller-provided later timestamp", () => {
    const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]);
    const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: d, evaluationTime: at, qualifiedAt: after } as never);
    expect(q.qualifiedAt).toBe(at);
  });

  it("derives earliest evidence validity and hashes it", () => {
    const r = requirement(); const first = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-18T13:00:00.000Z"); const second = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000014", "OBSERVED", "2026-08-18T14:00:00.000Z"); const d = boundDependency([r], [first, second]); const q = qualify(r, [first, second], d);
    expect(q.evidenceValidUntil).toBe("2026-08-18T13:00:00.000Z");
    expect(verifyQualificationHash({ ...q, evidenceValidUntil: "2026-08-18T14:00:00.000Z" } as never)).toBe(false);
  });

  it("derives readiness validity from critical qualification horizons", () => {
    const r1 = requirement({ requirementId: "critical.one" }); const r2 = requirement({ requirementId: "critical.two" }); const s1 = signal(r1, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-18T14:00:00.000Z"); const s2 = signal(r2, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014", "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([r1, r2], [s1, s2]); const q1 = qualify(r1, [s1], d); const q2 = qualify(r2, [s2], d); const a = evaluateDelegationReadiness({ subject, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: d, evaluationTime: at });
    expect(a.state).toBe("READY"); expect(a.validUntil).toBe("2026-08-18T13:00:00.000Z");
  });

  it("keeps readiness horizon null without expiries and ignores noncritical expiry", () => {
    const critical = requirement("critical"); const optional = requirement("optional", { critical: false }); const s = signal(critical, "x"); const optionalSignal = signal(optional, "y", H_SOURCE, "40000000-0000-4000-8000-000000000014", "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([critical, optional], [s, optionalSignal]); const q = qualify(critical, [s], d); const missing = qualify(optional, [], d); const a = evaluateDelegationReadiness({ subject, requirements: [critical, optional], qualifications: [q, missing], dependencySnapshot: d, evaluationTime: at });
    expect(a.state).toBe("READY"); expect(a.validUntil).toBeNull();
  });

  it("rejects historical qualification reuse after its evidence horizon", () => {
    const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: "2026-08-18T13:01:00.000Z" });
    expect(a.state).not.toBe("READY");
  });

  it("propagates supporting signal expiry to historical readiness", () => {
    const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d, at); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at });
    expect(a.state).toBe("READY"); expect(evaluateReadinessValidity(a, d, "2026-08-18T13:01:00.000Z")).toBe("EXPIRED"); expect(isDelegable(a, "EXPIRED")).toBe(false);
  });

  it("permits a new current qualification/readiness after historical expiry", () => {
    const r = requirement(); const oldSignal = signal(r, "x", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-18T13:00:00.000Z"); const oldDependency = boundDependency([r], [oldSignal]); const oldQualification = qualify(r, [oldSignal], oldDependency, at); const oldReadiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [oldQualification], dependencySnapshot: oldDependency, evaluationTime: at });
    expect(evaluateReadinessValidity(oldReadiness, oldDependency, "2026-08-18T13:01:00.000Z")).toBe("EXPIRED");
    const newSignal = signal(r, "x", H_SOURCE, "40000000-0000-4000-8000-000000000014", "OBSERVED", "2026-08-18T14:00:00.000Z"); const newDependency = boundDependency([r], [newSignal]); const newQualification = qualify(r, [newSignal], newDependency, "2026-08-18T13:01:00.000Z"); const newReadiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [newQualification], dependencySnapshot: newDependency, evaluationTime: "2026-08-18T13:01:00.000Z" });
    expect(newReadiness.state).toBe("READY"); expect(evaluateReadinessValidity(newReadiness, newDependency, "2026-08-18T13:01:00.000Z")).toBe("CURRENT");
  });

  it("keeps READY_WITH_CONDITIONS non-delegable with a derived horizon", () => {
    const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-18T13:00:00.000Z"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at, conditionCodes: ["REVIEW"] });
    expect(a.state).toBe("READY_WITH_CONDITIONS"); expect(a.validUntil).toBe("2026-08-18T13:00:00.000Z"); expect(isDelegable(a, "CURRENT")).toBe(false);
  });

  it("does not hash audit id or createdAt while hashing validity", () => {
    const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); const b = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000016" });
    expect(a.readinessContentHash).toBe(b.readinessContentHash); expect(verifyReadinessHash(a)).toBe(true);
  });
});

describe("BUILD 002-A R3 canonical instants and temporal causality", () => {
  it("canonicalizes supported ISO forms and rejects unsupported precision/offsets", () => {
    expect(parseInstant("2026-08-19T12:00:00Z")).toBe("2026-08-19T12:00:00.000Z");
    expect(parseInstant("2026-08-19T12:00:00.1Z")).toBe("2026-08-19T12:00:00.100Z");
    expect(parseInstant("2026-08-19T12:00:00.000Z")).toBe("2026-08-19T12:00:00.000Z");
    expect(() => parseInstant("2026-08-19T12:00:00.0001Z")).toThrow();
    expect(() => parseInstant("2026-08-19T14:00:00.000+02:00")).toThrow();
  });

  it("normalizes equivalent signal validity before hashing", () => {
    const r = requirement();
    const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-19T12:00:00Z");
    const b = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-19T12:00:00.000Z");
    expect(a.validUntil).toBe(b.validUntil);
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("uses instant equality at the signal expiry boundary", () => {
    const r = requirement();
    const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-19T12:00:00Z");
    expect(qualify(r, [s], dependency([s]), "2026-08-19T11:59:59.999Z").outcome).toBe("QUALIFIED");
    expect(qualify(r, [s], dependency([s]), "2026-08-19T12:00:00.000Z").outcome).toBe("STALE_SOURCE");
    expect(qualify(r, [s], dependency([s]), "2026-08-19T12:00:00.001Z").outcome).toBe("STALE_SOURCE");
  });

  it("derives the chronological earliest horizon independent of order and format", () => {
    const r1 = requirement("critical.one");
    const r2 = requirement("critical.two");
    const first = signal(r1, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-19T12:00:00Z");
    const second = signal(r2, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014", "OBSERVED", "2026-08-19T12:00:00.500Z");
    const d = boundDependency([r1, r2], [first, second]);
    const q1 = qualify(r1, [first], d, "2026-08-19T11:00:00Z");
    const q2 = qualify(r2, [second], d, "2026-08-19T11:00:00.000Z");
    const a = evaluateDelegationReadiness({ subject, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: d, evaluationTime: "2026-08-19T11:30:00Z", idFactory: () => "60000000-0000-4000-8000-000000000006" });
    const b = evaluateDelegationReadiness({ subject, requirements: [r2, r1], qualifications: [q2, q1], dependencySnapshot: d, evaluationTime: "2026-08-19T11:30:00.000Z", idFactory: () => "60000000-0000-4000-8000-000000000006" });
    expect(a.validUntil).toBe("2026-08-19T12:00:00.000Z");
    expect(a.readinessContentHash).toBe(b.readinessContentHash);
  });

  it("rejects a hash-valid qualification created in the future", () => {
    const r = requirement();
    const s = signal(r, "x");
    const d = boundDependency([r], [s]);
    const future = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [future], dependencySnapshot: d, evaluationTime: "2026-08-19T11:59:59.999Z" });
    expect(verifyQualificationHash(future)).toBe(true);
    expect(a.state).toBe("INSUFFICIENT_SIGNAL");
    expect(a.blockingCodes).toContain("QUALIFICATION_FROM_FUTURE");
  });

  it("allows qualification at the same instant as readiness evaluation", () => {
    const r = requirement();
    const s = signal(r, "x");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: "2026-08-19T12:00:00.000Z" }).state).toBe("READY");
  });

  it("fails closed for a hash-valid qualification whose evidence ends at qualification time", () => {
    const r = requirement();
    const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-19T13:00:00Z");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    const impossible = { ...q, evidenceValidUntil: "2026-08-19T12:00:00.000Z" };
    const { id: _id, qualificationContentHash: _hash, ...material } = impossible;
    void _id; void _hash;
    const tampered = { ...impossible, qualificationContentHash: canonicalSha256(material) };
    expect(verifyQualificationHash(tampered as never)).toBe(true);
    expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [tampered as never], dependencySnapshot: d, evaluationTime: "2026-08-19T12:00:00Z" }).state).toBe("INSUFFICIENT_SIGNAL");
  });

  it("keeps qualification and readiness hashes stable for equivalent instants", () => {
    const r = requirement();
    const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-19T13:00:00Z");
    const d = boundDependency([r], [s]);
    const q1 = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    const q2 = qualify(r, [s], d, "2026-08-19T12:00:00.000Z");
    expect(q1.qualifiedAt).toBe(q2.qualifiedAt);
    expect(q1.evidenceValidUntil).toBe(q2.evidenceValidUntil);
    expect(q1.qualificationContentHash).toBe(q2.qualificationContentHash);
    const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q1], dependencySnapshot: d, evaluationTime: "2026-08-19T12:30:00Z" });
    const b = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q2], dependencySnapshot: d, evaluationTime: "2026-08-19T12:30:00.000Z" });
    expect(a.validUntil).toBe("2026-08-19T13:00:00.000Z");
    expect(a.readinessContentHash).toBe(b.readinessContentHash);
    expect(evaluateReadinessValidity(a, d, "2026-08-19T12:30:00Z")).toBe("CURRENT");
    expect(evaluateReadinessValidity(a, d, "2026-08-19T13:00:00.000Z")).toBe("EXPIRED");
    expect(evaluateReadinessValidity(a, d, "2026-08-19T13:00:00.001Z")).toBe("EXPIRED");
  });

  it("changes semantic hashes when a temporal instant actually changes", () => {
    const r = requirement();
    const early = signal(r, "x", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-19T13:00:00Z");
    const late = signal(r, "x", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED", "2026-08-19T13:00:00.001Z");
    expect(early.contentHash).not.toBe(late.contentHash);
    const d = boundDependency([r], [early]);
    const atNoMillis = qualify(r, [early], d, "2026-08-19T12:00:00Z");
    const oneMillisecondLater = qualify(r, [early], d, "2026-08-19T12:00:00.001Z");
    expect(atNoMillis.qualificationContentHash).not.toBe(oneMillisecondLater.qualificationContentHash);
    const changedEvidence = { ...atNoMillis, evidenceValidUntil: "2026-08-19T13:00:00.001Z" };
    const { id: _id, qualificationContentHash: _hash, ...material } = changedEvidence;
    void _id; void _hash;
    const changed = { ...changedEvidence, qualificationContentHash: canonicalSha256(material) };
    expect(verifyQualificationHash(changed as never)).toBe(true);
    expect(changed.qualificationContentHash).not.toBe(atNoMillis.qualificationContentHash);
  });

  it("forbids READY when the critical horizon is at the evaluation instant", () => {
    const r = requirement();
    const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-19T13:00:00Z");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    const impossible = { ...q, evidenceValidUntil: "2026-08-19T12:00:00Z" };
    const { id: _id, qualificationContentHash: _hash, ...material } = impossible;
    void _id; void _hash;
    const tampered = { ...impossible, qualificationContentHash: canonicalSha256(material) };
    const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [tampered as never], dependencySnapshot: d, evaluationTime: "2026-08-19T12:00:00Z" });
    expect(a.state).toBe("INSUFFICIENT_SIGNAL");
  });

  it("preserves the positive T0/T1/T2 temporal chain", () => {
    const r = requirement();
    const s = signal(r, "x", H_SOURCE, undefined, "OBSERVED", "2026-08-19T13:00:00Z");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d, "2026-08-19T12:00:00Z");
    const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: "2026-08-19T12:30:00Z" });
    expect(a.state).toBe("READY");
    expect(evaluateReadinessValidity(a, d, "2026-08-19T12:30:00.000Z")).toBe("CURRENT");
    expect(isDelegable(a, "CURRENT")).toBe(true);
    expect(evaluateReadinessValidity(a, d, "2026-08-19T13:00:00Z")).toBe("EXPIRED");
    expect(isDelegable(a, "EXPIRED")).toBe(false);
  });
});

describe("BUILD 002-A R4 critical versus non-critical expiry", () => {
  function evaluateMany(requirements: SignalRequirement[], qualifications: ReturnType<typeof qualify>[], dependencySnapshot: DependencySnapshot, evaluationTime: string, conditionCodes?: string[]) {
    return evaluateDelegationReadiness({
      subject,
      requirements,
      qualifications,
      dependencySnapshot,
      evaluator,
      evaluationTime,
      conditionCodes,
      idFactory: () => "60000000-0000-4000-8000-000000000099",
    });
  }

  it("does not let an expired optional qualification over-block a critical READY result", () => {
    const critical = requirement("critical.intent");
    const optional = requirement({ requirementId: "optional.history", critical: false });
    const criticalSignal = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000041", "OBSERVED", null);
    const optionalSignal = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000042", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [criticalSignal, optionalSignal]);
    const result = evaluateMany([critical, optional], [qualify(critical, [criticalSignal], d), qualify(optional, [optionalSignal], d)], d, "2026-08-18T14:00:00Z");
    expect(result.state).toBe("READY");
    expect(result.validUntil).toBeNull();
    expect(evaluateReadinessValidity(result, d, "2026-08-18T14:00:00Z")).toBe("CURRENT");
    expect(isDelegable(result, "CURRENT")).toBe(true);
  });

  it("keeps validUntil null when the only expiring evidence is optional", () => {
    const critical = requirement("critical.no-horizon");
    const optional = requirement({ requirementId: "optional.expired-only", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000065");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000066", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [os], d)], d, "2026-08-18T14:00:00Z");
    expect(result.state).toBe("READY");
    expect(result.validUntil).toBeNull();
    expect(evaluateReadinessValidity(result, d, "2026-08-18T14:00:00Z")).toBe("CURRENT");
  });

  it("derives the horizon exclusively from critical qualifications", () => {
    const critical = requirement("critical.horizon");
    const optional = requirement({ requirementId: "optional.horizon", critical: false });
    const criticalSignal = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000043", "OBSERVED", "2026-08-18T15:00:00Z");
    const optionalSignal = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000044", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [criticalSignal, optionalSignal]);
    const result = evaluateMany([critical, optional], [qualify(critical, [criticalSignal], d), qualify(optional, [optionalSignal], d)], d, "2026-08-18T14:00:00Z");
    expect(result.state).toBe("READY");
    expect(result.validUntil).toBe("2026-08-18T15:00:00.000Z");
    expect(evaluateReadinessValidity(result, d, "2026-08-18T14:00:00Z")).toBe("CURRENT");
  });

  it("expires readiness at the critical horizon equality boundary", () => {
    const critical = requirement("critical.boundary");
    const optional = requirement({ requirementId: "optional.boundary", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000045", "OBSERVED", "2026-08-18T15:00:00Z");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000046", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [os], d)], d, "2026-08-18T15:00:00Z");
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("STALE_SOURCE");
    expect(isDelegable(result, "EXPIRED")).toBe(false);
  });

  it("continues to block when critical evidence expires even if optional evidence is current", () => {
    const critical = requirement("critical.expired");
    const optional = requirement({ requirementId: "optional.current", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000047", "OBSERVED", "2026-08-18T13:00:00Z");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000048", "OBSERVED", "2026-08-18T18:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [os], d)], d, "2026-08-18T14:00:00Z");
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("STALE_SOURCE");
  });

  it("fails closed when optional evidence is semantically INVALID", () => {
    const critical = requirement("critical.valid");
    const optional = requirement({ requirementId: "optional.invalid", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000049");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000050");
    const d = boundDependency([critical, optional], [cs, os]);
    const oq = qualify(optional, [{ ...os, contentHash: H_OTHER } as never], d);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), oq], d, at);
    expect(oq.outcome).toBe("INVALID");
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("INVALID_QUALIFICATION");
  });

  it("fails closed when an optional qualification hash is tampered", () => {
    const critical = requirement("critical.hash");
    const optional = requirement({ requirementId: "optional.hash", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000051");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000052");
    const d = boundDependency([critical, optional], [cs, os]);
    const oq = qualify(optional, [os], d);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), { ...oq, qualificationContentHash: H_OTHER } as never], d, at);
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("INVALID_QUALIFICATION");
  });

  it("fails closed when an optional qualification is from the future", () => {
    const critical = requirement("critical.future");
    const optional = requirement({ requirementId: "optional.future", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000053");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000054");
    const d = boundDependency([critical, optional], [cs, os]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [os], d, "2026-08-18T14:00:00Z")], d, "2026-08-18T13:00:00Z");
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("QUALIFICATION_FROM_FUTURE");
  });

  it("fails closed for an optional temporally impossible qualification", () => {
    const critical = requirement("critical.temporal");
    const optional = requirement({ requirementId: "optional.temporal", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000055");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000056", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const oq = qualify(optional, [os], d);
    const impossible = { ...oq, evidenceValidUntil: oq.qualifiedAt };
    const { id: _id, qualificationContentHash: _hash, ...material } = impossible;
    void _id; void _hash;
    const repairedHash = { ...impossible, qualificationContentHash: canonicalSha256(material) };
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), repairedHash as never], d, at);
    expect(result.state).toBe("INSUFFICIENT_SIGNAL");
    expect(result.blockingCodes).toContain("INVALID_QUALIFICATION");
  });

  it("preserves explicit conditions without inventing one for optional expiry", () => {
    const critical = requirement("critical.condition");
    const optional = requirement({ requirementId: "optional.condition", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000057");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000058", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [os], d)], d, "2026-08-18T14:00:00Z", ["REVIEW"]);
    expect(result.state).toBe("READY_WITH_CONDITIONS");
    expect(result.conditionCodes).toEqual(["REVIEW"]);
    expect(result.blockingCodes).not.toContain("STALE_SOURCE");
    expect(isDelegable(result, "CURRENT")).toBe(false);
  });

  it("keeps optional non-qualified history non-blocking while critical evidence qualifies", () => {
    const critical = requirement("critical.history");
    const optional = requirement({ requirementId: "optional.history-missing", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000059");
    const d = boundDependency([critical, optional], [cs]);
    const result = evaluateMany([critical, optional], [qualify(critical, [cs], d), qualify(optional, [], d)], d, at);
    expect(result.state).toBe("READY");
    expect(result.validUntil).toBeNull();
  });

  it("is stable when requirements and qualifications are supplied in reverse order", () => {
    const critical = requirement("critical.order");
    const optional = requirement({ requirementId: "optional.order", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000060");
    const os = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000061", "OBSERVED", "2026-08-18T13:00:00Z");
    const d = boundDependency([critical, optional], [cs, os]);
    const qCritical = qualify(critical, [cs], d);
    const qOptional = qualify(optional, [os], d);
    const forward = evaluateMany([critical, optional], [qCritical, qOptional], d, "2026-08-18T14:00:00Z");
    const reverse = evaluateMany([optional, critical], [qOptional, qCritical], d, "2026-08-18T14:00:00Z");
    expect(forward.state).toBe("READY");
    expect(reverse.state).toBe("READY");
    expect(forward.validUntil).toBe(reverse.validUntil);
  });

  it("keeps multiple expired optional horizons outside the critical horizon", () => {
    const critical = requirement("critical.multiple");
    const optionalA = requirement({ requirementId: "optional.early", critical: false });
    const optionalB = requirement({ requirementId: "optional.late", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000062", "OBSERVED", "2026-08-18T16:00:00Z");
    const as = signal(optionalA, "a", H_SOURCE, "40000000-0000-4000-8000-000000000063", "OBSERVED", "2026-08-18T13:00:00Z");
    const bs = signal(optionalB, "b", H_SOURCE, "40000000-0000-4000-8000-000000000064", "OBSERVED", "2026-08-18T14:00:00Z");
    const requirements = [critical, optionalA, optionalB];
    const d = boundDependency(requirements, [cs, as, bs]);
    const result = evaluateMany(requirements, [qualify(critical, [cs], d), qualify(optionalA, [as], d), qualify(optionalB, [bs], d)], d, "2026-08-18T15:00:00Z");
    expect(result.state).toBe("READY");
    expect(result.validUntil).toBe("2026-08-18T16:00:00.000Z");
  });

  it("keeps the critical readiness horizon unchanged across an optional current-to-expired transition", () => {
    const critical = requirement("critical.transition");
    const optional = requirement({ requirementId: "optional.transition", critical: false });
    const cs = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000067", "OBSERVED", "2026-08-18T16:00:00Z");
    const currentOptional = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000068", "OBSERVED", "2026-08-18T15:00:00Z");
    const expiredOptional = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000069", "OBSERVED", "2026-08-18T13:00:00Z");
    const dCurrent = boundDependency([critical, optional], [cs, currentOptional]);
    const dExpired = boundDependency([critical, optional], [cs, expiredOptional]);
    const current = evaluateMany([critical, optional], [qualify(critical, [cs], dCurrent), qualify(optional, [currentOptional], dCurrent)], dCurrent, "2026-08-18T12:00:00Z");
    const expired = evaluateMany([critical, optional], [qualify(critical, [cs], dExpired), qualify(optional, [expiredOptional], dExpired)], dExpired, "2026-08-18T14:00:00Z");
    expect(current.state).toBe("READY");
    expect(expired.state).toBe("READY");
    expect(current.validUntil).toBe("2026-08-18T16:00:00.000Z");
    expect(expired.validUntil).toBe("2026-08-18T16:00:00.000Z");
  });
});

describe("BUILD 002-A R4 signal temporal causality", () => {
  it("qualifies a captured signal before evaluation with no validity horizon", () => {
    const r = requirement("temporal.before");
    const s = signalAt(r, "value", "2026-08-18T11:59:59Z");
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("QUALIFIED");
  });

  it("allows a signal captured exactly at evaluation time", () => {
    const r = requirement("temporal.equal");
    const s = signalAt(r, "value", at);
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("QUALIFIED");
  });

  it("rejects a fully valid signal captured in the future", () => {
    const r = requirement("temporal.future");
    const s = signalAt(r, "value", after);
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("INVALID");
    expect(q.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });

  it("keeps the future-signal rejection independent from content-hash validity", () => {
    const r = requirement("temporal.future-hash");
    const s = signalAt(r, "value", after);
    expect(verifySignalContentHash(s)).toBe(true);
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("INVALID");
    expect(q.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });

  it("qualifies a signal while evaluation remains inside its coherent interval", () => {
    const r = requirement("temporal.interval");
    const s = signalAt(r, "value", "2026-08-18T11:00:00Z", "2026-08-18T13:00:00Z");
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("QUALIFIED");
  });

  it("keeps coherent but expired evidence as STALE_SOURCE", () => {
    const r = requirement("temporal.expired");
    const s = signalAt(r, "value", "2026-08-18T11:00:00Z", "2026-08-18T12:00:00Z");
    const q = qualify(r, [s], boundDependency([r], [s]), after);
    expect(q.outcome).toBe("STALE_SOURCE");
    expect(q.reasonCode).toBe("SIGNAL_EXPIRED");
  });

  it.each([
    [at, "SIGNAL_TEMPORAL_INVALID"],
    [after, "SIGNAL_TEMPORAL_INVALID"],
  ] as const)("rejects a non-positive signal validity window (%s)", (capturedAt, reasonCode) => {
    const r = requirement(`temporal.window-${capturedAt === at ? "equal" : "reverse"}`);
    const s = signalAt(r, "value", capturedAt, at);
    const q = qualify(r, [s], boundDependency([r], [s]), at);
    expect(q.outcome).toBe("INVALID");
    expect(q.reasonCode).toBe(reasonCode);
  });

  it("makes a future critical signal structurally insufficient and non-delegable", () => {
    const r = requirement("temporal.critical-future");
    const s = signalAt(r, "value", after);
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d, at);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at, evaluator, idFactory: () => "60000000-0000-4000-8000-000000000201" });
    expect(q.reasonCode).toBe("SIGNAL_FROM_FUTURE");
    expect(readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(isDelegable(readiness, "CURRENT")).toBe(false);
  });

  it("does not ignore a future optional member beside a qualified critical member", () => {
    const critical = requirement("temporal.critical");
    const optional = requirement({ requirementId: "temporal.optional", critical: false });
    const criticalSignal = signalAt(critical, "critical", "2026-08-18T11:00:00Z", null, "40000000-0000-4000-8000-000000000201");
    const optionalSignal = signalAt(optional, "optional", after, null, "40000000-0000-4000-8000-000000000202");
    const d = boundDependency([critical, optional], [criticalSignal, optionalSignal]);
    const criticalQ = qualify(critical, [criticalSignal], d, at);
    const optionalQ = qualify(optional, [optionalSignal], d, at);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [critical, optional], qualifications: [criticalQ, optionalQ], dependencySnapshot: d, evaluationTime: at, evaluator, idFactory: () => "60000000-0000-4000-8000-000000000202" });
    expect(criticalQ.outcome).toBe("QUALIFIED");
    expect(optionalQ.outcome).toBe("INVALID");
    expect(readiness.state).not.toBe("READY");
  });

  it("applies temporal failure precedence independent of signal array order", () => {
    const r = requirement("temporal.precedence");
    const invalidWindow = signalAt(r, "invalid", after, at, "40000000-0000-4000-8000-000000000203");
    const future = signalAt(r, "future", after, null, "40000000-0000-4000-8000-000000000204");
    const d = boundDependency([r], [invalidWindow, future]);
    const forward = qualify(r, [invalidWindow, future], d, at);
    const reverse = qualify(r, [future, invalidWindow], d, at);
    expect(forward.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
    expect(reverse.reasonCode).toBe("SIGNAL_TEMPORAL_INVALID");
  });

  it("preserves content-hash independence from capture time", () => {
    const r = requirement("temporal.hash-independence");
    const early = signalAt(r, "same", "2026-08-18T11:00:00Z", null, "40000000-0000-4000-8000-000000000205");
    const later = signalAt(r, "same", "2026-08-18T11:30:00Z", null, "40000000-0000-4000-8000-000000000206");
    expect(early.contentHash).toBe(later.contentHash);
  });

  it("versions the default evaluator for the temporal semantics change", () => {
    const r = requirement("temporal.evaluator");
    const s = signalAt(r, "value", "2026-08-18T11:00:00Z");
    const d = boundDependency([r], [s]);
    const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: d, evaluationTime: at, idFactory: () => "50000000-0000-4000-8000-000000000207" });
    expect(q.evaluator.version).toBe(BUILD002_DEFAULT_EVALUATOR_VERSION);
    expect(q.evaluator.definitionHash).toBe(canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION }));
  });
});

describe("BUILD 002-A R4-1 evaluator semantic revocation", () => {
  it("verifies the current evaluator identity canonically", () => {
    const current = { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION, definitionHash: canonicalSha256({ schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: BUILD002_DEFAULT_EVALUATOR_VERSION }) };
    expect(verifyEvaluatorIdentity(current)).toBe(true);
    expect(sameEvaluatorIdentity(current, evaluator)).toBe(true);
  });

  it("fails closed for a valid-shape evaluator with the wrong definition hash", () => {
    const r = requirement("r4-1.bad-evaluator");
    const s = signal(r, "value");
    const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: boundDependency([r], [s]), evaluator: badEvaluator, evaluationTime: at });
    expect(q.outcome).toBe("INVALID");
    expect(q.reasonCode).toBe("INVALID_EVALUATOR_IDENTITY");
  });

  it("preserves historical qualification hash validity while revoking current compatibility", () => {
    const r = requirement("r4-1.legacy-qualification");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const legacy = withQualificationEvaluator(qualify(r, [s], d), legacyEvaluator);
    expect(verifyQualificationHash(legacy)).toBe(true);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [legacy], dependencySnapshot: d, evaluationTime: at });
    expect(readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(readiness.blockingCodes).toContain("QUALIFICATION_EVALUATOR_MISMATCH");
  });

  it("does not permit a legacy qualification to produce READY_WITH_CONDITIONS", () => {
    const r = requirement("r4-1.legacy-conditions");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const legacy = withQualificationEvaluator(qualify(r, [s], d), legacyEvaluator);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [legacy], dependencySnapshot: d, conditionCodes: ["REVIEW"], evaluationTime: at });
    expect(readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(readiness.state).not.toBe("READY_WITH_CONDITIONS");
  });

  it("keeps a current 0.2.0 qualification on the READY path", () => {
    const r = requirement("r4-1.current-qualification");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at });
    expect(readiness.state).toBe("READY");
  });

  it("does not ignore a legacy optional qualification", () => {
    const critical = requirement("r4-1.critical");
    const optional = requirement({ requirementId: "r4-1.optional", critical: false });
    const criticalSignal = signal(critical, "critical", H_SOURCE, "40000000-0000-4000-8000-000000000101");
    const optionalSignal = signal(optional, "optional", H_SOURCE, "40000000-0000-4000-8000-000000000102");
    const d = boundDependency([critical, optional], [criticalSignal, optionalSignal]);
    const criticalQ = qualify(critical, [criticalSignal], d);
    const optionalQ = withQualificationEvaluator(qualify(optional, [optionalSignal], d), legacyEvaluator);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [critical, optional], qualifications: [criticalQ, optionalQ], dependencySnapshot: d, evaluationTime: at });
    expect(readiness.state).toBe("INSUFFICIENT_SIGNAL");
    expect(readiness.blockingCodes).toContain("QUALIFICATION_EVALUATOR_MISMATCH");
  });

  it("rejects mixed evaluator sets deterministically in either order", () => {
    const first = requirement("r4-1.mix-a");
    const second = requirement("r4-1.mix-b");
    const firstSignal = signal(first, "a", H_SOURCE, "40000000-0000-4000-8000-000000000103");
    const secondSignal = signal(second, "b", H_SOURCE, "40000000-0000-4000-8000-000000000104");
    const d = boundDependency([first, second], [firstSignal, secondSignal]);
    const current = qualify(first, [firstSignal], d);
    const legacy = withQualificationEvaluator(qualify(second, [secondSignal], d), legacyEvaluator);
    const forward = evaluateDelegationReadiness({ subject, requirements: [first, second], qualifications: [current, legacy], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000103" });
    const reverse = evaluateDelegationReadiness({ subject, requirements: [second, first], qualifications: [legacy, current], dependencySnapshot: d, evaluationTime: at, idFactory: () => "60000000-0000-4000-8000-000000000103" });
    expect(forward.state).toBe("INSUFFICIENT_SIGNAL");
    expect(reverse.state).toBe("INSUFFICIENT_SIGNAL");
    expect(forward.blockingCodes).toEqual(reverse.blockingCodes);
  });

  it("marks a legacy READY artifact stale under current default semantics", () => {
    const r = requirement("r4-1.legacy-readiness");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d);
    const currentReadiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at });
    const legacyReadiness = withReadinessEvaluator(currentReadiness, legacyEvaluator);
    expect(verifyReadinessHash(legacyReadiness)).toBe(true);
    expect(evaluateReadinessValidity(legacyReadiness, d, at)).toBe("STALE");
    expect(evaluateReadinessValidity(legacyReadiness, d, at, legacyEvaluator)).toBe("CURRENT");
    expect(isDelegable(legacyReadiness, "STALE")).toBe(false);
  });

  it("keeps current readiness CURRENT and delegable", () => {
    const r = requirement("r4-1.current-readiness");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d);
    const readiness = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at });
    expect(evaluateReadinessValidity(readiness, d, at)).toBe("CURRENT");
    expect(isDelegable(readiness, "CURRENT")).toBe(true);
  });

  it("marks a readiness carrying a bad evaluator hash stale", () => {
    const r = requirement("r4-1.bad-readiness");
    const s = signal(r, "value");
    const d = boundDependency([r], [s]);
    const q = qualify(r, [s], d);
    const readiness = withReadinessEvaluator(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, evaluationTime: at }), badEvaluator);
    expect(verifyReadinessHash(readiness)).toBe(true);
    expect(evaluateReadinessValidity(readiness, d, at)).toBe("STALE");
    expect(isDelegable(readiness, "STALE")).toBe(false);
  });

  it("retains the R4 future-signal temporal boundary", () => {
    const r = requirement("r4-1.temporal-control");
    const s = signalAt(r, "future", after);
    const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: boundDependency([r], [s]), evaluationTime: at });
    expect(verifySignalContentHash(s)).toBe(true);
    expect(q.outcome).toBe("INVALID");
    expect(q.reasonCode).toBe("SIGNAL_FROM_FUTURE");
  });
});
