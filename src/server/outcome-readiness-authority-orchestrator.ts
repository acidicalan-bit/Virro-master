import "server-only";

import type { AuthorityContext } from "@/src/domain/auth/authority";
import {
  OutcomeRequirementAuthorityResolver,
} from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { OutcomeDependencySnapshotResolver } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { OutcomeReadinessCandidateResolver } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import {
  OutcomeReadinessAuthorityCommitMaterialResolver,
} from "@/src/application/outcome/resolve-outcome-readiness-authority-commit-material";
import {
  OutcomeReadinessAuthorityOrchestrator,
  type OutcomeReadinessAuthorityOrchestrationResult,
} from "@/src/application/outcome/outcome-readiness-authority-orchestrator";
import {
  createTenantBuild002DependencyRepositories,
  createTenantBuild002EvaluationRepositories,
  createTenantOutcomeRequirementAuthorityRepositories,
  createTenantReadinessAuthorityCommitRepository,
} from "@/src/infrastructure/persistence/supabase-repositories";

export type ServerOutcomeReadinessAuthorityInput = Readonly<{
  authority: AuthorityContext;
  outcomeTransactionId: string;
}>;

export async function resolveOutcomeReadinessAuthorityCommit(
  input: ServerOutcomeReadinessAuthorityInput,
): Promise<OutcomeReadinessAuthorityOrchestrationResult> {
  const ownerTenantId = input.authority.tenantId;
  const authorityRepositories = createTenantOutcomeRequirementAuthorityRepositories(ownerTenantId);
  const evaluationRepositories = createTenantBuild002EvaluationRepositories(ownerTenantId);
  const dependencyRepositories = createTenantBuild002DependencyRepositories(ownerTenantId);
  const requirementAuthority = new OutcomeRequirementAuthorityResolver({
    transactions: authorityRepositories.outcomeTransactions,
    bindings: authorityRepositories.outcomeTransactionRequirementBindings,
    catalog: authorityRepositories.requirementCatalog,
    clock: { now: () => new Date().toISOString() },
  });
  const signalUniverse = new OutcomeSignalUniverseResolver(evaluationRepositories.build002Readiness);
  const dependencySnapshot = new OutcomeDependencySnapshotResolver(dependencyRepositories);
  const readinessCandidate = new OutcomeReadinessCandidateResolver();
  const material = new OutcomeReadinessAuthorityCommitMaterialResolver({
    transactions: dependencyRepositories.transactions,
    assets: dependencyRepositories.assets,
    assetVersions: dependencyRepositories.assetVersions,
  });
  const commit = createTenantReadinessAuthorityCommitRepository(ownerTenantId);
  const orchestrator = new OutcomeReadinessAuthorityOrchestrator({
    requirementAuthority,
    signalUniverse,
    dependencySnapshot,
    readinessCandidate,
    material,
    commit,
  });
  return orchestrator.run({
    authority: input.authority,
    outcomeTransactionId: input.outcomeTransactionId,
  });
}
