import "server-only";

import { OutcomeDependencySnapshotResolver, type ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { OutcomeSignalUniverseResolver } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { createTenantBuild002DependencyRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { resolveOutcomeRequirementAuthority } from "@/src/server/outcome-requirement-authority-resolver";

export async function resolveOutcomeDependencySnapshot(
  request: Request,
  outcomeTransactionId: string,
): Promise<ResolvedOutcomeDependencySnapshot> {
  const authority = await resolveOutcomeRequirementAuthority(request, outcomeTransactionId);
  const repositories = createTenantBuild002DependencyRepositories(authority.ownerTenantId);
  const signalUniverse = await new OutcomeSignalUniverseResolver(repositories.signalUniverse).resolve(authority);
  return new OutcomeDependencySnapshotResolver(repositories).resolve(authority, signalUniverse);
}
