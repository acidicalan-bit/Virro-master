import "server-only";

import type { AuthorityContext } from "@/src/domain/auth/authority";
import {
  OutcomeReadinessAuthorityCurrentnessRevalidator,
  type OutcomeReadinessCurrentnessResult,
} from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import { OutcomeRequirementAuthorityResolver } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { OutcomeDependencySnapshotResolver } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import {
  createTenantBuild002DependencyRepositories,
  createTenantBuild002EvaluationRepositories,
  createTenantOutcomeRequirementAuthorityRepositories,
  createTenantReadinessAuthorityCurrentnessRepositories,
} from "@/src/infrastructure/persistence/supabase-repositories";

export type ServerOutcomeReadinessCurrentnessInput = Readonly<{
  authority: AuthorityContext;
  authorityCommitId: string;
}>;

export async function revalidateOutcomeReadinessAuthorityCurrentness(
  input: ServerOutcomeReadinessCurrentnessInput,
): Promise<OutcomeReadinessCurrentnessResult> {
  const ownerTenantId = input.authority.tenantId;
  const authorityRepositories = createTenantOutcomeRequirementAuthorityRepositories(ownerTenantId);
  const evaluationRepositories = createTenantBuild002EvaluationRepositories(ownerTenantId);
  const dependencyRepositories = createTenantBuild002DependencyRepositories(ownerTenantId);
  const currentnessRepositories = createTenantReadinessAuthorityCurrentnessRepositories(ownerTenantId);
  const requirementAuthority = new OutcomeRequirementAuthorityResolver({
    transactions: authorityRepositories.outcomeTransactions,
    bindings: authorityRepositories.outcomeTransactionRequirementBindings,
    catalog: authorityRepositories.requirementCatalog,
    clock: { now: () => new Date().toISOString() },
  });
  const signalUniverse = new OutcomeSignalUniverseResolver(evaluationRepositories.build002Readiness);
  const dependencySnapshot = new OutcomeDependencySnapshotResolver(dependencyRepositories);
  const revalidator = new OutcomeReadinessAuthorityCurrentnessRevalidator({
    scopedCommitReader: currentnessRepositories.scopedCommitReader,
    persistence: currentnessRepositories.persistence,
    requirementAuthority,
    signalUniverse,
    dependencySnapshot,
    clock: { now: () => new Date().toISOString() },
  });
  return revalidator.run(input);
}
