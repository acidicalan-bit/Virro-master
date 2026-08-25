import type { Build002ExecutionAuthority } from "@/src/domain/outcome/build002-execution-authority";

export type ExecutionAuthorityGrantRequest = Readonly<{
  principalId: string;
  membershipId: string;
  admissionId: string;
  taskSpecId: string;
  taskSpecHash: string;
}>;

export type ExecutionAuthorityRepository = Readonly<{
  grant(request: ExecutionAuthorityGrantRequest): Promise<Build002ExecutionAuthority>;
  findById(id: string): Promise<Build002ExecutionAuthority | null>;
}>;
