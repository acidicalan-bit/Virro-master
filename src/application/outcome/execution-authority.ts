import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";

export type ExecutionAuthority = Readonly<{
  authority: AuthorityContext;
  projectId: string;
  assetId: string;
  transactionId: string;
  baseVersionId: string;
  taskSpecId: string;
  taskSpecHash: string;
  capabilities: readonly string[];
  mutationPaths: readonly string[];
}>;

export function bindExecutionAuthority(input: {
  authority: AuthorityContext;
  ownerTenantId: string;
  projectId: string;
  assetId: string;
  transactionId: string;
  baseVersionId: string;
  taskSpec: TaskSpec;
  mutationPaths: readonly string[];
}): ExecutionAuthority {
  if (input.authority.tenantId !== input.ownerTenantId) {
    throw new Error("Authority tenant does not own this execution.");
  }
  if (
    input.taskSpec.transactionId !== input.transactionId
    || input.taskSpec.source.assetId !== input.assetId
    || input.taskSpec.source.versionId !== input.baseVersionId
  ) {
    throw new Error("Task Spec is not bound to this authorized execution.");
  }
  return Object.freeze({
    authority: input.authority,
    projectId: input.projectId,
    assetId: input.assetId,
    transactionId: input.transactionId,
    baseVersionId: input.baseVersionId,
    taskSpecId: input.taskSpec.id,
    taskSpecHash: input.taskSpec.hash,
    capabilities: Object.freeze([...input.taskSpec.capabilityGrant]),
    mutationPaths: Object.freeze([...input.mutationPaths]),
  });
}
