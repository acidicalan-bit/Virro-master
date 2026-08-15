import { z } from "zod";

import { assertAuthorityRole, type AuthorityContext } from "@/src/domain/auth/authority";
import type { CanonicalCommitRepository } from "@/src/application/ports/outcome/canonical-commit-repository";

export class CanonicalOutcomeCommitService {
  constructor(private readonly repository: CanonicalCommitRepository) {}

  commitAcceptedFieldOutcome(authority: AuthorityContext, fieldOutcomeId: string) {
    assertAuthorityRole(authority, "OWNER");
    return this.repository.commitAcceptedFieldOutcome(authority, z.uuid().parse(fieldOutcomeId));
  }
}
