import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { AssetVersionRecord, StateCommitRecord } from "@/src/application/ports/repositories";

export type CanonicalCommitResult = Readonly<{
  stateCommit: StateCommitRecord;
  newVersion: AssetVersionRecord;
  idempotent: boolean;
}>;

export interface CanonicalCommitRepository {
  commitAcceptedFieldOutcome(authority: AuthorityContext, fieldOutcomeId: string): Promise<CanonicalCommitResult>;
}

export class CanonicalCommitError extends Error {
  constructor(readonly code: string, message = "No se pudo completar el commit canónico.") {
    super(message);
    this.name = "CanonicalCommitError";
  }
}
