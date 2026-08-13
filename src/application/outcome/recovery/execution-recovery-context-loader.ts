import type { ExecutionRunRepository } from "@/src/application/ports/repositories";
import { FIELD_TENANT_ID } from "@/src/domain/outcome/media/field-beta";
import { parseRecoveryMetadata, type RecoveryLoadResult } from "./execution-recovery-context";

export type TrustedRecoveryAuthority = { tenantId: typeof FIELD_TENANT_ID };

export interface ExecutionRecoveryContextLoader {
  load(executionRunId: string, authority: TrustedRecoveryAuthority): Promise<RecoveryLoadResult>;
}

export class DurableExecutionRecoveryContextLoader implements ExecutionRecoveryContextLoader {
  constructor(private readonly executions: ExecutionRunRepository) {}

  async load(executionRunId: string, authority: TrustedRecoveryAuthority): Promise<RecoveryLoadResult> {
    if (!authority || authority.tenantId !== FIELD_TENANT_ID) return { status: "NOT_FOUND", reason: "Recovery authority is not valid." };
    const execution = await this.executions.findById(executionRunId);
    if (!execution || execution.status !== "SUCCESS") return { status: "NOT_FOUND", reason: "Successful execution checkpoint was not found." };
    const result = parseRecoveryMetadata(execution.metadata);
    if (result.status === "REDRIVABLE" && result.context.executionRunId !== execution.id) return { status: "INCOMPLETE_OR_CORRUPT", reason: "Execution id does not match recovery context." };
    if (result.status === "REDRIVABLE" && result.context.tenantId !== authority.tenantId) return { status: "NOT_FOUND", reason: "Execution does not belong to the trusted tenant." };
    return result;
  }
}
