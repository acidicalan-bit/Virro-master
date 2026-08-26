import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CanonicalFieldBetaProviderGateway } from "@/src/application/outcome/media/canonical-field-beta-provider-gateway";
import type {
  ConsumeExecutionAttemptRequest,
  ExecutionAttemptReservationRepository,
  ReserveExecutionAttemptRequest,
} from "@/src/application/ports/outcome/execution-attempt-reservation-repository";
import type { ImageEditContext, ImageEditExecutor, ImageEditResult } from "@/src/application/ports/outcome/image-edit-executor-port";
import {
  BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCHEMA_VERSION,
  BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCOPE,
  BUILD002_RESERVATION_CONSEQUENCE_BOUNDARY,
  BUILD002_RESERVATION_CONSUMPTION_SCHEMA_VERSION,
  BUILD002_RESERVATION_CONSUMPTION_STATE,
  consumptionHashMaterial,
  reservationHashMaterial,
  verifyExecutionAttemptReservation,
  verifyReservationConsumption,
  type ExecutionAttemptReservation,
  type ReservationConsumption,
} from "@/src/domain/outcome/build002-execution-attempt-reservation";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";

const TENANT = "10000000-0000-4000-8000-000000000001";
const PRINCIPAL = "10000000-0000-4000-8000-000000000002";
const MEMBERSHIP = "10000000-0000-4000-8000-000000000003";
const TRANSACTION = "10000000-0000-4000-8000-000000000004";
const TASK_SPEC = "10000000-0000-4000-8000-000000000005";
const RESERVATION = "10000000-0000-4000-8000-000000000006";
const ATTEMPT = "10000000-0000-4000-8000-000000000007";
const CONSUMPTION = "10000000-0000-4000-8000-000000000008";
const LEASE = "10000000-0000-4000-8000-000000000009";
const EXECUTION_AUTHORITY = "10000000-0000-4000-8000-000000000010";
const AUTHORITY_COMMIT = "10000000-0000-4000-8000-000000000011";
const ADMISSION = "10000000-0000-4000-8000-000000000012";
const ASSET = "10000000-0000-4000-8000-000000000013";
const SOURCE = "10000000-0000-4000-8000-000000000014";
const HASH = "a".repeat(64);

describe("BUILD002-C1-D6-R2 execution-attempt reservation boundary", () => {
  it("uses independently verifiable immutable reservation and consumption hashes", () => {
    const reservation = validReservation();
    const consumption = validConsumption(reservation);
    expect(verifyExecutionAttemptReservation(reservation)).toBe(true);
    expect(verifyReservationConsumption(consumption)).toBe(true);
    expect(verifyExecutionAttemptReservation({ ...reservation, executionAttemptId: crypto.randomUUID() })).toBe(false);
    expect(verifyReservationConsumption({ ...consumption, reservationContentHash: "b".repeat(64) })).toBe(false);
  });

  it("admits exactly one provider call with one server-owned attempt identity", async () => {
    const executor = new SpyExecutor();
    const gateway = new CanonicalFieldBetaProviderGateway(new FixedRepository(), executor);
    const result = await gateway.invoke(invocation());
    expect(result).toMatchObject({ reservationId: RESERVATION, consumptionId: CONSUMPTION, executionAttemptId: ATTEMPT });
    expect(executor.calls).toBe(1);
    expect(executor.contexts[0]?.executionAttemptId).toBe(ATTEMPT);
  });

  const rejectionCases = [
    ["A01 provider call without reservation", "D6_RESERVATION_REQUIRED", "reserve"],
    ["A02 wrong reservation", "D6_RESERVATION_NOT_FOUND", "consume"],
    ["A03 wrong attempt ID", "D6_EXECUTION_ATTEMPT_MISMATCH", "mismatch"],
    ["A04 reservation from another attempt", "D6_CROSS_ATTEMPT_REUSE", "consume"],
    ["A05 same TaskSpec different attempt", "D6_TASKSPEC_ATTEMPT_SUBSTITUTION", "consume"],
    ["A06 same authority different attempt", "D6_AUTHORITY_ATTEMPT_SUBSTITUTION", "consume"],
    ["A07 expired lease", "MUTATION_LEASE_EXPIRED", "reserve"],
    ["A08 stale readiness", "READINESS_NOT_CURRENT", "consume"],
    ["A09 stale ExecutionAuthority", "EXECUTION_AUTHORITY_EXPIRED", "consume"],
    ["A10 authority hash mismatch", "EXECUTION_AUTHORITY_READBACK_FAILED", "consume"],
    ["A11 TaskSpec mismatch", "D6_TASK_SPEC_MISMATCH", "consume"],
    ["A12 operation mismatch", "D6_OPERATION_VALUE_MISMATCH", "consume"],
    ["A13 value mismatch", "D6_OPERATION_VALUE_MISMATCH", "consume"],
    ["A18 inconsistent DB readback", "D6_RESERVATION_READBACK_FAILED", "reserve"],
    ["A19 consumption rejection with provider spy", "D6_RESERVATION_ALREADY_CONSUMED", "consume"],
    ["A20 consumption rejection with effect/candidate spy", "D6_RESERVATION_ALREADY_CONSUMED", "consume"],
  ] as const;

  it.each(rejectionCases)("%s", async (_name, code, phase) => {
    const executor = new SpyExecutor();
    const repository = phase === "mismatch" ? new MismatchedConsumptionRepository() : new RejectingRepository(phase, code);
    const gateway = new CanonicalFieldBetaProviderGateway(repository, executor);
    await expect(gateway.invoke(invocation())).rejects.toThrow(code === "D6_EXECUTION_ATTEMPT_MISMATCH" ? "D6_ATTEMPT_LINEAGE_MISMATCH" : code);
    expect(executor.calls).toBe(0);
    expect(executor.effects).toBe(0);
    expect(executor.candidates).toBe(0);
    expect(executor.stateCommits).toBe(0);
  });

  it("A14 duplicate sequential consumption", async () => {
    const executor = new SpyExecutor();
    const repository = new AtomicRepository();
    const gateway = new CanonicalFieldBetaProviderGateway(repository, executor);
    await gateway.invoke(invocation());
    await expect(gateway.invoke(invocation())).rejects.toThrow("D6_RESERVATION_ALREADY_CONSUMED");
    expect(repository.successfulConsumptions).toBe(1);
    expect(executor.calls).toBe(1);
  });

  it("A15 duplicate concurrent consumption", async () => {
    const executor = new SpyExecutor();
    const repository = new AtomicRepository();
    const gateway = new CanonicalFieldBetaProviderGateway(repository, executor);
    const settled = await Promise.allSettled([gateway.invoke(invocation()), gateway.invoke(invocation())]);
    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(repository.successfulConsumptions).toBe(1);
    expect(executor.calls).toBe(1);
  });

  it("A16 legacy Field Beta bypass is structurally gated", () => {
    const fieldBeta = readFileSync("src/application/outcome/media/field-beta-service.ts", "utf8");
    const preservation = readFileSync("src/application/outcome/media/preservation-verification-service.ts", "utf8");
    const factory = readFileSync("src/server/preservation-services.ts", "utf8");
    expect(fieldBeta).toContain("requiresCanonicalD6: true");
    expect(fieldBeta).not.toContain(".execute(");
    expect(fieldBeta).not.toContain("image-edit-executor-port");
    expect(preservation).toContain("this.fieldBetaProviderGateway.invoke");
    expect(factory).toContain("new CanonicalFieldBetaProviderGateway");
    expect(factory).toContain("new SupabaseExecutionAttemptReservationRepository");
  });

  it("A17 forged client attempt identity is not accepted by the strict route schema", () => {
    const route = readFileSync("app/api/field-beta/route.ts", "utf8");
    expect(route).toContain("}).strict()");
    expect(route).not.toContain("executionAttemptId:");
    expect(route).not.toContain("reservationId:");
  });

  it("freezes ACL, append-only, D5 revalidation, and crash-window semantics in the migration", () => {
    const migration = readFileSync("supabase/migrations/20260825110000_build_002_c1_d6_execution_attempt_reservation.sql", "utf8");
    expect(migration).toContain("build002_execution_attempt_reservations");
    expect(migration).toContain("build002_execution_attempt_consumptions");
    expect(migration).toContain("public.build002_grant_mutation_lease(");
    expect(migration).toContain("for update");
    expect(migration).toContain("D6_RESERVATION_ALREADY_CONSUMED");
    expect(migration).toContain(BUILD002_RESERVATION_CONSUMPTION_STATE);
    expect(migration).toContain("revoke all on table public.build002_execution_attempt_reservations");
    expect(migration).toContain("revoke all on table public.build002_execution_attempt_consumptions");
    expect(migration).not.toContain("alter table public.build002_mutation_leases");
  });
});

class SpyExecutor implements ImageEditExecutor {
  readonly name = "d6-spy";
  readonly provider = "synthetic";
  calls = 0;
  effects = 0;
  candidates = 0;
  stateCommits = 0;
  readonly contexts: ImageEditContext[] = [];
  preflight() { return { status: "SUPPORTED" as const, requestedWidth: 1, requestedHeight: 1, requestedSize: "1x1" }; }
  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    this.calls += 1;
    this.effects += 1;
    this.candidates += 1;
    this.stateCommits += 1;
    this.contexts.push(context);
    return {
      candidateBytes: new Uint8Array([1]), candidateStorageKey: "candidate", candidateMimeType: "image/png",
      candidateWidth: 1, candidateHeight: 1, candidateByteSize: 1, candidateSha256: HASH,
      provider: this.provider, model: "synthetic", latencyMs: 1, usage: null, costUsd: null, providerMetadata: {},
    };
  }
}

class FixedRepository implements ExecutionAttemptReservationRepository {
  async reserve(request: ReserveExecutionAttemptRequest) { void request; return validReservation(); }
  async consume(request: ConsumeExecutionAttemptRequest) { void request; return validConsumption(validReservation()); }
  async findReservationById() { return validReservation(); }
}

class RejectingRepository extends FixedRepository {
  constructor(private readonly phase: "reserve" | "consume", private readonly code: string) { super(); }
  override async reserve(request: ReserveExecutionAttemptRequest) {
    if (this.phase === "reserve") throw new Error(this.code);
    return super.reserve(request);
  }
  override async consume(request: ConsumeExecutionAttemptRequest) {
    if (this.phase === "consume") throw new Error(this.code);
    return super.consume(request);
  }
}

class MismatchedConsumptionRepository extends FixedRepository {
  override async consume() {
    return validConsumption(validReservation(), crypto.randomUUID());
  }
}

class AtomicRepository extends FixedRepository {
  successfulConsumptions = 0;
  private consumed = false;
  override async consume() {
    await Promise.resolve();
    if (this.consumed) throw new Error("D6_RESERVATION_ALREADY_CONSUMED");
    this.consumed = true;
    this.successfulConsumptions += 1;
    return validConsumption(validReservation());
  }
}

function validReservation(): ExecutionAttemptReservation {
  const operationValue = { instruction: "change", roi: { x: 0, y: 0, width: 1, height: 1 } };
  const operationValueHash = canonicalSha256(operationValue);
  const operationBindingHash = canonicalSha256({ operation: "EDIT_REGION", operationValue, providerTargetPath: "media.pixels", taskSpecHash: HASH });
  const withoutHash = {
    schemaVersion: BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCHEMA_VERSION,
    reservationId: RESERVATION,
    executionAttemptId: ATTEMPT,
    ownerTenantId: TENANT,
    principalId: PRINCIPAL,
    membershipId: MEMBERSHIP,
    mutationLeaseId: LEASE,
    mutationLeaseContentHash: HASH,
    authorityCommitId: AUTHORITY_COMMIT,
    delegabilityAdmissionId: ADMISSION,
    executionAuthorityId: EXECUTION_AUTHORITY,
    executionAuthorityContentHash: HASH,
    outcomeTransactionId: TRANSACTION,
    assetId: ASSET,
    sourceAssetVersionId: SOURCE,
    sourceAssetVersionHash: HASH,
    taskSpecId: TASK_SPEC,
    taskSpecVersion: 1,
    taskSpecHash: HASH,
    d5TargetPath: "instruction",
    providerTargetPath: "media.pixels",
    operation: "EDIT_REGION" as const,
    operationValue,
    operationValueHash,
    operationBindingHash,
    createdAt: "2026-08-25T12:00:00.000Z",
    validUntil: "2099-08-25T12:05:00.000Z",
    scope: BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCOPE,
    consequenceBoundary: BUILD002_RESERVATION_CONSEQUENCE_BOUNDARY,
  };
  return { ...withoutHash, reservationContentHash: canonicalSha256(reservationHashMaterial(withoutHash as ExecutionAttemptReservation)) };
}

function validConsumption(reservation: ExecutionAttemptReservation, executionAttemptId = reservation.executionAttemptId): ReservationConsumption {
  const withoutHash = {
    schemaVersion: BUILD002_RESERVATION_CONSUMPTION_SCHEMA_VERSION,
    consumptionId: CONSUMPTION,
    reservationId: reservation.reservationId,
    executionAttemptId,
    ownerTenantId: reservation.ownerTenantId,
    mutationLeaseId: reservation.mutationLeaseId,
    executionAuthorityId: reservation.executionAuthorityId,
    authorityCommitId: reservation.authorityCommitId,
    taskSpecHash: reservation.taskSpecHash,
    operationBindingHash: reservation.operationBindingHash,
    reservationContentHash: reservation.reservationContentHash,
    consumedAt: "2026-08-25T12:00:01.000Z",
    providerOutcomeState: BUILD002_RESERVATION_CONSUMPTION_STATE,
  };
  return { ...withoutHash, consumptionContentHash: canonicalSha256(consumptionHashMaterial(withoutHash as ReservationConsumption)) };
}

function invocation() {
  return {
    authority: {
      principalId: PRINCIPAL, tenantId: TENANT, membershipId: MEMBERSHIP, membershipRole: "OWNER" as const,
      authoritySource: "SUPABASE_AUTH" as const, authorizationTimestamp: "2026-08-25T12:00:00.000Z",
    },
    taskSpec: { id: TASK_SPEC, hash: HASH, transactionId: TRANSACTION } as TaskSpec,
    context: {
      transactionId: TRANSACTION, sourceStorageKey: "source", sourceMimeType: "image/png" as const,
      sourceWidth: 1, sourceHeight: 1, sourceBytes: new Uint8Array([1]),
      roi: { x: 0, y: 0, width: 1, height: 1 }, instruction: "change",
    },
  };
}
