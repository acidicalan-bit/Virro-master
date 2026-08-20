import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  OutcomeSignalUniverseError,
  OutcomeSignalUniverseResolver,
} from "@/src/application/outcome/resolve-outcome-signal-universe";
import type { Build002TenantSnapshotScope } from "@/src/application/ports/outcome/build002-persistence-repository";
import {
  BUILD002_SIGNAL_SCHEMA_VERSION,
  compileSignalRequirement,
  createSignal,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";
import { SupabaseBuild002PersistenceRepository } from "@/src/infrastructure/persistence/outcome/supabase-build002-persistence-repository";

const TENANT = "51000000-0000-4000-8000-000000000001";
const FOREIGN_TENANT = "51000000-0000-4000-8000-000000000002";
const TRANSACTION = "52000000-0000-4000-8000-000000000001";
const FOREIGN_TRANSACTION = "52000000-0000-4000-8000-000000000002";
const BLUEPRINT = "53000000-0000-4000-8000-000000000001";
const HASH = "a".repeat(64);
const SOURCE_HASH = "b".repeat(64);
const CREATED_AT = "2026-08-20T12:00:00.000Z";

class IndependentRepository {
  readonly calls: Array<{ scope: Build002TenantSnapshotScope; hash: string }> = [];
  private readonly rows = new Map<string, Signal[]>();
  returned: Signal[] | undefined;

  set(hash: string, signals: Signal[]): void {
    this.rows.set(hash, signals);
  }

  async listSignalsForRequirement(scope: Build002TenantSnapshotScope, hash: string): Promise<Signal[]> {
    this.calls.push({ scope, hash });
    return this.returned ? [...this.returned] : [...(this.rows.get(hash) ?? [])];
  }
}

function makeRequirement(requirementId: string): SignalRequirement {
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
    blueprintHash: HASH,
    policyId: null,
    policyHash: null,
    definitionSchemaVersion: "build002-signal-requirement-v0.1",
  }, CREATED_AT);
}

function makeSignal(requirementId: string, signalId: string, overrides: Partial<Parameters<typeof createSignal>[0]> = {}): Signal {
  return createSignal({
    signalId,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId,
    payload: { value: signalId },
    source: { identity: "independent-fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: CREATED_AT,
    validUntil: null,
    dependency: { identity: "asset.version", hash: SOURCE_HASH },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
    ...overrides,
  });
}

function makeAuthority(requirements: SignalRequirement[]): Parameters<OutcomeSignalUniverseResolver["resolve"]>[0] {
  return { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION, signalRequirements: requirements } as Parameters<OutcomeSignalUniverseResolver["resolve"]>[0];
}

function rowFor(signal: Signal, requirementDefinitionHash: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    signal_id: signal.signalId,
    owner_tenant_id: signal.ownerTenantId,
    outcome_transaction_id: signal.transactionId,
    requirement_id: signal.requirementId,
    requirement_definition_hash: requirementDefinitionHash,
    payload: signal.payload,
    source: signal.source,
    provenance: signal.provenance,
    captured_at: signal.capturedAt,
    valid_until: signal.validUntil,
    dependency_identity: signal.dependency.identity,
    dependency_hash: signal.dependency.hash,
    schema_version: signal.schemaVersion,
    content_hash: signal.contentHash,
    ...overrides,
  };
}

class RecordingBuilder {
  readonly calls: Array<{ method: string; args: unknown[] }> = [];

  constructor(private readonly rows: Record<string, unknown>[], private readonly error: { message: string } | null = null) {}

  select(...args: unknown[]): this { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]): this { this.calls.push({ method: "eq", args }); return this; }
  order(...args: unknown[]): this { this.calls.push({ method: "order", args }); return this; }
  then<TResult1 = { data: Record<string, unknown>[]; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Record<string, unknown>[]; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: this.error }).then(onfulfilled, onrejected);
  }
}

function fakeClient(builder: RecordingBuilder): SupabaseClient {
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("BUILD002-C1-A independent verifier", () => {
  it("resolves complete R1/R2/R3 universes in canonical deterministic order", async () => {
    const r1 = makeRequirement("signal.r1");
    const r2 = makeRequirement("signal.r2");
    const r3 = makeRequirement("signal.r3");
    const repository = new IndependentRepository();
    repository.set(r2.requirementDefinitionHash, [makeSignal(r2.requirementId, "54000000-0000-4000-8000-000000000002")]);
    repository.set(r3.requirementDefinitionHash, [
      makeSignal(r3.requirementId, "54000000-0000-4000-8000-000000000003", { capturedAt: "2026-08-20T12:00:01.000Z" }),
      makeSignal(r3.requirementId, "54000000-0000-4000-8000-000000000001", { capturedAt: "2026-08-20T12:00:00.000Z" }),
    ]);
    const result = await new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([r3, r1, r2]));
    expect(result.requirements.map((item) => item.requirement.requirementId)).toEqual(["signal.r1", "signal.r2", "signal.r3"]);
    expect(result.requirements[0].signals).toEqual([]);
    expect(result.requirements[1].signals).toHaveLength(1);
    expect(result.requirements[2].signals.map((item) => item.signalId)).toEqual([
      "54000000-0000-4000-8000-000000000001",
      "54000000-0000-4000-8000-000000000003",
    ]);
  });

  it("ignores caller omission/injection and keeps future, expired and contradictory signals", async () => {
    const requirement = makeRequirement("signal.a");
    const repository = new IndependentRepository();
    const a = makeSignal(requirement.requirementId, "55000000-0000-4000-8000-000000000001");
    const b = makeSignal(requirement.requirementId, "55000000-0000-4000-8000-000000000002", { capturedAt: "2026-08-21T12:00:00.000Z" });
    const c = makeSignal(requirement.requirementId, "55000000-0000-4000-8000-000000000003", { validUntil: "2026-08-19T12:00:00.000Z", payload: { value: "contradiction" } });
    repository.set(requirement.requirementDefinitionHash, [a, b, c]);
    const result = await new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]));
    expect(result.requirements[0].signals.map((item) => item.signalId)).toEqual([a.signalId, c.signalId, b.signalId]);
    expect(result.requirements[0].signals.some((item) => item.signalId === "not-persisted" )).toBe(false);
  });

  it("fails closed for foreign tenant, transaction, requirement, corrupt and duplicate evidence", async () => {
    const requirement = makeRequirement("signal.a");
    const repository = new IndependentRepository();
    repository.returned = [{ ...makeSignal(requirement.requirementId, "56000000-0000-4000-8000-000000000001"), ownerTenantId: FOREIGN_TENANT }];
    await expect(new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]))).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    repository.returned = [{ ...makeSignal(requirement.requirementId, "56000000-0000-4000-8000-000000000002"), transactionId: FOREIGN_TRANSACTION }];
    await expect(new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]))).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    repository.returned = [makeSignal("signal.other", "56000000-0000-4000-8000-000000000003")];
    await expect(new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]))).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    const valid = makeSignal(requirement.requirementId, "56000000-0000-4000-8000-000000000004");
    repository.returned = [{ ...valid, payload: { value: "tampered" } } as Signal];
    await expect(new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]))).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
    repository.returned = [valid, valid];
    await expect(new OutcomeSignalUniverseResolver(repository).resolve(makeAuthority([requirement]))).rejects.toMatchObject({ code: "SIGNAL_UNIVERSE_INVALID" });
  });

  it("exercises the production Supabase query builder and row reconstruction", async () => {
    const requirement = makeRequirement("signal.a");
    const signal = makeSignal(requirement.requirementId, "57000000-0000-4000-8000-000000000001");
    const builder = new RecordingBuilder([rowFor(signal, requirement.requirementDefinitionHash, { captured_at: "2026-08-20T07:00:00-05:00" })]);
    const repository = new SupabaseBuild002PersistenceRepository(fakeClient(builder), TENANT);
    const result = await repository.listSignalsForRequirement({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION }, requirement.requirementDefinitionHash);
    expect(result[0].capturedAt).toBe("2026-08-20T12:00:00.000Z");
    expect(builder.calls).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["owner_tenant_id", TENANT] },
      { method: "eq", args: ["outcome_transaction_id", TRANSACTION] },
      { method: "eq", args: ["requirement_definition_hash", requirement.requirementDefinitionHash] },
      { method: "order", args: ["captured_at", { ascending: true }] },
      { method: "order", args: ["signal_id", { ascending: true }] },
    ]);
  });

  it.each([
    ["malformed captured_at", { captured_at: "not-an-instant" }],
    ["bad schema version", { schema_version: "unknown" }],
    ["bad provenance", { provenance: "FORGED" }],
    ["stale content hash", { payload: { changed: true } }],
  ])("rejects %s as a whole read", async (_label, overrides) => {
    const requirement = makeRequirement("signal.a");
    const signal = makeSignal(requirement.requirementId, "58000000-0000-4000-8000-000000000001");
    const builder = new RecordingBuilder([rowFor(signal, requirement.requirementDefinitionHash, overrides)]);
    const repository = new SupabaseBuild002PersistenceRepository(fakeClient(builder), TENANT);
    await expect(repository.listSignalsForRequirement({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION }, requirement.requirementDefinitionHash)).rejects.toThrow("BUILD002_SIGNAL_UNIVERSE_INVALID");
  });

  it("bounds repository failures and preserves read-only C1-A scope", async () => {
    const requirement = makeRequirement("signal.a");
    const builder = new RecordingBuilder([], { message: "table build002_signals service_role raw SQL foreign tenant" });
    const repository = new SupabaseBuild002PersistenceRepository(fakeClient(builder), TENANT);
    await expect(repository.listSignalsForRequirement({ ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION }, requirement.requirementDefinitionHash)).rejects.toThrow("BUILD002_SIGNAL_UNIVERSE_READ_FAILED");

    const server = readFileSync(resolve(process.cwd(), "src/server/outcome-signal-universe-resolver.ts"), "utf8");
    expect(server).toMatch(/request:\s*Request,\s*\n\s*outcomeTransactionId:\s*string/);
    expect(server).not.toMatch(/signalIds|signalId|contentHash|requirementDefinitionHash|requirementId|provenance|capturedAt|dependencyHash|evaluator/);
    const production = readFileSync(resolve(process.cwd(), "src/application/outcome/resolve-outcome-signal-universe.ts"), "utf8");
    expect(production).not.toMatch(/evaluateSignalQualification|evaluateDelegationReadiness|insertDependencySnapshot|insertQualification|insertReadiness|ExecutionAuthority|MutationLease|executor\.execute/);
    expect(new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_READ_FAILED").message).toBe("SIGNAL_UNIVERSE_READ_FAILED");
  });

  it("keeps the authority-before-factory boundary and freezes the result", () => {
    const server = readFileSync(resolve(process.cwd(), "src/server/outcome-signal-universe-resolver.ts"), "utf8");
    expect(server.indexOf("const authority = await resolveOutcomeRequirementAuthority")).toBeLessThan(server.indexOf("const repositories = createTenantBuild002EvaluationRepositories"));
    expect(server).toContain("authority.ownerTenantId");
    expect(readFileSync(resolve(process.cwd(), "src/infrastructure/persistence/supabase-repositories.ts"), "utf8")).toContain("createTenantBuild002EvaluationRepositories");
  });
});
