import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OutcomeReadinessAuthorityCurrentnessRevalidator,
  OutcomeReadinessCurrentnessError,
} from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import { OutcomeDependencySnapshotError } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import { currentDefaultEvaluator, type DependencySnapshot, type EvaluatorIdentity } from "@/src/domain/outcome/signal-readiness";
import {
  authorityContext,
  COMMIT,
  FOREIGN_COMMIT,
  FOREIGN_TENANT,
  FOREIGN_TRANSACTION,
  makeVerifierFixture,
  REVALIDATION_TIME,
  setClock,
  setCurrentDependency,
  setCurrentEvaluator,
  changedSnapshot,
  type VerifierFixture,
} from "./fixture";

function run(fixture: VerifierFixture, input: Record<string, unknown> = { authority: authorityContext, authorityCommitId: COMMIT }) {
  return new OutcomeReadinessAuthorityCurrentnessRevalidator(fixture.dependencies).run(input as never);
}

function expectGraphInvalid(fixture: VerifierFixture, input?: Record<string, unknown>) {
  return expect(run(fixture, input)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
}

describe("BUILD002-C1-D2-R2 independent currentness verifier", () => {
  it("accepts only authority and authorityCommitId; injected semantics do not change the result", async () => {
    const clean = await run(makeVerifierFixture("READY"));
    const attacked = await run(makeVerifierFixture("READY"), {
      authority: authorityContext,
      authorityCommitId: COMMIT,
      ownerTenantId: FOREIGN_TENANT,
      outcomeTransactionId: FOREIGN_TRANSACTION,
      readiness: { state: "READY" },
      readinessId: "attacker",
      signals: [],
      dependencySnapshot: {},
      evaluator: { version: "attacker" },
      revalidationTime: "1900-01-01T00:00:00.000Z",
      currentness: "EXPIRED",
      isDelegable: true,
      canExecute: true,
    });
    expect(attacked.currentness).toBe(clean.currentness);
    expect(attacked.revalidatedAt).toBe(REVALIDATION_TIME);
  });

  it("copies tenant, principal, membership and source before the first await", async () => {
    const fixture = makeVerifierFixture();
    let release!: () => void;
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => new Promise((resolve) => { release = () => resolve(fixture.commit); }) };
    const mutable = { ...authorityContext } as { -readonly [K in keyof typeof authorityContext]: (typeof authorityContext)[K] };
    const pending = run(fixture, { authority: mutable, authorityCommitId: COMMIT });
    mutable.tenantId = FOREIGN_TENANT;
    mutable.principalId = "20000000-0000-4000-8000-000000000002";
    mutable.membershipId = "30000000-0000-4000-8000-000000000002";
    mutable.authoritySource = "ATTACKER" as typeof mutable.authoritySource;
    release();
    await expect(pending).resolves.toMatchObject({ currentness: "CURRENT" });
  });

  it("uses bounded not-found behavior for both nonexistent and foreign IDs", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async ({ authorityCommitId }) => authorityCommitId === COMMIT ? fixture.commit : null };
    const missing = run(fixture, { authority: authorityContext, authorityCommitId: "70000000-0000-4000-8000-000000000099" });
    const foreign = run(fixture, { authority: authorityContext, authorityCommitId: FOREIGN_COMMIT });
    await expect(missing).rejects.toEqual(new OutcomeReadinessCurrentnessError("AUTHORITY_COMMIT_NOT_FOUND"));
    await expect(foreign).rejects.toEqual(new OutcomeReadinessCurrentnessError("AUTHORITY_COMMIT_NOT_FOUND"));
  });

  it("rejects a coherent same-tenant substitution before C0-D", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => { fixture.calls.push("SCOPED_COMMIT_READ"); return { ...fixture.commit, authorityCommitId: FOREIGN_COMMIT }; } };
    await expectGraphInvalid(fixture);
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ"]);
  });

  it.each([
    ["wrong schema", { schemaVersion: "build002-readiness-authority-commit-v9.9" }],
    ["empty schema", { schemaVersion: "" }],
    ["blank dependency ID", { dependencySnapshotId: " " }],
    ["blank readiness ID", { readinessId: " " }],
    ["blank dependency hash", { dependencySnapshotHash: " " }],
    ["blank readiness hash", { readinessContentHash: " " }],
    ["blank transaction", { outcomeTransactionId: " " }],
    ["blank principal", { principalId: " " }],
  ])("rejects marker corruption: %s", async (_label, override) => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, ...override }) as typeof fixture.commit };
    await expectGraphInvalid(fixture);
  });

  it("rejects evaluation after commit and performs no later phase", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: "2026-08-21T09:59:59.999Z" }) };
    await expectGraphInvalid(fixture);
    expect(fixture.calls).not.toContain("C0-D");
  });

  it("accepts semantic equality for evaluation and commit instants", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, evaluationTime: "2026-08-21T10:00:00Z", committedAt: "2026-08-21T10:00:00Z" }) };
    await expect(run(fixture)).resolves.toMatchObject({ currentness: "CURRENT" });
  });

  it.each([
    ["invalid text", "invalid"],
    ["offset", "2026-08-21T10:00:00+01:00"],
    ["sub-millisecond precision", "2026-08-21T10:00:00.0001Z"],
  ])("rejects unsupported historical instant: %s", async (_label, value) => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, evaluationTime: value }) };
    await expectGraphInvalid(fixture);
  });

  it("rejects revalidation before commit without C1-A, C1-B or validity evaluation", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: "2026-08-21T11:00:01.000Z" }) };
    setClock(fixture, "2026-08-21T11:00:00.999Z");
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
    expect(fixture.calls).not.toContain("C1-A");
    expect(fixture.calls).not.toContain("C1-B");
  });

  it("accepts semantic equality for commit and revalidation instants", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.scopedCommitReader = { findByScopedId: async () => ({ ...fixture.commit, committedAt: "2026-08-21T11:00:00Z" }) };
    setClock(fixture, REVALIDATION_TIME);
    await expect(run(fixture)).resolves.toMatchObject({ currentness: "CURRENT" });
  });

  it.each([
    ["readiness ID", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, id: "60000000-0000-4000-8000-000000000099" })],
    ["readiness hash", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, readinessContentHash: "f".repeat(64) })],
    ["foreign tenant", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, ownerTenantId: FOREIGN_TENANT })],
    ["wrong transaction", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, transactionId: FOREIGN_TRANSACTION })],
    ["wrong dependency", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, dependencySnapshotHash: "f".repeat(64) })],
    ["wrong createdAt", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, createdAt: "2026-08-21T10:01:00.000Z" })],
    ["malformed createdAt", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, createdAt: "invalid" })],
    ["invalid evaluator", (r: VerifierFixture["assessment"]["readiness"]) => ({ ...r, evaluator: { ...r.evaluator, definitionHash: "f".repeat(64) } })],
  ])("rejects historical readiness corruption: %s", async (_label, mutate) => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findReadiness: async () => mutate(fixture.assessment.readiness) };
    await expectGraphInvalid(fixture);
  });

  it.each([
    ["missing", null],
    ["bad hash", { ...makeVerifierFixture().assessment.dependency, dependencySnapshotHash: "f".repeat(64) }],
    ["foreign tenant", { ...makeVerifierFixture().assessment.dependency, ownerTenantId: FOREIGN_TENANT }],
    ["wrong transaction", { ...makeVerifierFixture().assessment.dependency, transactionId: FOREIGN_TRANSACTION }],
    ["marker mismatch", { ...makeVerifierFixture().assessment.dependency, dependencySnapshotHash: "e".repeat(64) }],
  ])("rejects historical dependency corruption: %s", async (_label, dependency) => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findDependencySnapshot: async () => dependency as DependencySnapshot | null };
    await expectGraphInvalid(fixture);
    expect(fixture.calls).not.toContain("C1-A");
  });

  it("uses only the marker transaction for C0-D and rejects a mismatched C0-D result", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.requirementAuthority = { resolve: async () => ({ ...fixture.resolvedAuthority, ownerTenantId: FOREIGN_TENANT }) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("HISTORICAL_GRAPH_INVALID"));
  });

  it.each([
    ["foreign tenant", { ownerTenantId: FOREIGN_TENANT }],
    ["wrong transaction", { outcomeTransactionId: FOREIGN_TRANSACTION }],
  ])("fails closed for current dependency scope: %s", async (_label, override) => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.dependencySnapshot = { resolve: async () => ({ ...fixture.resolvedDependency(), ...override }) };
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
  });

  it("fails closed for invalid current dependency hash and malformed snapshot", async () => {
    const fixture = makeVerifierFixture();
    setCurrentDependency(fixture, { ...fixture.assessment.dependency, dependencySnapshotHash: "f".repeat(64) });
    await expect(run(fixture)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
    const malformed = makeVerifierFixture();
    malformed.dependencies.dependencySnapshot = { resolve: async () => ({ ...malformed.resolvedDependency(), dependencySnapshot: {} as DependencySnapshot }) };
    await expect(run(malformed)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
  });

  it("maps only SOURCE_ASSET_HEAD_CHANGED to STALE", async () => {
    const fixture = makeVerifierFixture();
    fixture.dependencies.dependencySnapshot = { resolve: async () => { throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_CHANGED"); } };
    await expect(run(fixture)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["SOURCE_ASSET_HEAD_CHANGED"] });
    const unavailable = makeVerifierFixture();
    unavailable.dependencies.dependencySnapshot = { resolve: async () => { throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_UNAVAILABLE"); } };
    await expect(run(unavailable)).rejects.toEqual(new OutcomeReadinessCurrentnessError("CURRENTNESS_PHASE_FAILED"));
  });

  it.each(["READY", "INSUFFICIENT_SIGNAL", "HUMAN_REVIEW_REQUIRED"] as const)("accepts unchanged %s as CURRENT without delegability", async (state) => {
    await expect(run(makeVerifierFixture(state))).resolves.toMatchObject({ currentness: "CURRENT" });
  });

  it.each([
    ["added", [{ requirementId: "signal.readiness", signalId: "90000000-0000-4000-8000-000000000099", contentHash: "1".repeat(64) }]],
    ["removed", []],
    ["changed", [{ requirementId: "signal.readiness", signalId: "90000000-0000-4000-8000-000000000001", contentHash: "2".repeat(64) }]],
  ])("classifies signal %s as STALE", async (_label, references) => {
    const fixture = makeVerifierFixture("READY");
    setCurrentDependency(fixture, changedSnapshot(fixture.assessment.dependency, references));
    await expect(run(fixture)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["DEPENDENCY_SNAPSHOT_CHANGED"] });
  });

  it("classifies evaluator change as STALE even when historical evaluator is valid", async () => {
    const fixture = makeVerifierFixture("READY");
    const changed: EvaluatorIdentity = { ...currentDefaultEvaluator(), version: "0.3.0", definitionHash: canonicalSha256({ schemaVersion: currentDefaultEvaluator().schemaVersion, version: "0.3.0" }) };
    setCurrentEvaluator(fixture, changed);
    await expect(run(fixture)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["EVALUATOR_CHANGED"] });
  });

  it.each([
    ["before", "2026-08-21T23:59:59.999Z", "CURRENT"],
    ["at", "2026-08-22T00:00:00.000Z", "EXPIRED"],
    ["after", "2026-08-22T00:00:00.001Z", "EXPIRED"],
  ] as const)("preserves expiry boundary %s", async (_label, now, expected) => {
    const fixture = makeVerifierFixture("READY");
    const readiness = { ...fixture.assessment.readiness, validUntil: "2026-08-22T00:00:00.000Z" };
    fixture.dependencies.persistence = { ...fixture.dependencies.persistence, findReadiness: async () => readiness };
    setClock(fixture, now);
    await expect(run(fixture)).resolves.toMatchObject({ currentness: expected });
  });

  it("preserves domain precedence for dependency, evaluator and source-head drift with expiry", async () => {
    const dependency = makeVerifierFixture("READY");
    dependency.dependencies.persistence = { ...dependency.dependencies.persistence, findReadiness: async () => ({ ...dependency.assessment.readiness, validUntil: "2026-08-22T00:00:00.000Z" }) };
    setClock(dependency, "2026-08-22T01:00:00.000Z");
    setCurrentDependency(dependency, changedSnapshot(dependency.assessment.dependency, []));
    await expect(run(dependency)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["DEPENDENCY_SNAPSHOT_CHANGED"] });
    const evaluator = makeVerifierFixture("READY");
    evaluator.dependencies.persistence = { ...evaluator.dependencies.persistence, findReadiness: async () => ({ ...evaluator.assessment.readiness, validUntil: "2026-08-22T00:00:00.000Z" }) };
    setClock(evaluator, "2026-08-22T01:00:00.000Z");
    setCurrentEvaluator(evaluator, { ...currentDefaultEvaluator(), version: "0.3.0", definitionHash: canonicalSha256({ schemaVersion: currentDefaultEvaluator().schemaVersion, version: "0.3.0" }) });
    await expect(run(evaluator)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["EVALUATOR_CHANGED"] });
    const head = makeVerifierFixture("READY");
    head.dependencies.persistence = { ...head.dependencies.persistence, findReadiness: async () => ({ ...head.assessment.readiness, validUntil: "2026-08-22T00:00:00.000Z" }) };
    setClock(head, "2026-08-22T01:00:00.000Z");
    head.dependencies.dependencySnapshot = { resolve: async () => { throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_CHANGED"); } };
    await expect(run(head)).resolves.toMatchObject({ currentness: "STALE", reasonCodes: ["SOURCE_ASSET_HEAD_CHANGED"] });
  });

  it("returns a coherent deeply immutable non-consequence result", async () => {
    const result = await run(makeVerifierFixture("READY"));
    expect(result.authorityCommit.authorityCommitId).toBe(COMMIT);
    expect(result.historicalReadiness.id).toBe(result.authorityCommit.readinessId);
    expect(result.historicalReadiness.readinessContentHash).toBe(result.authorityCommit.readinessContentHash);
    expect(result.assessmentScope).toBe("NON_ATOMIC_POST_COMMIT_CURRENTNESS");
    expect(result.consequenceBoundary).toBe("SERIALIZED_RECHECK_REQUIRED_FOR_CONSEQUENCE");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.authorityCommit)).toBe(true);
    expect(Object.isFrozen(result.historicalReadiness)).toBe(true);
    expect(() => { (result as { currentness: string }).currentness = "STALE"; }).toThrow();
  });

  it("runs each phase once and contains no consequence operation", async () => {
    const fixture = makeVerifierFixture();
    await run(fixture);
    expect(fixture.calls).toEqual(["SCOPED_COMMIT_READ", "C0-D", "HISTORICAL_READINESS_READ", "HISTORICAL_DEPENDENCY_READ", "C1-A", "C1-B"]);
    const source = readFileSync(resolve(process.cwd(), "src/application/outcome/revalidate-outcome-readiness-authority-currentness.ts"), "utf8");
    expect(source).not.toMatch(/evaluateDelegationReadiness|isDelegable|ExecutionAuthority|MutationLease|StateCommit|executor|provider|\.commit\(/);
  });

  it("keeps server-only and non-HTTP boundaries explicit", () => {
    const server = readFileSync(resolve(process.cwd(), "src/server/outcome-readiness-authority-currentness.ts"), "utf8");
    expect(server).toContain('import "server-only"');
    expect(server).not.toMatch(/Request|request\.json|route|server action|isDelegable|ExecutionAuthority|MutationLease|StateCommit/);
  });
});
