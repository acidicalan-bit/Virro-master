import { immutableCopy } from "@/src/domain/outcome/specification/canonical";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { Build002PersistenceRepository, Build002TenantSnapshotScope } from "@/src/application/ports/outcome/build002-persistence-repository";
import {
  SignalSchema,
  verifySignalContentHash,
  type Signal,
  type SignalRequirement,
} from "@/src/domain/outcome/signal-readiness";

export type ResolvedOutcomeSignalRequirement = Readonly<{
  requirement: SignalRequirement;
  signals: readonly Signal[];
}>;

export type ResolvedOutcomeSignalUniverse = Readonly<{
  ownerTenantId: string;
  outcomeTransactionId: string;
  requirements: readonly ResolvedOutcomeSignalRequirement[];
}>;

export class OutcomeSignalUniverseError extends Error {
  constructor(
    readonly code: "SIGNAL_UNIVERSE_NOT_FOUND" | "SIGNAL_UNIVERSE_INVALID" | "SIGNAL_UNIVERSE_READ_FAILED",
    message = code,
  ) {
    super(message);
    this.name = "OutcomeSignalUniverseError";
  }
}
export class OutcomeSignalUniverseResolver {
  constructor(private readonly repository: Pick<Build002PersistenceRepository, "listSignalsForRequirement">) {}

  async resolve(authority: ResolvedOutcomeRequirementAuthority): Promise<ResolvedOutcomeSignalUniverse> {
    const scope: Build002TenantSnapshotScope = {
      ownerTenantId: authority.ownerTenantId,
      outcomeTransactionId: authority.outcomeTransactionId,
    };
    const requirements = [...authority.signalRequirements].sort((left, right) => left.requirementId.localeCompare(right.requirementId));
    const requirementIds = new Set<string>();
    const resolved: ResolvedOutcomeSignalRequirement[] = [];

    for (const requirement of requirements) {
      if (requirementIds.has(requirement.requirementId)) throw new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_INVALID");
      requirementIds.add(requirement.requirementId);
      let signals: Signal[];
      try {
        signals = await this.repository.listSignalsForRequirement(scope, requirement.requirementDefinitionHash);
      } catch (error) {
        throw this.boundError(error);
      }

      try {
        const validated = signals.map((signal) => {
          const parsed = SignalSchema.parse(signal);
          if (parsed.ownerTenantId !== authority.ownerTenantId
            || parsed.transactionId !== authority.outcomeTransactionId
            || parsed.requirementId !== requirement.requirementId
            || !verifySignalContentHash(parsed)) {
            throw new Error("SIGNAL_UNIVERSE_INVALID");
          }
          return parsed;
        });
        const seenSignalIds = new Set<string>();
        for (const signal of validated) {
          if (seenSignalIds.has(signal.signalId)) throw new Error("SIGNAL_UNIVERSE_INVALID");
          seenSignalIds.add(signal.signalId);
        }
        validated.sort((left, right) => left.capturedAt.localeCompare(right.capturedAt) || left.signalId.localeCompare(right.signalId));
        resolved.push({ requirement, signals: validated });
      } catch {
        throw new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_INVALID");
      }
    }

    return immutableCopy({
      ownerTenantId: authority.ownerTenantId,
      outcomeTransactionId: authority.outcomeTransactionId,
      requirements: resolved,
    });
  }

  private boundError(error: unknown): OutcomeSignalUniverseError {
    if (error instanceof OutcomeSignalUniverseError) return error;
    if (error instanceof Error && /INVALID|HASH|TIMESTAMP|SCHEMA/.test(error.message)) {
      return new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_INVALID");
    }
    return new OutcomeSignalUniverseError("SIGNAL_UNIVERSE_READ_FAILED");
  }
}
