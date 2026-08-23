import type { AuthorityContext } from "@/src/domain/auth/authority";
import { immutableCopy } from "@/src/domain/outcome/specification/canonical";
import { assertDelegableReadiness, type DelegabilityAdmission } from "@/src/domain/outcome/delegability-admission";
import { currentDefaultEvaluator } from "@/src/domain/outcome/signal-readiness";
import type { DelegabilityAdmissionRepository } from "@/src/application/ports/outcome/delegability-admission-repository";
import type { OutcomeReadinessAuthorityCurrentnessRevalidator } from "@/src/application/outcome/revalidate-outcome-readiness-authority-currentness";
import type { SerializedDelegabilityMaterialResolver } from "@/src/application/outcome/resolve-serialized-delegability-material";

export type OutcomeDelegabilityAdmissionInput = Readonly<{ authority: AuthorityContext; authorityCommitId: string }>;
export class OutcomeDelegabilityAdmissionError extends Error {
  constructor(readonly code: "AUTHORITY_COMMIT_NOT_FOUND" | "AUTHORITY_NOT_CURRENT" | "HISTORICAL_GRAPH_INVALID" | "CURRENTNESS_NOT_CURRENT" | "READINESS_NOT_DELEGABLE" | "SOURCE_ASSET_HEAD_CHANGED" | "SERIALIZED_RECHECK_FAILED" | "ADMISSION_CONFLICT" | "DELEGABILITY_ADMISSION_FAILED", message = code) { super(message); this.name = "OutcomeDelegabilityAdmissionError"; }
}

export class OutcomeDelegabilityAdmissionService {
  constructor(private readonly currentness: Pick<OutcomeReadinessAuthorityCurrentnessRevalidator, "run">, private readonly repository: DelegabilityAdmissionRepository, private readonly materialResolver: Pick<SerializedDelegabilityMaterialResolver, "resolve">) {}

  async admit(input: OutcomeDelegabilityAdmissionInput): Promise<DelegabilityAdmission> {
    const authority = immutableCopy(input.authority);
    if (!authority?.tenantId || !input.authorityCommitId?.trim()) throw new OutcomeDelegabilityAdmissionError("AUTHORITY_COMMIT_NOT_FOUND");
    let result;
    try { result = await this.currentness.run({ authority, authorityCommitId: input.authorityCommitId }); }
    catch (error) { if (error instanceof Error && error.message.includes("NOT_FOUND")) throw new OutcomeDelegabilityAdmissionError("AUTHORITY_COMMIT_NOT_FOUND"); throw new OutcomeDelegabilityAdmissionError("DELEGABILITY_ADMISSION_FAILED"); }
    try {
      assertDelegableReadiness(result.historicalReadiness, result.currentness);
      if (result.currentness !== "CURRENT" || !result.currentDependencySnapshotHash) throw new Error("currentness");
      const evaluator = currentDefaultEvaluator();
      if (!result.currentDependencySnapshot) throw new Error("CURRENTNESS_NOT_CURRENT");
      const currentMaterial = await this.materialResolver.resolve({
        authority,
        outcomeTransactionId: result.authorityCommit.outcomeTransactionId,
        dependencySnapshot: result.currentDependencySnapshot,
        evaluator,
      });
      return await this.repository.admit({
        ownerTenantId: authority.tenantId,
        principalId: authority.principalId,
        membershipId: authority.membershipId,
        authorityCommitId: result.authorityCommit.authorityCommitId,
        outcomeTransactionId: result.authorityCommit.outcomeTransactionId,
        readinessId: result.historicalReadiness.id,
        readinessContentHash: result.historicalReadiness.readinessContentHash,
        historicalDependencySnapshotHash: result.authorityCommit.dependencySnapshotHash,
        currentDependencySnapshotHash: result.currentDependencySnapshotHash,
        evaluator,
        revalidatedAt: result.revalidatedAt,
        currentMaterial,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const known = ["AUTHORITY_NOT_CURRENT", "HISTORICAL_GRAPH_INVALID", "CURRENTNESS_NOT_CURRENT", "SOURCE_ASSET_HEAD_CHANGED", "SERIALIZED_RECHECK_FAILED", "ADMISSION_CONFLICT"] as const;
      if (code === "READINESS_NOT_DELEGABLE" || code === "DELEGABILITY_EVALUATOR_STALE") throw new OutcomeDelegabilityAdmissionError("READINESS_NOT_DELEGABLE");
      if ((known as readonly string[]).includes(code)) throw new OutcomeDelegabilityAdmissionError(code as typeof known[number]);
      throw new OutcomeDelegabilityAdmissionError("DELEGABILITY_ADMISSION_FAILED");
    }
  }
}
