import "server-only";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { DelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";
import { OutcomeDelegabilityAdmissionService } from "@/src/application/outcome/admit-outcome-delegability";
import { OutcomeReadinessAuthorityCurrentnessRevalidator } from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import { OutcomeRequirementAuthorityResolver } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { OutcomeDependencySnapshotResolver } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { SerializedDelegabilityMaterialResolver } from "@/src/application/outcome/resolve-serialized-delegability-material";
import {
  createTenantBuild002DependencyRepositories,
  createTenantBuild002EvaluationRepositories,
  createTenantDelegabilityAdmissionRepository,
  createTenantOutcomeRequirementAuthorityRepositories,
  createTenantReadinessAuthorityCurrentnessRepositories,
} from "@/src/infrastructure/persistence/supabase-repositories";

export async function admitOutcomeDelegability(input: Readonly<{ authority: AuthorityContext; authorityCommitId: string }>): Promise<DelegabilityAdmission> {
  const tenant = input.authority.tenantId;
  const authorityRepos = createTenantOutcomeRequirementAuthorityRepositories(tenant);
  const evaluationRepos = createTenantBuild002EvaluationRepositories(tenant);
  const dependencyRepos = createTenantBuild002DependencyRepositories(tenant);
  const currentRepos = createTenantReadinessAuthorityCurrentnessRepositories(tenant);
  const authority = new OutcomeRequirementAuthorityResolver({ transactions: authorityRepos.outcomeTransactions, bindings: authorityRepos.outcomeTransactionRequirementBindings, catalog: authorityRepos.requirementCatalog, clock: { now: () => new Date().toISOString() } });
  const revalidator = new OutcomeReadinessAuthorityCurrentnessRevalidator({
    scopedCommitReader: currentRepos.scopedCommitReader,
    persistence: currentRepos.persistence,
    requirementAuthority: authority,
    signalUniverse: new OutcomeSignalUniverseResolver(evaluationRepos.build002Readiness),
    dependencySnapshot: new OutcomeDependencySnapshotResolver(dependencyRepos),
  });
  const material = new SerializedDelegabilityMaterialResolver({
    transactions: authorityRepos.outcomeTransactions,
    assets: dependencyRepos.assets,
    assetVersions: dependencyRepos.assetVersions,
    bindings: authorityRepos.outcomeTransactionRequirementBindings,
  });
  return new OutcomeDelegabilityAdmissionService(revalidator, createTenantDelegabilityAdmissionRepository(tenant), material).admit(input);
}
