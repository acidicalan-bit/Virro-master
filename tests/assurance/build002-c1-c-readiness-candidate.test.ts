import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  verifyQualificationHash,
  verifyReadinessHash,
  verifyDependencySnapshotHash,
  type Signal,
  type SignalRequirement,
  type SignalQualification,
} from "@/src/domain/outcome/signal-readiness";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { OutcomeReadinessCandidateError, OutcomeReadinessCandidateResolver } from "@/src/application/outcome/resolve-outcome-readiness-candidate";

const TENANT = "10000000-0000-4000-8000-000000000001";
const TRANSACTION = "20000000-0000-4000-8000-000000000001";
const BLUEPRINT = "30000000-0000-4000-8000-000000000001";
const EVALUATION_TIME = "2026-08-20T12:00:00.000Z";
const BLUEPRINT_HASH = "a".repeat(64);
const SOURCE_HASH = "b".repeat(64);
const ASSET_HASH = "c".repeat(64);

function requirement(id: string, overrides: Partial<Parameters<typeof compileSignalRequirement>[0]> = {}): SignalRequirement {
  return compileSignalRequirement({
    requirementId: id,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, required: true },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, required: true },
    ],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
    ...overrides,
  }, EVALUATION_TIME);
}

function signal(requirementId: string, id: string, overrides: Partial<Parameters<typeof createSignal>[0]> = {}): Signal {
  return createSignal({
    signalId: id,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId,
    payload: { value: id },
    source: { identity: "fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: "2026-08-20T11:00:00.000Z",
    validUntil: null,
    dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: ASSET_HASH },
    schemaVersion: "build002-signal-v0.2",
    ...overrides,
  });
}

function fixture(requirements: SignalRequirement[], signals: Signal[][]) {
  const snapshot = createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: requirements.map((item) => item.requirementDefinitionHash),
    signalReferences: signals.flatMap((items) => items.map((item) => ({ requirementId: item.requirementId, signalId: item.signalId, contentHash: item.contentHash }))),
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: BLUEPRINT_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: ASSET_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: "d".repeat(64) },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: null,
    taskSpecHash: null,
    transactionSemanticHash: "d".repeat(64),
    sourceAssetVersionHash: ASSET_HASH,
    contextLensHash: null,
  });
  const authority = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    binding: {},
    blueprint: { hash: BLUEPRINT_HASH },
    requirementProfile: {},
    signalRequirements: requirements,
    resolvedAt: EVALUATION_TIME,
  } as ResolvedOutcomeRequirementAuthority;
  const universe = {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    requirements: requirements.map((requirementValue, index) => ({ requirement: requirementValue, signals: signals[index] ?? [] })),
  } as ResolvedOutcomeSignalUniverse;
  const dependency = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, dependencySnapshot: snapshot } as ResolvedOutcomeDependencySnapshot;
  return { authority, universe, dependency };
}

function runCandidate(requirements: SignalRequirement[], signals: Signal[][], time = EVALUATION_TIME) {
  return new OutcomeReadinessCandidateResolver({ now: () => time }).resolve(...Object.values(fixture(requirements, signals)) as [ResolvedOutcomeRequirementAuthority, ResolvedOutcomeSignalUniverse, ResolvedOutcomeDependencySnapshot]);
}

function oppositeHashPair(): [SignalRequirement, SignalRequirement] {
  const beta = requirement("beta");
  for (let index = 0; index < 200; index += 1) {
    const alpha = requirement("alpha", { semanticType: `TEXT-ALPHA-${index}` });
    if (alpha.requirementDefinitionHash > beta.requirementDefinitionHash) return [alpha, beta];
  }
  throw new Error("Unable to construct opposite requirement/hash ordering");
}

describe("BUILD002-C1-C server-owned readiness candidate", () => {
  it("produces one qualification per authoritative requirement and a READY candidate", () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const result = runCandidate([first, second], [[signal(first.requirementId, "40000000-0000-4000-8000-000000000001")], [signal(second.requirementId, "40000000-0000-4000-8000-000000000002")]]);
    expect(result.qualifications).toHaveLength(2);
    expect(result.qualifications.map((item) => item.requirementId)).toEqual(["signal.a", "signal.b"]);
    expect(result.qualifications.every((item) => item.outcome === "QUALIFIED")).toBe(true);
    expect(result.readiness.state).toBe("READY");
    expect(result.evaluationTime).toBe(EVALUATION_TIME);
    expect(result.qualifications.every((item) => item.qualifiedAt === EVALUATION_TIME)).toBe(true);
    expect(result.readiness.createdAt).toBe(EVALUATION_TIME);
    expect(result.consistency).toBe("NON_ATOMIC_CANDIDATE_EVALUATION");
    expect(result.qualifications.every(verifyQualificationHash)).toBe(true);
    expect(verifyReadinessHash(result.readiness)).toBe(true);
    expect(verifyDependencySnapshotHash(result.dependencySnapshot)).toBe(true);
  });

  it("R1 counterexample: requirement id order is independent from hash order", () => {
    const [alpha, beta] = oppositeHashPair();
    expect("alpha" < "beta").toBe(true);
    expect(alpha.requirementDefinitionHash > beta.requirementDefinitionHash).toBe(true);
    const result = runCandidate([alpha, beta], [
      [signal(alpha.requirementId, "40000000-0000-4000-8000-000000000014")],
      [signal(beta.requirementId, "40000000-0000-4000-8000-000000000015")],
    ]);
    expect(result.readiness.state).toBe("READY");
  });

  it("keeps three-requirement semantic hashes stable under independent permutations", () => {
    const [alpha, beta] = oppositeHashPair();
    const gamma = requirement("gamma", { semanticType: "TEXT-GAMMA" });
    const requirements = [alpha, beta, gamma];
    const signals = requirements.map((item, index) => [signal(item.requirementId, `40000000-0000-4000-8000-0000000000${16 + index}`)]);
    const base = fixture(requirements, signals);
    const permuted = {
      authority: { ...base.authority, signalRequirements: [gamma, alpha, beta] } as unknown as ResolvedOutcomeRequirementAuthority,
      universe: {
        ...base.universe,
        requirements: [
          { ...base.universe.requirements[1], signals: [...base.universe.requirements[1].signals].reverse() },
          { ...base.universe.requirements[2], signals: [...base.universe.requirements[2].signals].reverse() },
          { ...base.universe.requirements[0], signals: [...base.universe.requirements[0].signals].reverse() },
        ],
      },
      dependency: base.dependency,
    } as const;
    const left = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(base.authority, base.universe, base.dependency);
    const right = new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(permuted.authority, permuted.universe, permuted.dependency);
    expect(left.readiness.state).toBe("READY");
    expect(right.readiness.state).toBe("READY");
    for (const requirementValue of requirements) {
      expect(left.qualifications.find((item) => item.requirementId === requirementValue.requirementId)?.qualificationContentHash)
        .toBe(right.qualifications.find((item) => item.requirementId === requirementValue.requirementId)?.qualificationContentHash);
    }
    expect(left.readiness.readinessContentHash).toBe(right.readiness.readinessContentHash);
  });

  it.each([
    ["task.spec", [{ identity: "task.spec", required: true }]],
    ["context.lens", [{ identity: "context.lens", required: true }]],
    ["unknown.current", [{ identity: "unknown.current", required: true }]],
  ])("fails closed when required dependency authority is unavailable: %s", (_identity, selector) => {
    const req = requirement(`signal.${String(_identity).replace(".", "-")}`, { dependencySelectors: [
      { identity: "asset.version", required: true },
      { identity: "blueprint", required: true },
      { identity: "transaction.semantic", required: true },
      ...selector,
    ] });
    const result = runCandidate([req], [[signal(req.requirementId, "40000000-0000-4000-8000-000000000019")]]);
    expect(result.qualifications[0].outcome).toBe("INVALID");
    expect(result.qualifications[0].reasonCode).toBe("DEPENDENCY_BINDING_MISSING");
    expect(result.readiness.state).toBe("INSUFFICIENT_SIGNAL");
  });

  it("does not accept caller condition, policy, historical evaluator, time, or READY material", () => {
    const req = requirement("signal.authority");
    const result = runCandidate([req], [[signal(req.requirementId, "40000000-0000-4000-8000-000000000020")]]);
    expect(result.readiness.conditionCodes).toEqual([]);
    expect(result.readiness.state).toBe("READY");
    expect(result.evaluator.version).toBe("0.2.0");
    const server = readFileSync(pathResolve(process.cwd(), "src/server/outcome-readiness-candidate-resolver.ts"), "utf8");
    expect(server).not.toMatch(/request\.json|searchParams|evaluationTime|conditionCodes|policyBlock/);
    const service = readFileSync(pathResolve(process.cwd(), "src/application/outcome/resolve-outcome-readiness-candidate.ts"), "utf8");
    expect(service).toContain("currentDefaultEvaluator()");
    expect(service).toContain("conditionCodes: []");
    expect(service).toContain("policyBlock: null");
    expect(service).not.toMatch(/findReadiness|listReadiness|insertReadiness|isDelegable|evaluateReadinessValidity/);
  });

  it("rejects duplicate authoritative hashes and true snapshot mismatches", () => {
    const [alpha, beta] = oppositeHashPair();
    const valid = fixture([alpha, beta], [
      [signal(alpha.requirementId, "40000000-0000-4000-8000-000000000021")],
      [signal(beta.requirementId, "40000000-0000-4000-8000-000000000022")],
    ]);
    const duplicate = { ...valid.authority, signalRequirements: [alpha, { ...beta, requirementDefinitionHash: alpha.requirementDefinitionHash }] } as ResolvedOutcomeRequirementAuthority;
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(duplicate, valid.universe, valid.dependency)).toThrowError(new OutcomeReadinessCandidateError("READINESS_CANDIDATE_UNIVERSE_MISMATCH"));
    const missing = { ...valid.dependency, dependencySnapshot: { ...valid.dependency.dependencySnapshot, requirementDefinitionHashes: [alpha.requirementDefinitionHash] } } as ResolvedOutcomeDependencySnapshot;
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(valid.authority, valid.universe, missing)).toThrowError();
  });

  it.each([
    ["zero signals", () => ({ requirements: [requirement("signal.empty")], signals: [[]], outcome: "MISSING" })],
    ["future signal", () => { const req = requirement("signal.future"); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000003", { capturedAt: "2026-08-20T13:00:00.000Z" })]], outcome: "INVALID" }; }],
    ["invalid temporal window", () => { const req = requirement("signal.temporal"); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000004", { capturedAt: "2026-08-20T11:00:00.000Z", validUntil: "2026-08-20T10:00:00.000Z" })]], outcome: "INVALID" }; }],
    ["expired signal", () => { const req = requirement("signal.expired"); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000005", { validUntil: "2026-08-20T11:59:00.000Z" })]], outcome: "STALE_SOURCE" }; }],
    ["incompatible provenance", () => { const req = requirement("signal.provenance"); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000006", { provenance: "CUSTOMER_STATED" })]], outcome: "INCOMPATIBLE_PROVENANCE" }; }],
    ["unknown provenance", () => { const req = requirement("signal.unknown", { acceptedProvenance: ["UNKNOWN"] }); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000007", { provenance: "UNKNOWN" })]], outcome: "UNKNOWN" }; }],
    ["human review", () => { const req = requirement("signal.review", { qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: true } }); return { requirements: [req], signals: [[signal(req.requirementId, "40000000-0000-4000-8000-000000000008")]], outcome: "REQUIRES_HUMAN_REVIEW" }; }],
  ])("classifies %s without caller authority", (_name, make) => {
    const value = make();
    const result = runCandidate(value.requirements, value.signals);
    expect(result.qualifications[0].outcome).toBe(value.outcome);
    expect(result.readiness.state).toBe(value.outcome === "REQUIRES_HUMAN_REVIEW" ? "HUMAN_REVIEW_REQUIRED" : "INSUFFICIENT_SIGNAL");
  });

  it("classifies stale dependency and contradiction", () => {
    const req = requirement("signal.stale");
    const stale = signal(req.requirementId, "40000000-0000-4000-8000-000000000009", { dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: "e".repeat(64) } });
    expect(runCandidate([req], [[stale]]).qualifications[0].outcome).toBe("STALE_SOURCE");
    const second = signal(req.requirementId, "40000000-0000-4000-8000-000000000010", { payload: { value: "different" } });
    const result = runCandidate([req], [[signal(req.requirementId, "40000000-0000-4000-8000-000000000011"), second]]);
    expect(result.qualifications[0].outcome).toBe("CONTRADICTORY");
  });

  it("rejects incomplete or cross-tenant composition before evaluation", () => {
    const req = requirement("signal.a");
    const value = fixture([req], [[signal(req.requirementId, "40000000-0000-4000-8000-000000000012")]]);
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve({ ...value.authority, ownerTenantId: "10000000-0000-4000-8000-000000000099" }, value.universe, value.dependency)).toThrowError(new OutcomeReadinessCandidateError("READINESS_CANDIDATE_AUTHORITY_MISMATCH"));
    expect(() => new OutcomeReadinessCandidateResolver({ now: () => EVALUATION_TIME }).resolve(value.authority, { ...value.universe, requirements: [] }, value.dependency)).toThrowError(new OutcomeReadinessCandidateError("READINESS_CANDIDATE_UNIVERSE_MISMATCH"));
  });

  it("is deterministic, deeply immutable, and ignores caller-owned request material", () => {
    const req = requirement("signal.a");
    const sig = signal(req.requirementId, "40000000-0000-4000-8000-000000000013");
    const left = runCandidate([req], [[sig]]);
    const right = runCandidate([req], [[sig]], EVALUATION_TIME);
    expect(left.qualifications[0].qualificationContentHash).toBe(right.qualifications[0].qualificationContentHash);
    expect(left.readiness.readinessContentHash).toBe(right.readiness.readinessContentHash);
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.qualifications)).toBe(true);
    expect(Object.isFrozen(left.readiness)).toBe(true);
    expect(() => (left.qualifications as SignalQualification[]).push(left.qualifications[0])).toThrow();
    const server = readFileSync(pathResolve(process.cwd(), "src/server/outcome-readiness-candidate-resolver.ts"), "utf8");
    expect(server).toMatch(/request:\s*Request,\s*\n\s*outcomeTransactionId:\s*string/);
    expect(server).not.toMatch(/request\.json|searchParams|evaluationTime|isDelegable|evaluateReadinessValidity/);
    const service = readFileSync(pathResolve(process.cwd(), "src/application/outcome/resolve-outcome-readiness-candidate.ts"), "utf8");
    expect(service).not.toMatch(/isDelegable|evaluateReadinessValidity|insert|updateStatus|fetch|supabase/);
  });
});
