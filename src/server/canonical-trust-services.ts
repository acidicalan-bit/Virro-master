import "server-only";

import { CanonicalOutcomeCommitService } from "@/src/application/outcome/canonical-outcome-commit-service";
import { SupabaseCanonicalCommitRepository } from "@/src/infrastructure/persistence/outcome/supabase-canonical-commit-repository";
import { createUserScopedSupabaseClient } from "@/src/infrastructure/supabase/server-client";

export async function createCanonicalOutcomeCommitService(request: Request) {
  return new CanonicalOutcomeCommitService(new SupabaseCanonicalCommitRepository(await createUserScopedSupabaseClient(request)));
}
