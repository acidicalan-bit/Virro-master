import "server-only";

import { OutcomeSignalUniverseResolver, type ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { createTenantBuild002EvaluationRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { resolveOutcomeRequirementAuthority } from "@/src/server/outcome-requirement-authority-resolver";

export async function resolveOutcomeSignalUniverse(
  request: Request,
  outcomeTransactionId: string,
): Promise<ResolvedOutcomeSignalUniverse> {
  const authority = await resolveOutcomeRequirementAuthority(request, outcomeTransactionId);
  const repositories = createTenantBuild002EvaluationRepositories(authority.ownerTenantId);
  return new OutcomeSignalUniverseResolver(repositories.build002Readiness).resolve(authority);
}
