import type { ReadinessAuthorityCommitRecord } from "@/src/application/ports/outcome/readiness-authority-commit-repository";

export type ReadinessAuthorityCommitScopedLookup = Readonly<{
  ownerTenantId: string;
  authorityCommitId: string;
}>;

export interface ReadinessAuthorityCommitScopedReader {
  findByScopedId(input: ReadinessAuthorityCommitScopedLookup): Promise<ReadinessAuthorityCommitRecord | null>;
}
