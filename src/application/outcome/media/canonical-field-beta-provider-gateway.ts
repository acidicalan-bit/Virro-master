import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { ImageEditContext, ImageEditExecutor, ImageEditResult } from "@/src/application/ports/outcome/image-edit-executor-port";
import type { ExecutionAttemptReservationRepository } from "@/src/application/ports/outcome/execution-attempt-reservation-repository";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";

export type CanonicalFieldBetaProviderInvocation = Readonly<{
  authority: AuthorityContext;
  taskSpec: TaskSpec;
  context: ImageEditContext;
}>;

export type CanonicalFieldBetaProviderResult = Readonly<{
  reservationId: string;
  consumptionId: string;
  executionAttemptId: string;
  providerResult: ImageEditResult;
}>;

export class CanonicalFieldBetaProviderGateway {
  constructor(
    private readonly reservations: ExecutionAttemptReservationRepository,
    private readonly executor: ImageEditExecutor,
  ) {}

  async invoke(input: CanonicalFieldBetaProviderInvocation): Promise<CanonicalFieldBetaProviderResult> {
    if (input.taskSpec.transactionId !== input.context.transactionId) throw new Error("D6_TASK_SPEC_TRANSACTION_MISMATCH");
    const operationValue = Object.freeze({ instruction: input.context.instruction, roi: input.context.roi });
    const reservation = await this.reservations.reserve({
      principalId: input.authority.principalId,
      membershipId: input.authority.membershipId,
      outcomeTransactionId: input.context.transactionId,
      taskSpecId: input.taskSpec.id,
      taskSpecHash: input.taskSpec.hash,
      d5TargetPath: "instruction",
      providerTargetPath: "media.pixels",
      operation: "EDIT_REGION",
      operationValue,
    });
    const consumption = await this.reservations.consume({
      principalId: input.authority.principalId,
      membershipId: input.authority.membershipId,
      reservationId: reservation.reservationId,
      executionAttemptId: reservation.executionAttemptId,
    });
    if (reservation.executionAttemptId !== consumption.executionAttemptId) throw new Error("D6_ATTEMPT_LINEAGE_MISMATCH");
    const providerResult = await this.executor.execute({
      ...input.context,
      executionAttemptId: consumption.executionAttemptId,
    });
    return {
      reservationId: reservation.reservationId,
      consumptionId: consumption.consumptionId,
      executionAttemptId: consumption.executionAttemptId,
      providerResult,
    };
  }
}
