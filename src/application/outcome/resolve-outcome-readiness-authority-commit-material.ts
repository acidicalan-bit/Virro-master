import type { AssetRepository, AssetVersionRepository, OutcomeTransactionRepository } from "@/src/application/ports/repositories";
import type { ReadinessAuthorityCommitInput } from "@/src/application/ports/outcome/readiness-authority-commit-repository";
import type { ResolvedOutcomeRequirementAuthority } from "@/src/application/outcome/resolve-outcome-requirement-authority";
import type { ResolvedOutcomeDependencySnapshot } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";
import { AssetSchema } from "@/src/domain/outcome/asset";
import { AssetVersionSchema } from "@/src/domain/outcome/asset-version";
import { OutcomeTransactionSchema } from "@/src/domain/outcome/outcome-transaction";
import { canonicalSha256 } from "@/src/domain/outcome/specification/canonical";
import {
  SOURCE_ASSET_VERSION_BINDING_VERSION,
  TRANSACTION_SEMANTIC_BINDING_VERSION,
} from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

export type OutcomeReadinessAuthorityCommitMaterialRepositories = Readonly<{
  transactions: Pick<OutcomeTransactionRepository, "findById">;
  assets: Pick<AssetRepository, "findById">;
  assetVersions: Pick<AssetVersionRepository, "findById">;
}>;

export type OutcomeReadinessAuthorityCommitMaterial = Readonly<{
  transaction: ReadinessAuthorityCommitInput["transaction"];
  asset: ReadinessAuthorityCommitInput["asset"];
  sourceVersion: ReadinessAuthorityCommitInput["sourceVersion"];
  binding: ReadinessAuthorityCommitInput["binding"];
}>;

export type OutcomeReadinessAuthorityCommitMaterialInput = Readonly<{
  authority: ResolvedOutcomeRequirementAuthority;
  dependency: ResolvedOutcomeDependencySnapshot;
}>;

export type OutcomeReadinessAuthorityCommitMaterialErrorCode =
  | "MATERIAL_AUTHORITY_INVALID"
  | "MATERIAL_NOT_FOUND"
  | "MATERIAL_READ_FAILED"
  | "MATERIAL_HEAD_CHANGED"
  | "MATERIAL_SNAPSHOT_MISMATCH";

export class OutcomeReadinessAuthorityCommitMaterialError extends Error {
  constructor(readonly code: OutcomeReadinessAuthorityCommitMaterialErrorCode, message = code) {
    super(message);
    this.name = "OutcomeReadinessAuthorityCommitMaterialError";
  }
}

export class OutcomeReadinessAuthorityCommitMaterialResolver {
  constructor(private readonly repositories: OutcomeReadinessAuthorityCommitMaterialRepositories) {}

  async resolve(input: OutcomeReadinessAuthorityCommitMaterialInput): Promise<OutcomeReadinessAuthorityCommitMaterial> {
    const { authority, dependency } = input;
    if (!authority?.ownerTenantId?.trim()
      || !authority.outcomeTransactionId?.trim()
      || dependency.ownerTenantId !== authority.ownerTenantId
      || dependency.outcomeTransactionId !== authority.outcomeTransactionId
      || authority.binding.ownerTenantId !== authority.ownerTenantId
      || authority.binding.outcomeTransactionId !== authority.outcomeTransactionId
      || authority.binding.policy.id !== null
      || authority.binding.policy.hash !== null
      || authority.binding.blueprint.id !== authority.blueprint.id
      || authority.binding.blueprint.version !== authority.blueprint.version
      || authority.binding.blueprint.hash !== authority.blueprint.hash
      || authority.binding.requirementProfile.id !== authority.requirementProfile.id
      || authority.binding.requirementProfile.version !== authority.requirementProfile.version
      || authority.binding.requirementProfile.hash !== authority.requirementProfile.hash) {
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_AUTHORITY_INVALID");
    }

    const transaction = await this.readTransaction(authority.outcomeTransactionId);
    const asset = await this.readAsset(transaction.assetId);
    const sourceVersion = await this.readVersion(transaction.baseVersionId);
    if (transaction.ownerTenantId !== authority.ownerTenantId
      || asset.ownerTenantId !== authority.ownerTenantId
      || sourceVersion.ownerTenantId !== authority.ownerTenantId
      || transaction.assetId !== asset.id
      || transaction.projectId !== asset.projectId
      || transaction.baseVersionId !== sourceVersion.id
      || sourceVersion.assetId !== asset.id) {
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_AUTHORITY_INVALID");
    }
    if (asset.currentVersionId !== transaction.baseVersionId) {
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_HEAD_CHANGED");
    }

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
      versionId: sourceVersion.id,
      versionNumber: sourceVersion.versionNumber,
      parentVersionId: sourceVersion.parentVersionId,
      state: sourceVersion.state,
    });
    const snapshot = dependency.dependencySnapshot;
    if (snapshot.blueprintHash !== authority.blueprint.hash
      || snapshot.policyHash !== null
      || snapshot.transactionSemanticHash !== transactionSemanticHash
      || snapshot.sourceAssetVersionHash !== sourceAssetVersionHash) {
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_SNAPSHOT_MISMATCH");
    }

    return {
      transaction: {
        ownerTenantId: authority.ownerTenantId,
        transactionId: transaction.id,
        projectId: transaction.projectId,
        assetId: transaction.assetId,
        baseVersionId: transaction.baseVersionId,
        rawRequest: transaction.rawRequest,
      },
      asset: {
        id: asset.id,
        ownerTenantId: authority.ownerTenantId,
        projectId: asset.projectId,
        currentVersionId: asset.currentVersionId,
      },
      sourceVersion: {
        id: sourceVersion.id,
        ownerTenantId: authority.ownerTenantId,
        assetId: sourceVersion.assetId,
        versionNumber: sourceVersion.versionNumber,
        parentVersionId: sourceVersion.parentVersionId,
        state: sourceVersion.state,
      },
      binding: {
        bindingHash: authority.binding.bindingHash,
        blueprintId: authority.binding.blueprint.id,
        blueprintVersion: authority.binding.blueprint.version,
        blueprintHash: authority.binding.blueprint.hash,
        requirementProfileId: authority.binding.requirementProfile.id,
        requirementProfileVersion: authority.binding.requirementProfile.version,
        requirementProfileHash: authority.binding.requirementProfile.hash,
      },
    };
  }

  private async readTransaction(id: string) {
    try {
      const value = await this.repositories.transactions.findById(id);
      if (!value) throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_NOT_FOUND");
      return OutcomeTransactionSchema.parse(value);
    } catch (error) {
      if (error instanceof OutcomeReadinessAuthorityCommitMaterialError) throw error;
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_READ_FAILED");
    }
  }

  private async readAsset(id: string) {
    try {
      const value = await this.repositories.assets.findById(id);
      if (!value) throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_NOT_FOUND");
      return AssetSchema.parse(value);
    } catch (error) {
      if (error instanceof OutcomeReadinessAuthorityCommitMaterialError) throw error;
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_READ_FAILED");
    }
  }

  private async readVersion(id: string) {
    try {
      const value = await this.repositories.assetVersions.findById(id);
      if (!value) throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_NOT_FOUND");
      return AssetVersionSchema.parse(value);
    } catch (error) {
      if (error instanceof OutcomeReadinessAuthorityCommitMaterialError) throw error;
      throw new OutcomeReadinessAuthorityCommitMaterialError("MATERIAL_READ_FAILED");
    }
  }
}
