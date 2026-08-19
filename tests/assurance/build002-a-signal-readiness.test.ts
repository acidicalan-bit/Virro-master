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

function requirement(overrides: Partial<Parameters<typeof compileSignalRequirement>[0]> = {}): SignalRequirement {
  return compileSignalRequirement({
    requirementId: "source.intent",
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
    ...overrides,
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
    signalReferences: signals.map((item) => ({ signalId: item.signalId, contentHash: item.contentHash })),
    blueprintHash: H_BLUEPRINT,
    policyHash: H_POLICY,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: sourceHash,
    contextLensHash: null,
  });
}

function qualify(req: SignalRequirement, signals: Signal[], current = dependency(signals)) {
  return evaluateSignalQualification({ requirement: req, signals, currentDependencySnapshot: current, evaluator, qualifiedAt: at, idFactory: () => "50000000-0000-4000-8000-000000000005" });
}

function ready(req: SignalRequirement, qualification: ReturnType<typeof qualify>, current = dependency([]), extras: Partial<Parameters<typeof evaluateDelegationReadiness>[0]> = {}) {
  return evaluateDelegationReadiness({ subject, requirements: [req], qualifications: [qualification], dependencySnapshot: current, evaluator, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006", ...extras });
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

  it("marks matching dependency CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(evaluateReadinessValidity(a, dependency([s]), at)).toBe("CURRENT"); });
  it("marks changed dependency STALE", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(evaluateReadinessValidity(a, dependency([s], H_OTHER), at)).toBe("STALE"); });
  it("marks elapsed validUntil EXPIRED", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s]), { validUntil: "2026-08-18T11:59:00.000Z" }); expect(evaluateReadinessValidity(a, dependency([s]), at)).toBe("EXPIRED"); });

  it("canonicalizes dependency references independent of order", () => { const r = requirement(); const a = signal(r, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(dependency([a, b]).dependencySnapshotHash).toBe(dependency([b, a]).dependencySnapshotHash); });
  it("canonicalizes requirement and qualification sets independent of order", () => { const r1 = requirement({ requirementId: "a.first" }); const r2 = requirement({ requirementId: "b.second" }); const s1 = signal(r1, "a", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const s2 = signal(r2, "b", H_SOURCE, "40000000-0000-4000-8000-000000000014"); const d = dependency([s1, s2]); const q1 = qualify(r1, [s1], d); const q2 = qualify(r2, [s2], d); const a = evaluateDelegationReadiness({ subject, requirements: [r1, r2], qualifications: [q1, q2], dependencySnapshot: d, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); const b = evaluateDelegationReadiness({ subject, requirements: [r2, r1], qualifications: [q2, q1], dependencySnapshot: d, createdAt: at, idFactory: () => "60000000-0000-4000-8000-000000000006" }); expect(a.readinessContentHash).toBe(b.readinessContentHash); });
  it("keeps signal content hash independent of identity and capture time", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const { contentHash: _hash, ...input } = a; void _hash; const b = createSignal({ ...input, signalId: "40000000-0000-4000-8000-000000000014", capturedAt: "2026-08-18T13:00:00.000Z" }); expect(a.contentHash).toBe(b.contentHash); });

  it("rejects a subject from another tenant", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, ownerTenantId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at }).state).toBe("NEEDS_CONTEXT"); });
  it("rejects a subject for another transaction", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); expect(evaluateDelegationReadiness({ subject: { ...subject, transactionId: "90000000-0000-4000-8000-000000000009" }, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at }).state).toBe("NEEDS_CONTEXT"); });
  it("does not accept a caller-replaced requirement hash", () => { const r = requirement(); const s = signal(r, "x"); const fake = { ...r, requirementDefinitionHash: H_OTHER }; const q = qualify(fake, [s]); expect(q.outcome).toBe("INVALID"); });
  it("does not accept a caller-replaced qualification hash", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const fake = { ...q, qualificationContentHash: H_OTHER }; const a = ready(r, fake, dependency([s])); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("ignores caller-supplied verifier callbacks", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: dependency([s]), createdAt: at, verify: () => ({ state: "READY" }) } as never); expect(a.state).toBe("READY"); });
  it("ignores caller-supplied final state", () => { const r = requirement(); const q = qualify(r, []); const a = evaluateDelegationReadiness({ subject, requirements: [r], qualifications: [q], dependencySnapshot: dependency([]), state: "READY" } as never); expect(a.state).toBe("INSUFFICIENT_SIGNAL"); });
  it("returns deeply immutable assessment data", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(Object.isFrozen(a)).toBe(true); expect(() => { (a as { state: string }).state = "READY"; }).toThrow(); });
  it("does not treat duplicate equivalent signals as contradictory", () => { const r = requirement(); const a = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000004"); const b = signal(r, "same", H_SOURCE, "40000000-0000-4000-8000-000000000014"); expect(qualify(r, [b, a]).outcome).toBe("QUALIFIED"); });
  it("allows delegation only for READY and CURRENT", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(isDelegable(a, "CURRENT")).toBe(true); expect(isDelegable(a, "STALE")).toBe(false); const conditioned = ready(r, q, dependency([s]), { conditionCodes: ["REVIEW"] }); expect(isDelegable(conditioned, "CURRENT")).toBe(false); });
});

describe("BUILD 002-A hash integrity", () => {
  it("verifies generated qualification and readiness hashes", () => { const r = requirement(); const s = signal(r, "x"); const q = qualify(r, [s]); const a = ready(r, q, dependency([s])); expect(verifyQualificationHash(q)).toBe(true); expect(verifyReadinessHash(a)).toBe(true); });
});
