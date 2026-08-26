import type {
  ExecutionAttemptReservation,
  ReservationConsumption,
} from "@/src/domain/outcome/build002-execution-attempt-reservation";

export type ReserveExecutionAttemptRequest = Readonly<{
  principalId: string;
  membershipId: string;
  outcomeTransactionId: string;
  taskSpecId: string;
  taskSpecHash: string;
  d5TargetPath: string;
  providerTargetPath: string;
  operation: "EDIT_REGION";
  operationValue: Readonly<Record<string, unknown>>;
}>;

export type ConsumeExecutionAttemptRequest = Readonly<{
  principalId: string;
  membershipId: string;
  reservationId: string;
  executionAttemptId: string;
}>;

export interface ExecutionAttemptReservationRepository {
  reserve(request: ReserveExecutionAttemptRequest): Promise<ExecutionAttemptReservation>;
  consume(request: ConsumeExecutionAttemptRequest): Promise<ReservationConsumption>;
  findReservationById(reservationId: string): Promise<ExecutionAttemptReservation | null>;
}
