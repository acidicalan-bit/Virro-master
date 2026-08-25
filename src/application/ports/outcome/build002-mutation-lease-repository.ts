import type { Build002MutationLease } from "@/src/domain/outcome/build002-mutation-lease";

export type Build002MutationLeaseGrantRequest = Readonly<{
  principalId: string;
  membershipId: string;
  executionAuthorityId: string;
  targetPath: string;
  category: "MUTABLE";
}>;

export type Build002MutationLeaseRepository = Readonly<{
  grant(request: Build002MutationLeaseGrantRequest): Promise<Build002MutationLease>;
  findById(id: string): Promise<Build002MutationLease | null>;
}>;
