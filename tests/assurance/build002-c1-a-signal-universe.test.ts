import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  BUILD002_SIGNAL_SCHEMA_VERSION,
  compileSignalRequirement,
  createSignal,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import {
  OutcomeSignalUniverseError,
  OutcomeSignalUniverseResolver,
  type ResolvedOutcomeSignalUniverse,
} from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { Build002TenantSnapshotScope } from "@/src/application/ports/outcome/build002-persistence-repository";

const TENANT = "10000000-0000-4000-8000-000000000001";
const FOREIGN_TENANT = "10000000-0000-4000-8000-000000000002";
const TRANSACTION = "20000000-0000-4000-8000-000000000001";
const FOREIGN_TRANSACTION = "20000000-0000-4000-8000-000000000002";
const BLUEPRINT = "30000000-0000-4000-8000-000000000001";
const CREATED_AT = "2026-08-20T12:00:00.000Z";
const SOURCE_HASH = "a".repeat(64);
const BLUEPRINT_HASH = "b".repeat(64);

class FixtureRepository {
  readonly calls: Array<{ scope: Build002TenantSnapshotScope; requirementDefinitionHash: string }> = [];
  readonly byHash = new Map<string, Signal[]>();
  next: Signal[] | null = null;

  async listSignalsForRequirement(scope: Build002TenantSnapshotScope, requirementDefinitionHash: string): Promise<Signal[]> {
    this.calls.push({ scope, requirementDefinitionHash });
    return this.next ? this.next : [...(this.byHash.get(requirementDefinitionHash) ?? [])];
  }
}

function requirement(requirementId: string): SignalRequirement {
  return compileSignalRequirement({
    requirementId,
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "TEXT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  }, CREATED_AT);
}

function signal(requirementId: string, signalId: string, overrides: Partial<Parameters<typeof createSignal>[0]> = {}): Signal {
  return createSignal({
    signalId,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId,
    payload: { value: signalId },
    source: { identity: "fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: CREATED_AT,
    validUntil: null,
    dependency: { identity: "asset.version", hash: SOURCE_HASH },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
    ...overrides,
  });
}

function authority(requirements: SignalRequirement[]): Parameters<OutcomeSignalUniverseResolver["resolve"]>[0] {
  return {
    ownerTenantId: TENANT,
    outcomeTransactionId: TRANSACTION,
    signalRequirements: requirements,
  } as Parameters<OutcomeSignalUniverseResolver["resolve"]>[0];
}

async function resolveUniverse(repository: FixtureRepository, requirements: SignalRequirement[]): Promise<ResolvedOutcomeSignalUniverse> {
  return new OutcomeSignalUniverseResolver(repository).resolve(authority(requirements));
}

describe("BUILD002-C1-A server-owned signal universe", () => {
  it("returns a valid empty universe for a canonical requirement with zero signals", async () => {
    const repository = new FixtureRepository();
    const result = await resolveUniverse(repository, [requirement("signal.a")]);
    expect(result.requirements[0].signals).toEqual([]);
  });

  it("returns one exact persisted signal", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    const item = signal(req.requirementId, "40000000-0000-4000-8000-000000000001");
    repository.byHash.set(req.requirementDefinitionHash, [item]);
    const result = await resolveUniverse(repository, [req]);
    expect(result.requirements[0].signals.map((value) => value.signalId)).toEqual([item.signalId]);
  });

  it("returns all signals in capturedAt then signalId order", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    const late = signal(req.requirementId, "40000000-0000-4000-8000-000000000002", { capturedAt: "2026-08-20T12:00:02.000Z" });
    const earlyB = signal(req.requirementId, "40000000-0000-4000-8000-000000000003", { capturedAt: "2026-08-20T12:00:01.000Z" });
    const earlyA = signal(req.requirementId, "40000000-0000-4000-8000-000000000001", { capturedAt: "2026-08-20T12:00:01.000Z" });
    repository.byHash.set(req.requirementDefinitionHash, [late, earlyB, earlyA]);
    const result = await resolveUniverse(repository, [req]);
    expect(result.requirements[0].signals.map((value) => value.signalId)).toEqual([earlyA.signalId, earlyB.signalId, late.signalId]);
  });

  it("keeps requirements independent and binds the exact definition hash", async () => {
    const first = requirement("signal.a");
    const second = requirement("signal.b");
    const repository = new FixtureRepository();
    repository.byHash.set(first.requirementDefinitionHash, [signal(first.requirementId, "40000000-0000-4000-8000-000000000001")]);
    repository.byHash.set(second.requirementDefinitionHash, [signal(second.requirementId, "40000000-0000-4000-8000-000000000002")]);
    const result = await resolveUniverse(repository, [second, first]);
    expect(result.requirements.map((item) => item.requirement.requirementId)).toEqual(["signal.a", "signal.b"]);
    expect(repository.calls.map((call) => call.requirementDefinitionHash)).toEqual([first.requirementDefinitionHash, second.requirementDefinitionHash]);
  });

  it("rejects foreign tenant and transaction signals instead of returning them", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    repository.next = [{ ...signal(req.requirementId, "40000000-0000-4000-8000-000000000001"), ownerTenantId: FOREIGN_TENANT }, { ...signal(req.requirementId, "40000000-0000-4000-8000-000000000002"), transactionId: FOREIGN_TRANSACTION }];
    await expect(resolveUniverse(repository, [req])).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
  });

  it("rejects a wrong requirement binding even when the requirement id is present", async () => {
    const req = requirement("signal.a");
    const wrong = requirement("signal.b");
    const repository = new FixtureRepository();
    repository.next = [signal(wrong.requirementId, "40000000-0000-4000-8000-000000000001")];
    await expect(resolveUniverse(repository, [req])).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
  });

  it("keeps future, expired and contradictory evidence visible", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    const future = signal(req.requirementId, "40000000-0000-4000-8000-000000000001", { capturedAt: "2026-08-21T12:00:00.000Z" });
    const expired = signal(req.requirementId, "40000000-0000-4000-8000-000000000002", { validUntil: "2026-08-19T12:00:00.000Z" });
    const contradictory = signal(req.requirementId, "40000000-0000-4000-8000-000000000003", { payload: { value: "different" } });
    repository.byHash.set(req.requirementDefinitionHash, [future, expired, contradictory]);
    const result = await resolveUniverse(repository, [req]);
    expect(result.requirements[0].signals).toHaveLength(3);
  });

  it("fails the whole universe for hash-invalid, malformed or duplicate signals", async () => {
    const req = requirement("signal.a");
    const valid = signal(req.requirementId, "40000000-0000-4000-8000-000000000001");
    const repository = new FixtureRepository();
    repository.next = [{ ...valid, payload: { value: "tampered" } } as Signal];
    await expect(resolveUniverse(repository, [req])).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    repository.next = [{ ...valid, capturedAt: "not-an-instant" } as Signal];
    await expect(resolveUniverse(repository, [req])).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    repository.next = [valid, valid];
    await expect(resolveUniverse(repository, [req])).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
  });

  it("does not accept caller evidence-selection or injection material", async () => {
    const source = readFileSync(pathResolve(process.cwd(), "src/server/outcome-signal-universe-resolver.ts"), "utf8");
    expect(source).toMatch(/request:\s*Request,\s*\n\s*outcomeTransactionId:\s*string/);
    expect(source).not.toMatch(/signalIds|signalId|contentHash|requirementDefinitionHash|requirementId/);
    const repository = new FixtureRepository();
    const req = requirement("signal.a");
    const existing = signal(req.requirementId, "40000000-0000-4000-8000-000000000001");
    repository.byHash.set(req.requirementDefinitionHash, [existing]);
    const result = await resolveUniverse(repository, [req]);
    expect(result.requirements[0].signals.map((item) => item.signalId)).toEqual([existing.signalId]);
  });

  it("constructs an immutable result and has no qualification, readiness or write side effects", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    const existing = signal(req.requirementId, "40000000-0000-4000-8000-000000000001", { payload: { nested: { value: "original" } } });
    repository.byHash.set(req.requirementDefinitionHash, [existing]);
    const result = await resolveUniverse(repository, [req]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requirements[0].signals[0].payload)).toBe(true);
    expect(() => (result.requirements as ResolvedOutcomeSignalUniverse["requirements"] & { push: (value: never) => void }).push(undefined as never)).toThrow();
    expect(repository.calls).toHaveLength(1);
  });

  it("keeps C0-D authority resolution before the privileged evaluation factory", () => {
    const source = readFileSync(pathResolve(process.cwd(), "src/server/outcome-signal-universe-resolver.ts"), "utf8");
    expect(source.indexOf("const authority = await resolveOutcomeRequirementAuthority")).toBeLessThan(source.indexOf("const repositories = createTenantBuild002EvaluationRepositories"));
    expect(source).toContain("authority.ownerTenantId");
  });

  it("uses only the exact server-side query scopes and deterministic ordering", () => {
    const source = readFileSync(pathResolve(process.cwd(), "src/infrastructure/persistence/outcome/supabase-build002-persistence-repository.ts"), "utf8");
    const method = source.slice(source.indexOf("async listSignalsForRequirement"), source.indexOf("async insertDependencySnapshot"));
    expect(method).toContain('.eq("owner_tenant_id", this.ownerTenantId)');
    expect(method).toContain('.eq("outcome_transaction_id", scope.outcomeTransactionId)');
    expect(method).toContain('.eq("requirement_definition_hash", requirementDefinitionHash)');
    expect(method).toContain('.order("captured_at", { ascending: true })');
    expect(method).toContain('.order("signal_id", { ascending: true })');
    expect(method).toContain("verifySignalContentHash");
  });

  it("maps repository failures to bounded errors without exposing database details", async () => {
    const req = requirement("signal.a");
    const repository = new FixtureRepository();
    repository.listSignalsForRequirement = async () => { throw new Error("raw table build002_signals service_role detail"); };
    await expect(resolveUniverse(repository, [req])).rejects.toEqual(new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_READ_FAILED"));
  });
});
