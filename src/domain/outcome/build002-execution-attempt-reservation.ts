import { z } from "zod";

import { canonicalSha256, immutableCopy, SHA256_PATTERN } from "@/src/domain/outcome/specification/canonical";

export const BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCHEMA_VERSION = "build002-execution-attempt-reservation-v0.1" as const;
export const BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCOPE = "FIELD_BETA_PROVIDER_ADMISSION_ONLY" as const;
export const BUILD002_RESERVATION_CONSEQUENCE_BOUNDARY = "ATOMIC_CONSUMPTION_REQUIRED_IMMEDIATELY_BEFORE_PROVIDER" as const;
export const BUILD002_RESERVATION_CONSUMPTION_SCHEMA_VERSION = "build002-reservation-consumption-v0.1" as const;
export const BUILD002_RESERVATION_CONSUMPTION_STATE = "ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN" as const;

const ExactPath = z.string().trim().min(1).max(500).refine((value) => {
  if (value === "." || value === ".." || value.includes("*") || value.includes("[") || value.includes("]")) return false;
  return !value.split(".").some((segment) => segment === "" || segment === "." || segment === "..");
}, "Execution-attempt paths must be exact, non-wildcard paths.");

export const ExecutionAttemptReservationSchema = z.object({
  schemaVersion: z.literal(BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCHEMA_VERSION),
  reservationId: z.uuid(),
  executionAttemptId: z.uuid(),
  ownerTenantId: z.uuid(),
  principalId: z.uuid(),
  membershipId: z.uuid(),
  mutationLeaseId: z.uuid(),
  mutationLeaseContentHash: z.string().regex(SHA256_PATTERN),
  authorityCommitId: z.uuid(),
  delegabilityAdmissionId: z.uuid(),
  executionAuthorityId: z.uuid(),
  executionAuthorityContentHash: z.string().regex(SHA256_PATTERN),
  outcomeTransactionId: z.uuid(),
  assetId: z.uuid(),
  sourceAssetVersionId: z.uuid(),
  sourceAssetVersionHash: z.string().regex(SHA256_PATTERN),
  taskSpecId: z.uuid(),
  taskSpecVersion: z.number().int().positive(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  d5TargetPath: ExactPath,
  providerTargetPath: ExactPath,
  operation: z.literal("EDIT_REGION"),
  operationValue: z.unknown(),
  operationValueHash: z.string().regex(SHA256_PATTERN),
  operationBindingHash: z.string().regex(SHA256_PATTERN),
  createdAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  scope: z.literal(BUILD002_EXECUTION_ATTEMPT_RESERVATION_SCOPE),
  consequenceBoundary: z.literal(BUILD002_RESERVATION_CONSEQUENCE_BOUNDARY),
  reservationContentHash: z.string().regex(SHA256_PATTERN),
}).strict();

export type ExecutionAttemptReservation = z.infer<typeof ExecutionAttemptReservationSchema>;

export const ReservationConsumptionSchema = z.object({
  schemaVersion: z.literal(BUILD002_RESERVATION_CONSUMPTION_SCHEMA_VERSION),
  consumptionId: z.uuid(),
  reservationId: z.uuid(),
  executionAttemptId: z.uuid(),
  ownerTenantId: z.uuid(),
  mutationLeaseId: z.uuid(),
  executionAuthorityId: z.uuid(),
  authorityCommitId: z.uuid(),
  taskSpecHash: z.string().regex(SHA256_PATTERN),
  operationBindingHash: z.string().regex(SHA256_PATTERN),
  reservationContentHash: z.string().regex(SHA256_PATTERN),
  consumedAt: z.string().datetime(),
  providerOutcomeState: z.literal(BUILD002_RESERVATION_CONSUMPTION_STATE),
  consumptionContentHash: z.string().regex(SHA256_PATTERN),
}).strict();

export type ReservationConsumption = z.infer<typeof ReservationConsumptionSchema>;

export function reservationHashMaterial(
  value: Omit<ExecutionAttemptReservation, "reservationContentHash"> | ExecutionAttemptReservation,
): Record<string, unknown> {
  const { reservationId: _id, createdAt: _createdAt, reservationContentHash: _hash, ...material } = value as ExecutionAttemptReservation;
  void _id;
  void _createdAt;
  void _hash;
  return material;
}

export function verifyExecutionAttemptReservation(value: ExecutionAttemptReservation): boolean {
  try {
    const parsed = ExecutionAttemptReservationSchema.parse(value);
    return canonicalSha256(parsed.operationValue) === parsed.operationValueHash
      && canonicalSha256({
        operation: parsed.operation,
        operationValue: parsed.operationValue,
        providerTargetPath: parsed.providerTargetPath,
        taskSpecHash: parsed.taskSpecHash,
      }) === parsed.operationBindingHash
      && canonicalSha256(reservationHashMaterial(parsed)) === parsed.reservationContentHash;
  } catch {
    return false;
  }
}

export function consumptionHashMaterial(
  value: Omit<ReservationConsumption, "consumptionContentHash"> | ReservationConsumption,
): Record<string, unknown> {
  const { consumptionId: _id, consumedAt: _consumedAt, consumptionContentHash: _hash, ...material } = value as ReservationConsumption;
  void _id;
  void _consumedAt;
  void _hash;
  return material;
}

export function verifyReservationConsumption(value: ReservationConsumption): boolean {
  try {
    const parsed = ReservationConsumptionSchema.parse(value);
    return canonicalSha256(consumptionHashMaterial(parsed)) === parsed.consumptionContentHash;
  } catch {
    return false;
  }
}

export function immutableReservation(value: ExecutionAttemptReservation): ExecutionAttemptReservation {
  return immutableCopy(ExecutionAttemptReservationSchema.parse(value));
}

export function immutableConsumption(value: ReservationConsumption): ReservationConsumption {
  return immutableCopy(ReservationConsumptionSchema.parse(value));
}
