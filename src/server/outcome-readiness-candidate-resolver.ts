import "server-only";

import { OutcomeDependencySnapshotResolver } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { OutcomeReadinessCandidateResolver, type ResolvedOutcomeReadinessCandidate } from "@/src/application/outcome/resolve-outcome-readiness-candidate";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { createTenantBuild002DependencyRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { resolveOutcomeRequirementAuthority } from "@/src/server/outcome-requirement-authority-resolver";

export async function resolveOutcomeReadinessCandidate(
  request: Request,
  outcomeTransactionId: string,
): Promise<ResolvedOutcomeReadinessCandidate> {
  const authority = await resolveOutcomeRequirementAuthority(request, outcomeTransactionId);
  const repositories = createTenantBuild002DependencyRepositories(authority.ownerTenantId);
  const signalUniverse = await new OutcomeSignalUniverseResolver(repositories.signalUniverse).resolve(authority);
  const dependency = await new OutcomeDependencySnapshotResolver(repositories).resolve(authority, signalUniverse);
  return new OutcomeReadinessCandidateResolver().resolve(authority, signalUniverse, dependency);
}
