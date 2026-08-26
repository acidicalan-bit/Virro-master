import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ConsumeExecutionAttemptRequest,
  ExecutionAttemptReservationRepository,
  ReserveExecutionAttemptRequest,
} from "@/src/application/ports/outcome/execution-attempt-reservation-repository";
import {
  ExecutionAttemptReservationSchema,
  ReservationConsumptionSchema,
  verifyExecutionAttemptReservation,
  verifyReservationConsumption,
  type ExecutionAttemptReservation,
  type ReservationConsumption,
} from "@/src/domain/outcome/build002-execution-attempt-reservation";
import { Build002MutationLeaseSchema, verifyBuild002MutationLeaseHash } from "@/src/domain/outcome/build002-mutation-lease";

type Row = Record<string, unknown>;

export class SupabaseExecutionAttemptReservationRepository implements ExecutionAttemptReservationRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerTenantId: string) {
    if (!ownerTenantId.trim()) throw new Error("D6_RESERVATION_SCOPE_INVALID");
  }

  async reserve(request: ReserveExecutionAttemptRequest): Promise<ExecutionAttemptReservation> {
    const mutationLeaseId = await this.resolveExactCurrentMutationLease(request);
    const { data, error } = await this.client.rpc("build002_reserve_execution_attempt", {
      p_principal_id: request.principalId,
      p_membership_id: request.membershipId,
      p_mutation_lease_id: mutationLeaseId,
      p_provider_target_path: request.providerTargetPath,
      p_operation: request.operation,
      p_operation_value: request.operationValue,
    });
    if (error || !data || typeof data !== "object") throw new Error(error?.message || "D6_RESERVATION_FAILED");
    const reservationId = String((data as Row).reservation_id ?? "");
    const reservation = await this.findReservationById(reservationId);
    if (!reservation
      || reservation.ownerTenantId !== this.ownerTenantId
      || reservation.outcomeTransactionId !== request.outcomeTransactionId
      || reservation.taskSpecId !== request.taskSpecId
      || reservation.taskSpecHash !== request.taskSpecHash
      || reservation.d5TargetPath !== request.d5TargetPath
      || reservation.providerTargetPath !== request.providerTargetPath) {
      throw new Error("D6_RESERVATION_READBACK_FAILED");
    }
    return reservation;
  }

  async consume(request: ConsumeExecutionAttemptRequest): Promise<ReservationConsumption> {
    const { data, error } = await this.client.rpc("build002_consume_execution_attempt_reservation", {
      p_principal_id: request.principalId,
      p_membership_id: request.membershipId,
      p_reservation_id: request.reservationId,
      p_execution_attempt_id: request.executionAttemptId,
    });
    if (error || !data || typeof data !== "object") throw new Error(error?.message || "D6_RESERVATION_CONSUMPTION_FAILED");
    const consumptionId = String((data as Row).consumption_id ?? "");
    const { data: row, error: readError } = await this.client
      .from("build002_execution_attempt_consumptions")
      .select("*")
      .eq("consumption_id", consumptionId)
      .eq("owner_tenant_id", this.ownerTenantId)
      .maybeSingle();
    if (readError || !row) throw new Error("D6_CONSUMPTION_READBACK_FAILED");
    const consumption = consumptionFromRow(row as Row);
    if (!verifyReservationConsumption(consumption)
      || consumption.reservationId !== request.reservationId
      || consumption.executionAttemptId !== request.executionAttemptId) {
      throw new Error("D6_CONSUMPTION_READBACK_FAILED");
    }
    return consumption;
  }

  async findReservationById(reservationId: string): Promise<ExecutionAttemptReservation | null> {
    const { data, error } = await this.client
      .from("build002_execution_attempt_reservations")
      .select("*")
      .eq("reservation_id", reservationId)
      .eq("owner_tenant_id", this.ownerTenantId)
      .maybeSingle();
    if (error) throw new Error("D6_RESERVATION_READBACK_FAILED");
    if (!data) return null;
    const reservation = reservationFromRow(data as Row);
    if (!verifyExecutionAttemptReservation(reservation) || Date.parse(reservation.validUntil) <= Date.now()) {
      throw new Error("D6_RESERVATION_READBACK_FAILED");
    }
    return reservation;
  }

  private async resolveExactCurrentMutationLease(request: ReserveExecutionAttemptRequest): Promise<string> {
    const { data, error } = await this.client
      .from("build002_mutation_leases")
      .select("*")
      .eq("owner_tenant_id", this.ownerTenantId)
      .eq("principal_id", request.principalId)
      .eq("membership_id", request.membershipId)
      .eq("outcome_transaction_id", request.outcomeTransactionId)
      .eq("task_spec_id", request.taskSpecId)
      .eq("task_spec_hash", request.taskSpecHash)
      .eq("target_path", request.d5TargetPath)
      .eq("category", "MUTABLE")
      .gt("valid_until", new Date().toISOString());
    if (error) throw new Error("D6_MUTATION_LEASE_LOOKUP_FAILED");
    if (!data || data.length !== 1) throw new Error(data?.length ? "D6_MUTATION_LEASE_AMBIGUOUS" : "D6_MUTATION_LEASE_REQUIRED");
    const lease = mutationLeaseFromRow(data[0] as Row);
    if (!verifyBuild002MutationLeaseHash(lease)) throw new Error("D6_MUTATION_LEASE_READBACK_FAILED");
    return lease.mutationLeaseId;
  }
}

function reservationFromRow(row: Row): ExecutionAttemptReservation {
  return ExecutionAttemptReservationSchema.parse({
    schemaVersion: row.schema_version,
    reservationId: row.reservation_id,
    executionAttemptId: row.execution_attempt_id,
    ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id,
    membershipId: row.membership_id,
    mutationLeaseId: row.mutation_lease_id,
    mutationLeaseContentHash: row.mutation_lease_content_hash,
    authorityCommitId: row.authority_commit_id,
    delegabilityAdmissionId: row.delegability_admission_id,
    executionAuthorityId: row.execution_authority_id,
    executionAuthorityContentHash: row.execution_authority_content_hash,
    outcomeTransactionId: row.outcome_transaction_id,
    assetId: row.asset_id,
    sourceAssetVersionId: row.source_asset_version_id,
    sourceAssetVersionHash: row.source_asset_version_hash,
    taskSpecId: row.task_spec_id,
    taskSpecVersion: row.task_spec_version,
    taskSpecHash: row.task_spec_hash,
    d5TargetPath: row.d5_target_path,
    providerTargetPath: row.provider_target_path,
    operation: row.operation,
    operationValue: row.operation_value,
    operationValueHash: row.operation_value_hash,
    operationBindingHash: row.operation_binding_hash,
    createdAt: isoTimestamp(row.created_at),
    validUntil: isoTimestamp(row.valid_until),
    scope: row.scope,
    consequenceBoundary: row.consequence_boundary,
    reservationContentHash: row.reservation_content_hash,
  });
}

function consumptionFromRow(row: Row): ReservationConsumption {
  return ReservationConsumptionSchema.parse({
    schemaVersion: row.schema_version,
    consumptionId: row.consumption_id,
    reservationId: row.reservation_id,
    executionAttemptId: row.execution_attempt_id,
    ownerTenantId: row.owner_tenant_id,
    mutationLeaseId: row.mutation_lease_id,
    executionAuthorityId: row.execution_authority_id,
    authorityCommitId: row.authority_commit_id,
    taskSpecHash: row.task_spec_hash,
    operationBindingHash: row.operation_binding_hash,
    reservationContentHash: row.reservation_content_hash,
    consumedAt: isoTimestamp(row.consumed_at),
    providerOutcomeState: row.provider_outcome_state,
    consumptionContentHash: row.consumption_content_hash,
  });
}

function mutationLeaseFromRow(row: Row) {
  return Build002MutationLeaseSchema.parse({
    schemaVersion: row.schema_version,
    mutationLeaseId: row.mutation_lease_id,
    ownerTenantId: row.owner_tenant_id,
    principalId: row.principal_id,
    membershipId: row.membership_id,
    executionAuthorityId: row.execution_authority_id,
    executionAuthorityContentHash: row.execution_authority_content_hash,
    delegabilityAdmissionId: row.delegability_admission_id,
    authorityCommitId: row.authority_commit_id,
    outcomeTransactionId: row.outcome_transaction_id,
    assetId: row.asset_id,
    sourceAssetVersionId: row.source_asset_version_id,
    sourceAssetVersionHash: row.source_asset_version_hash,
    taskSpecId: row.task_spec_id,
    taskSpecVersion: row.task_spec_version,
    taskSpecHash: row.task_spec_hash,
    blueprintId: row.blueprint_id,
    blueprintVersion: row.blueprint_version,
    blueprintHash: row.blueprint_hash,
    currentDependencySnapshotHash: row.current_dependency_snapshot_hash,
    capabilityGrantHash: row.capability_grant_hash,
    targetPath: row.target_path,
    category: row.category,
    scope: row.scope,
    executionStarted: row.execution_started,
    executionAuthorityRevalidatedAt: isoTimestamp(row.execution_authority_revalidated_at),
    mutationLeaseRevalidatedAt: isoTimestamp(row.mutation_lease_revalidated_at),
    grantedAt: isoTimestamp(row.granted_at),
    validUntil: isoTimestamp(row.valid_until),
    consequenceBoundary: row.consequence_boundary,
    mutationLeaseContentHash: row.mutation_lease_content_hash,
  });
}

function isoTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}
