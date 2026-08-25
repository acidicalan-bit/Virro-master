import type { ExecutionAuthorityGrantRequest, ExecutionAuthorityRepository } from "@/src/application/ports/outcome/execution-authority-repository";
import type { Build002ExecutionAuthority } from "@/src/domain/outcome/build002-execution-authority";

/** D4 is an authority fact boundary; it intentionally does not bind or start execution. */
export class GrantExecutionAuthorityService {
  constructor(private readonly repository: ExecutionAuthorityRepository) {}

  grant(request: ExecutionAuthorityGrantRequest): Promise<Build002ExecutionAuthority> {
    return this.repository.grant(request);
  }
}
