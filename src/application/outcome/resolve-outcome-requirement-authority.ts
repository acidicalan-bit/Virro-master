import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { OutcomeTransactionRecord, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { RequirementCatalogRepository } from "@/src/application/ports/outcome/requirement-catalog-repository";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import {
  verifyOutcomeTransactionRequirementBindingHash,
  type OutcomeTransactionRequirementBinding,
} from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import {
  verifyOutcomeBlueprintHash,
  type OutcomeBlueprint,
} from "@/src/domain/outcome/specification/outcome-blueprint";
import {
  compileSignalRequirements,
  verifyOutcomeRequirementProfileBlueprintBinding,
  verifyOutcomeRequirementProfileHash,
  type OutcomeRequirementProfile,
} from "@/src/domain/outcome/specification/outcome-requirement-profile";
import type { SignalRequirement } from "@/src/domain/outcome/signal-readiness";
import { immutableCopy } from "@/src/domain/outcome/specification/canonical";

export type TrustedClock = Readonly<{ now(): string }>;

export type ResolvedOutcomeRequirementAuthority = Readonly<{
  ownerTenantId: string;
  outcomeTransactionId: string;
  binding: OutcomeTransactionRequirementBinding;
  blueprint: OutcomeBlueprint;
  requirementProfile: OutcomeRequirementProfile;
  signalRequirements: SignalRequirement[];
  resolvedAt: string;
}>;

export class OutcomeRequirementAuthorityError extends Error {
  constructor(readonly code: "AUTHORITY_REQUIRED" | "UNAUTHENTICATED" | "INVALID_SESSION" | "AUTH_ENVIRONMENT_FAILURE" | "TENANT_MEMBERSHIP_REQUIRED" | "TENANT_NOT_SELECTED" | "TENANT_MEMBERSHIP_INACTIVE" | "REQUIREMENT_AUTHORITY_NOT_FOUND" | "CLOCK_INVALID", message = code) {
    super(message);
    this.name = "OutcomeRequirementAuthorityError";
  }
}

export type OutcomeRequirementAuthorityDependencies = Readonly<{
  transactions: OutcomeTransactionRepository;
  bindings: OutcomeTransactionRequirementBindingRepository;
  catalog: RequirementCatalogRepository;
  clock: TrustedClock;
}>;

export class OutcomeRequirementAuthorityResolver {
  constructor(private readonly dependencies: OutcomeRequirementAuthorityDependencies) {}

  async resolve(input: Readonly<{ authority: AuthorityContext; outcomeTransactionId: string }>): Promise<ResolvedOutcomeRequirementAuthority> {
    const authority = input.authority;
    if (!authority?.tenantId?.trim()) throw new OutcomeRequirementAuthorityError("AUTHORITY_REQUIRED");
    if (!input.outcomeTransactionId?.trim()) throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");

    const transaction = await this.readTransaction(input.outcomeTransactionId);
    if (!transaction || transaction.id !== input.outcomeTransactionId || transaction.ownerTenantId !== authority.tenantId) {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }

    const binding = await this.readBinding(input.outcomeTransactionId);
    if (!binding
      || binding.ownerTenantId !== authority.tenantId
      || binding.outcomeTransactionId !== transaction.id
      || !verifyOutcomeTransactionRequirementBindingHash(binding)
      || binding.policy.id !== null
      || binding.policy.hash !== null) {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }

    const profile = await this.readProfile(binding);
    if (!profile
      || profile.id !== binding.requirementProfile.id
      || profile.version !== binding.requirementProfile.version
      || profile.hash !== binding.requirementProfile.hash
      || profile.status !== "PUBLISHED"
      || profile.policy !== null
      || !verifyOutcomeRequirementProfileHash(profile)) {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }

    const blueprint = await this.readBlueprint(binding);
    if (!blueprint
      || blueprint.id !== binding.blueprint.id
      || blueprint.version !== binding.blueprint.version
      || blueprint.hash !== binding.blueprint.hash
      || blueprint.status !== "PUBLISHED"
      || !verifyOutcomeBlueprintHash(blueprint)
      || profile.blueprint.id !== binding.blueprint.id
      || profile.blueprint.version !== binding.blueprint.version
      || profile.blueprint.hash !== binding.blueprint.hash
      || !verifyOutcomeRequirementProfileBlueprintBinding(profile, blueprint)) {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }

    const resolvedAt = this.resolveTimestamp();
    const signalRequirements = compileSignalRequirements(profile, resolvedAt, blueprint);
    return immutableCopy({
      ownerTenantId: authority.tenantId,
      outcomeTransactionId: transaction.id,
      binding,
      blueprint,
      requirementProfile: profile,
      signalRequirements,
      resolvedAt,
    });
  }

  private async readTransaction(id: string): Promise<OutcomeTransactionRecord | null> {
    try {
      return await this.dependencies.transactions.findById(id);
    } catch {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }
  }

  private async readBinding(id: string): Promise<OutcomeTransactionRequirementBinding | null> {
    try {
      return await this.dependencies.bindings.get(id);
    } catch {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }
  }

  private async readProfile(binding: OutcomeTransactionRequirementBinding): Promise<OutcomeRequirementProfile | null> {
    try {
      return await this.dependencies.catalog.getRequirementProfile(binding.requirementProfile.id, binding.requirementProfile.version);
    } catch {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }
  }

  private async readBlueprint(binding: OutcomeTransactionRequirementBinding): Promise<OutcomeBlueprint | null> {
    try {
      return await this.dependencies.catalog.getBlueprint(binding.blueprint.id, binding.blueprint.version);
    } catch {
      throw new OutcomeRequirementAuthorityError("REQUIREMENT_AUTHORITY_NOT_FOUND");
    }
  }

  private resolveTimestamp(): string {
    try {
      const value = new Date(this.dependencies.clock.now());
      if (!Number.isFinite(value.getTime())) throw new Error("invalid clock");
      return value.toISOString();
    } catch {
      throw new OutcomeRequirementAuthorityError("CLOCK_INVALID");
    }
  }
}
