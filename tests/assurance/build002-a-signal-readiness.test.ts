import { describe, expect, it } from "vitest";

import {
  BUILD002_SIGNAL_SCHEMA_VERSION,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  BUILD002_EVALUATOR_SCHEMA_VERSION,
  BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  evaluateDelegationReadiness,
  evaluateReadinessValidity,
  evaluateSignalQualification,
  isDelegable,
  verifyQualificationHash,
  verifyReadinessHash,
  type DependencySnapshot,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

const H_SOURCE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const H_OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const H_BLUEPRINT = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const H_POLICY = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const tenantId = "10000000-0000-4000-8000-000000000001";
const transactionId = "20000000-0000-4000-8000-000000000002";
const subject = { kind: "OUTCOME_TRANSACTION" as const, ownerTenantId: tenantId, transactionId };
const evaluator = {
  schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION,
  version: "1.0.0",
  definitionHash: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
};
const at = "2026-08-18T12:00:00.000Z";

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

function signal(req: SignalRequirement, payload: unknown, dependencyHash = H_SOURCE, id = "40000000-0000-4000-8000-000000000004", provenance: "OBSERVED" | "CUSTOMER_STATED" = "OBSERVED"): Signal {
  return createSignal({
    signalId: id,
    ownerTenantId: tenantId,
    transactionId,
    requirementId: req.requirementId,
    payload,
    source: { identity: "capture.camera", version: "1", hash: H_SOURCE },
    provenance,
    capturedAt: at,
    validUntil: null,
    dependency: { identity: "asset.version", hash: dependencyHash },
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
    dependencyBindings: [{ identity: "asset.version", hash: H_SOURCE }],
    blueprintHash: H_BLUEPRINT,
    policyHash: H_POLICY,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: sourceHash,
    contextLensHash: null,
  });
}

function qualify(req: SignalRequirement, signals: Signal[], current = dependency(signals)) {
  const bound = current.requirementDefinitionHashes.includes(req.requirementDefinitionHash)
    ? current
    : (() => { const { dependencySnapshotHash: _hash, ...input } = current; void _hash; return createDependencySnapshot({ ...input, requirementDefinitionHashes: [...current.requirementDefinitionHashes, req.requirementDefinitionHash] }); })();
  return evaluateSignalQualification({ requirement: req, signals, currentDependencySnapshot: bound, evaluator, evaluationTime: at, qualifiedAt: at, idFactory: () => "50000000-0000-4000-8000-000000000005" });
}

function ready(req: SignalRequirement, qualification: ReturnType<typeof qualify>, current = dependency([]), extras: Partial<Parameters<typeof evaluateDelegationReadiness>[0]> = {}) {
  const bound = current.requirementDefinitionHashes.includes(req.requirementDefinitionHash)
    ? current
    : (() => { const { dependencySnapshotHash: _hash, ...input } = current; void _hash; return createDependencySnapshot({ ...input, requirementDefinitionHashes: [...current.requirementDefinitionHashes, req.requirementDefinitionHash] }); })();
  return evaluateDelegationReadiness({ subject, requirements: [req], qualifications: [qualification], dependencySnapshot: bound, evaluator, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006", ...extras });
}

function boundDependency(requirements: SignalRequirement[], signals: Signal[] = [], overrides: Record<string, unknown> = {}) {
  const base = dependency(signals);
  const { dependencySnapshotHash: _hash, ...input } = base;
  void _hash;
  return createDependencySnapshot({ ...input, requirementDefinitionHashes: requirements.map((requirement) => requirement.requirementDefinitionHash), ...overrides } as never);
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

  it("needs context when subject is absent", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: null, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }).state).toBe("NEEDS_CONTEXT"); });
  it("is insufficient when a critical requirement is missing", () => { const r = requirement(); const q = qualify(r, []); expect(ready(r, q).state).toBe("INSUFFICIENT_SIGNAL"); });
  it("is ready with conditions", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s]), { conditionCodes: ["LOW_CONFIDENCE"] }).state).toBe("READY_WITH_CONDITIONS"); });
  it("is READY when all critical requirements qualify", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s])).state).toBe("READY"); });
  it("requires human review at readiness", () => { const r = requirement({ qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: true } }); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s])).state).toBe("HUMAN_REVIEW_REQUIRED"); });
  it("blocks by policy", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(ready(r, q, dependency([s]), { policyBlock: "POLICY_DENIED" }).state).toBe("BLOCKED_BY_POLICY"); });

  it("marks matching dependency CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const a = ready(r, q, d); const bound = createDependencySnapshot({ ...(() => { const { dependencySnapshotHash: _hash, ...input } = d; void _hash; return input; })(), requirementDefinitionHashes: [r.requirementDefinitionHash] }); expect(evaluateReadinessValidity(a, bound, at)).toBe("CURRENT"); });
  it("marks changed dependency STALE", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(evaluateReadinessValidity(a, dependency([s], H_OTHER), at)).toBe("STALE"); });
  it("marks elapsed validUntil EXPIRED", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const a = ready(r, q, d, { validUntil: "2026-08-18T11:59:00.000Z" }); const bound = createDependencySnapshot({ ...(() => { const { dependencySnapshotHash: _hash, ...input } = d; void _hash; return input; })(), requirementDefinitionHashes: [r.requirementDefinitionHash] }); expect(evaluateReadinessValidity(a, bound, at)).toBe("EXPIRED"); });

  it("canonicalizes dependency references independent of order", () => { const r = requirement(); const a = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(dependency([a, b]).dependencySnapshotHash).toBe(dependency([b, a]).dependencySnapshotHash); });
  it("canonicalizes requirement and qualification sets independent of order", () => { const r1 = requirement({ requirementId: "a.first" }); const r2 = requirement({ requirementId: "b.second" }); const s1 = signal(r1, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const s2 = signal(r2, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = dependency([s1, s2]); const q1 = qualify(r1, [s1], d); const q2 = qualify(r2, [s2], d); const a = evaluateDelegationReadiness({ subject, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: d, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); const b = evaluateDelegationReadiness({ subject, requirements: [r2, r1], qualifications: [q2, q1], dependencySnapshot: d, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); expect(a.readinessContentHash).toBe(b.readinessContentHash); });
  it("keeps signal content hash independent of identity and capture time", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = a; void _hash; const b = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", capturedAt: "2026-08-18T13:00:00.000Z" }); expect(a.contentHash).toBe(b.contentHash); });

  it("rejects a subject from another tenant", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, ownerTenantId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at }).state).toBe("NEEDS_CONTEXT"); });
  it("rejects a subject for another transaction", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, transactionId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at }).state).toBe("NEEDS_CONTEXT"); });
  it("does not accept a caller-replaced requirement hash", () => { const r = requirement(); const s = signal(r, "x"); const fake = { ...r, requirementDefinitionHash: H_OTHER }; const q = qualify(fake, [s]); expect(q.outcome).toBe("INVALID"); });
  it("does not accept a caller-replaced qualification hash", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const fake = { ...q, qualificationContentHash: H_OTHER }; const a = ready(r, fake, dependency([s])); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("ignores caller-supplied verifier callbacks", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const { dependencySnapshotHash: _hash, ...input } = d; void _hash; const bound = createDependencySnapshot({ ...input, requirementDefinitionHashes: [r.requirementDefinitionHash] }); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: bound, createdAt: at, verify: () => ({ state: "READY" }) } as never); expect(a.state).toBe("READY"); });
  it("ignores caller-supplied final state", () => { const r = requirement(); const q = qualify(r, []); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: dependency([]), state: "READY" } as never); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("returns deeply immutable assessment data", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(Object.isFrozen(a)).toBe(true); expect(() => { (a as { state: string }).state = "READY"; }).toThrow(); });
  it("does not treat duplicate equivalent signals as contradictory", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [b, a]).outcome).toBe("QUALIFIED"); });
  it("allows delegation only for READY and CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(isDelegable(a, "CURRENT")).toBe(true); expect(isDelegable(a, "STALE")).toBe(false); const conditioned = ready(r, q, dependency([s]), { conditionCodes: ["REVIEW"] }); expect(isDelegable(conditioned, "CURRENT")).toBe(false); });
  it("rejects INFERRED when the critical definition does not accept it", () => { const r = requirement(); const s = signal(r, "x", H_SOURCE, undefined, "CUSTOMER_STATED"); const inferred = { ...s, provenance: "INFERRED" as const }; const { contentHash: _hash, ...input } = inferred; void _hash; const rebuilt = createSignal(input); expect(qualify(r, [rebuilt]).outcome).toBe("INCOMPATIBLE_PROVENANCE"); });
  it("qualifies INFERRED only when explicitly accepted by the definition", () => { const r = requirement({ acceptedProvenance: ["INFERRED"] }); const s = signal(r, "x", H_SOURCE, undefined, "CUSTOMER_STATED"); const { contentHash: _hash, ...input } = s; void _hash; const inferred = createSignal({ ...input, provenance: "INFERRED" }); expect(qualify(r, [inferred]).outcome).toBe("QUALIFIED"); });
  it("does not delegate an expired READY assessment", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const d = dependency([s]); const a = ready(r, q, d, { validUntil: "2026-08-18T11:59:00.000Z" }); const { dependencySnapshotHash: _hash, ...input } = d; void _hash; const bound = createDependencySnapshot({ ...input, requirementDefinitionHashes: [r.requirementDefinitionHash] }); expect(evaluateReadinessValidity(a, bound, at)).toBe("EXPIRED"); expect(isDelegable(a, "EXPIRED")).toBe(false); });
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
  it("rejects qualification A reused against dependency B", () => { const r = requirement(); const s = signal(r, "x"); const a = boundDependency([r], [s]); const q = evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: a, evaluationTime: at, qualifiedAt: at }); const b = boundDependency([r], [s], { transactionSemanticHash: H_OTHER }); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: b }).state).not.toBe("READY"); });
  it("rejects a requirement absent from the dependency snapshot", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([], [s]); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("rejects a signal absent from snapshot references", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], []); expect(evaluateSignalQualification({ requirement: r, signals: [s], currentDependencySnapshot: d, evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("rejects omitted contradictory snapshot evidence", () => { const r = requirement(); const a = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = boundDependency([r], [a, b]); expect(evaluateSignalQualification({ requirement: r, signals: [a], currentDependencySnapshot: d, evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign tenant signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, ownerTenantId: "90000000-0000-4000-8000-000000000009" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign transaction signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, transactionId: "90000000-0000-4000-8000-000000000019" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("rejects a foreign requirement signal", () => { const r = requirement(); const local = signal(r, "x"); const { contentHash: _hash, ...input } = local; void _hash; const foreign = createSignal({ ...input, requirementId: "other.requirement" }); expect(evaluateSignalQualification({ requirement: r, signals: [foreign], currentDependencySnapshot: boundDependency([r], [foreign]), evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("fails closed for duplicate conflicting requirement ids", () => { const first = requirement("same.id"); const second = requirement("same.id", { semanticType: "DIFFERENT" }); const s = signal(first, "x"); const q = qualify(first, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [first, second], qualifications: [q], dependencySnapshot: boundDependency([first, second], [s]) }).state).not.toBe("READY"); });
  it("fails closed for duplicate qualification ids", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const missing = qualify(r, [], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q, missing], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("keeps qualification permutations deterministic and non-authorizing", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const missing = qualify(r, [], d); const one = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q, missing], dependencySnapshot: d }); const two = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [missing, q], dependencySnapshot: d }); expect(one.state).not.toBe("READY"); expect(two.state).not.toBe("READY"); expect(one.readinessContentHash).toBe(two.readinessContentHash); });
  it("does not contradict equal values from different accepted provenance", () => { const r = requirement("same.value", { acceptedProvenance: ["OBSERVED", "CUSTOMER_STATED"] }); const observed = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004", "OBSERVED"); const { contentHash: _hash, ...input } = observed; void _hash; const stated = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", provenance: "CUSTOMER_STATED" }); expect(qualify(r, [observed, stated], boundDependency([r], [observed, stated])).outcome).toBe("QUALIFIED"); });
  it("does not contradict equal values from different sources", () => { const r = requirement("same.source"); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = first; void _hash; const second = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", source: { identity: "other", version: "2", hash: H_OTHER } }); expect(qualify(r, [first, second], boundDependency([r], [first, second])).outcome).toBe("QUALIFIED"); });
  it("contradicts distinct semantic values", () => { const r = requirement(); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const second = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [first, second], boundDependency([r], [first, second])).outcome).toBe("CONTRADICTORY"); });
  it("does not qualify an expired signal", () => { const r = requirement(); const expired = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = expired; void _hash; const rebuilt = createSignal({ ...input, validUntil: "2026-08-18T11:00:00.000Z" }); expect(evaluateSignalQualification({ requirement: r, signals: [rebuilt], currentDependencySnapshot: boundDependency([r], [rebuilt]), evaluationTime: at, qualifiedAt: at }).outcome).toBe("STALE_SOURCE"); });
  it("rejects a dependency identity mismatch", () => { const r = requirement(); const s = signal(r, "x"); const { contentHash: _hash, ...input } = s; void _hash; const wrong = createSignal({ ...input, dependency: { identity: "wrong.identity", hash: H_SOURCE } }); expect(qualify(r, [wrong], boundDependency([r], [wrong])).outcome).toBe("STALE_SOURCE"); });
  it("rejects wrong identity even when an unrelated hash coincides", () => { const r = requirement(); const s = signal(r, "x"); const { contentHash: _hash, ...input } = s; void _hash; const wrong = createSignal({ ...input, dependency: { identity: "policy", hash: H_SOURCE } }); const d = boundDependency([r], [wrong], { dependencyBindings: [{ identity: "asset.version", hash: H_SOURCE }, { identity: "policy", hash: H_SOURCE }] }); expect(qualify(r, [wrong], d).outcome).toBe("STALE_SOURCE"); });
  it("rejects contradictory top-level readiness bindings", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d, blueprintHash: H_OTHER }).state).not.toBe("READY"); });
  it("does not authorize an empty requirement set", () => { expect(evaluateDelegationReadiness({ subject, requirements: [], qualifications: [], dependencySnapshot: dependency([]) }).state).toBe("INSUFFICIENT_SIGNAL"); });
  it("rejects a qualification for an unknown requirement", () => { const r = requirement(); const unknown = requirement("unknown.requirement"); const s = signal(unknown, "x"); const q = qualify(unknown, [s]); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: boundDependency([r], [s]) }).state).not.toBe("READY"); });
  it("rejects an extra snapshot requirement", () => { const r = requirement(); const extra = requirement("extra.requirement"); const s = signal(r, "x"); const d = boundDependency([r, extra], [s]); const q = qualify(r, [s], d); expect(evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }).state).not.toBe("READY"); });
  it("rejects an extra snapshot signal reference omitted from evaluation", () => { const r = requirement(); const first = signal(r, "A", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const extra = signal(r, "B", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = boundDependency([r], [first, extra]); expect(evaluateSignalQualification({ requirement: r, signals: [first], currentDependencySnapshot: d, evaluationTime: at, qualifiedAt: at }).outcome).toBe("INVALID"); });
  it("rejects conflicting dependency identity duplicates", () => { const r = requirement(); const s = signal(r, "x"); expect(() => boundDependency([r], [s], { dependencyBindings: [{ identity: "asset.version", hash: H_SOURCE }, { identity: "asset.version", hash: H_OTHER }] })).toThrow(); });
  it("proves the exact valid chain is delegable", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }); expect(a.state).toBe("READY"); expect(evaluateReadinessValidity(a, d, at)).toBe("CURRENT"); expect(isDelegable(a, "CURRENT")).toBe(true); });
  it("marks the historical readiness stale after a material dependency change", () => { const r = requirement(); const s = signal(r, "x"); const d = boundDependency([r], [s]); const q = qualify(r, [s], d); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: d }); const changed = boundDependency([r], [s], { transactionSemanticHash: H_OTHER }); expect(evaluateReadinessValidity(a, changed, at)).toBe("STALE"); expect(isDelegable(a, "STALE")).toBe(false); });
});
