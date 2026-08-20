import type { AssetRepository, AssetVersionRepository, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { Build002PersistenceRepository } from "@/src/application/ports/outcome/build002-persistence-repository";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeSignalUniverse } from "@/src/application/outcome/resolve-outcome-signal-universe";
import { AssetSchema } from "@/src/domain/outcome/asset";
import { AssetVersionSchema } from "@/src/domain/outcome/asset-version";
import { OutcomeTransactionSchema } from "@/src/domain/outcome/outcome-transaction";
import {
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  createDependencySnapshot,
  SignalSchema,
  verifySignalContentHash,
  type DependencySnapshot,
} from "@/src/domain/outcome/signal-readiness";
import { canonicalSha256, immutableCopy } from "@/src/domain/outcome/specification/canonical";

export const TRANSACTION_SEMANTIC_BINDING_VERSION = "build002-transaction-semantic-binding-v0.1" as const;
export const SOURCE_ASSET_VERSION_BINDING_VERSION = "build002-source-asset-version-binding-v0.1" as const;

export type OutcomeDependencySnapshotRepositories = Readonly<{
  transactions: Pick<OutcomeTransactionRepository, "findById">;
  assets: Pick<AssetRepository, "findById">;
  assetVersions: Pick<AssetVersionRepository, "findById">;
  signalUniverse: Pick<Build002PersistenceRepository, "listSignalsForRequirement">;
}>;

export type ResolvedOutcomeDependencySnapshot = Readonly<{
  ownerTenantId: string;
  outcomeTransactionId: string;
  dependencySnapshot: DependencySnapshot;
}>;

export type OutcomeDependencySnapshotErrorCode =
  | "DEPENDENCY_AUTHORITY_NOT_FOUND"
  | "DEPENDENCY_AUTHORITY_INVALID"
  | "DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH"
  | "DEPENDENCY_SIGNAL_REFERENCE_INVALID"
  | "SOURCE_ASSET_HEAD_UNAVAILABLE"
  | "SOURCE_ASSET_HEAD_CHANGED"
  | "DEPENDENCY_SNAPSHOT_INVALID"
  | "DEPENDENCY_READ_FAILED";

export class OutcomeDependencySnapshotError extends Error {
  constructor(readonly code: OutcomeDependencySnapshotErrorCode, message = code) {
    super(message);
    this.name = "OutcomeDependencySnapshotError";
  }
}

export class OutcomeDependencySnapshotResolver {
  constructor(private readonly repositories: OutcomeDependencySnapshotRepositories) {}

  async resolve(
    authority: ResolvedOutcomeRequirementAuthority,
    signalUniverse: ResolvedOutcomeSignalUniverse,
  ): Promise<ResolvedOutcomeDependencySnapshot> {
    const transaction = await this.readTransaction(authority);
    const asset = await this.readAsset(transaction.assetId);
    const version = await this.readVersion(transaction.baseVersionId);
    this.assertOwnershipChain(authority, transaction, asset, version);

    if (asset.currentVersionId === null) {
      throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_UNAVAILABLE");
    }
    if (asset.currentVersionId !== transaction.baseVersionId) {
      throw new OutcomeDependencySnapshotError("SOURCE_ASSET_HEAD_CHANGED");
    }

    this.assertRequirementUniverse(authority, signalUniverse);
    const signalReferences = this.collectSignalReferences(authority, signalUniverse);
    const transactionSemanticHash = canonicalSha256({
      schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION,
      ownerTenantId: authority.ownerTenantId,
      transactionId: transaction.id,
      projectId: transaction.projectId,
      assetId: transaction.assetId,
      baseVersionId: transaction.baseVersionId,
      rawRequest: transaction.rawRequest,
    });
    const sourceAssetVersionHash = canonicalSha256({
      schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION,
      ownerTenantId: authority.ownerTenantId,
      assetId: asset.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      parentVersionId: version.parentVersionId,
      state: version.state,
    });

    try {
      const dependencySnapshot = createDependencySnapshot({
        schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
        ownerTenantId: authority.ownerTenantId,
        transactionId: authority.outcomeTransactionId,
        requirementDefinitionHashes: authority.signalRequirements.map((requirement) => requirement.requirementDefinitionHash),
        signalReferences,
        dependencyBindings: [
          { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: authority.blueprint.hash },
          { identity: BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC, hash: transactionSemanticHash },
          { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: sourceAssetVersionHash },
        ],
        blueprintHash: authority.blueprint.hash,
        policyHash: null,
        taskSpecHash: null,
        transactionSemanticHash,
        sourceAssetVersionHash,
        contextLensHash: null,
      });
      return immutableCopy({
        ownerTenantId: authority.ownerTenantId,
        outcomeTransactionId: authority.outcomeTransactionId,
        dependencySnapshot,
      });
    } catch {
      throw new OutcomeDependencySnapshotError("DEPENDENCY_SNAPSHOT_INVALID");
    }
  }

  private async readTransaction(authority: ResolvedOutcomeRequirementAuthority) {
    try {
      const transaction = await this.repositories.transactions.findById(authority.outcomeTransactionId);
      if (!transaction) throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_NOT_FOUND");
      const parsed = OutcomeTransactionSchema.parse(transaction);
      if (parsed.id !== authority.outcomeTransactionId || parsed.ownerTenantId !== authority.ownerTenantId) {
        throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_INVALID");
      }
      return parsed;
    } catch (error) {
      if (error instanceof OutcomeDependencySnapshotError) throw error;
      throw new OutcomeDependencySnapshotError("DEPENDENCY_READ_FAILED");
    }
  }

  private async readAsset(assetId: string) {
    try {
      const asset = await this.repositories.assets.findById(assetId);
      if (!asset) throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_NOT_FOUND");
      return AssetSchema.parse(asset);
    } catch (error) {
      if (error instanceof OutcomeDependencySnapshotError) throw error;
      throw new OutcomeDependencySnapshotError("DEPENDENCY_READ_FAILED");
    }
  }

  private async readVersion(versionId: string) {
    try {
      const version = await this.repositories.assetVersions.findById(versionId);
      if (!version) throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_NOT_FOUND");
      return AssetVersionSchema.parse(version);
    } catch (error) {
      if (error instanceof OutcomeDependencySnapshotError) throw error;
      throw new OutcomeDependencySnapshotError("DEPENDENCY_READ_FAILED");
    }
  }

  private assertOwnershipChain(
    authority: ResolvedOutcomeRequirementAuthority,
    transaction: ReturnType<typeof OutcomeTransactionSchema.parse>,
    asset: ReturnType<typeof AssetSchema.parse>,
    version: ReturnType<typeof AssetVersionSchema.parse>,
  ): void {
    if (transaction.projectId !== asset.projectId
      || transaction.assetId !== asset.id
      || transaction.baseVersionId !== version.id
      || version.assetId !== asset.id
      || transaction.ownerTenantId !== authority.ownerTenantId
      || asset.ownerTenantId !== authority.ownerTenantId
      || version.ownerTenantId !== authority.ownerTenantId) {
      throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_INVALID");
    }
  }

  private assertRequirementUniverse(
    authority: ResolvedOutcomeRequirementAuthority,
    signalUniverse: ResolvedOutcomeSignalUniverse,
  ): void {
    if (signalUniverse.ownerTenantId !== authority.ownerTenantId
      || signalUniverse.outcomeTransactionId !== authority.outcomeTransactionId) {
      throw new OutcomeDependencySnapshotError("DEPENDENCY_AUTHORITY_INVALID");
    }
    const authoritySet = new Map(authority.signalRequirements.map((requirement) => [requirement.requirementId, requirement.requirementDefinitionHash]));
    const universeSet = new Map(signalUniverse.requirements.map((entry) => [entry.requirement.requirementId, entry.requirement.requirementDefinitionHash]));
    if (authoritySet.size !== authority.signalRequirements.length
      || universeSet.size !== signalUniverse.requirements.length
      || new Set(authority.signalRequirements.map((requirement) => requirement.requirementDefinitionHash)).size !== authority.signalRequirements.length
      || authoritySet.size !== universeSet.size
      || [...authoritySet].some(([id, hash]) => universeSet.get(id) !== hash)) {
      throw new OutcomeDependencySnapshotError("DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH");
    }
  }

  private collectSignalReferences(
    authority: ResolvedOutcomeRequirementAuthority,
    signalUniverse: ResolvedOutcomeSignalUniverse,
  ): Array<{ requirementId: string; signalId: string; contentHash: string }> {
    const knownRequirements = new Set(authority.signalRequirements.map((requirement) => requirement.requirementId));
    const seenSignalIds = new Set<string>();
    const references: Array<{ requirementId: string; signalId: string; contentHash: string }> = [];
    for (const entry of signalUniverse.requirements) {
      if (!knownRequirements.has(entry.requirement.requirementId)) {
        throw new OutcomeDependencySnapshotError("DEPENDENCY_REQUIREMENT_UNIVERSE_MISMATCH");
      }
      for (const signal of entry.signals) {
        try {
          const parsed = SignalSchema.parse(signal);
          if (parsed.ownerTenantId !== authority.ownerTenantId
            || parsed.transactionId !== authority.outcomeTransactionId
            || parsed.requirementId !== entry.requirement.requirementId
            || !verifySignalContentHash(parsed)) {
            throw new Error("invalid signal");
          }
        } catch {
          throw new OutcomeDependencySnapshotError("DEPENDENCY_SIGNAL_REFERENCE_INVALID");
        }
        if (seenSignalIds.has(signal.signalId)) {
          throw new OutcomeDependencySnapshotError("DEPENDENCY_SIGNAL_REFERENCE_INVALID");
        }
        seenSignalIds.add(signal.signalId);
        references.push({ requirementId: entry.requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash });
      }
    }
    return references;
  }
}
