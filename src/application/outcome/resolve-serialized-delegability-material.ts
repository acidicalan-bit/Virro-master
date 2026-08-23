import type { OutcomeTransactionRepository, AssetRepository, AssetVersionRepository } from "@/src/application/ports/repositories";
import type { OutcomeTransactionRequirementBindingRepository } from "@/src/application/ports/outcome/transaction-requirement-binding-repository";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import { AssetSchema } from "@/src/domain/outcome/asset";
import { AssetVersionSchema } from "@/src/domain/outcome/asset-version";
import { OutcomeTransactionSchema } from "@/src/domain/outcome/outcome-transaction";
import { BUILD002_DEPENDENCY_IDENTITIES, type DependencySnapshot, type EvaluatorIdentity } from "@/src/domain/outcome/signal-readiness";
import type { OutcomeTransactionRequirementBinding } from "@/src/domain/outcome/specification/outcome-transaction-requirement-binding";
import { canonicalSha256, immutableCopy } from "@/src/domain/outcome/specification/canonical";
import { SOURCE_ASSET_VERSION_BINDING_VERSION, TRANSACTION_SEMANTIC_BINDING_VERSION } from "@/src/application/outcome/resolve-outcome-dependency-snapshot";

export type SerializedDelegabilityRecheckMaterial = Readonly<{
  transaction: Readonly<{ ownerTenantId: string; transactionId: string; projectId: string; assetId: string; baseVersionId: string; rawRequest: string }>;
  asset: Readonly<{ id: string; projectId: string; ownerTenantId: string; currentVersionId: string | null }>;
  sourceVersion: Readonly<{ id: string; assetId: string; ownerTenantId: string; versionNumber: number; parentVersionId: string | null; state: Record<string, unknown> }>;
  binding: Readonly<{
    ownerTenantId: string;
    outcomeTransactionId: string;
    blueprint: Readonly<{ id: string; version: number; hash: string }>;
    requirementProfile: Readonly<{ id: string; version: number; hash: string }>;
    policy: Readonly<{ id: null; hash: null }>;
    bindingHash: string;
  }>;
  dependencySnapshot: DependencySnapshot;
  evaluator: EvaluatorIdentity;
}>;

export type SerializedDelegabilityMaterialDependencies = Readonly<{
  transactions: Pick<OutcomeTransactionRepository, "findById">;
  assets: Pick<AssetRepository, "findById">;
  assetVersions: Pick<AssetVersionRepository, "findById">;
  bindings: Pick<OutcomeTransactionRequirementBindingRepository, "get">;
}>;

export class SerializedDelegabilityMaterialResolver {
  constructor(private readonly repositories: SerializedDelegabilityMaterialDependencies) {}

  async resolve(input: Readonly<{ authority: AuthorityContext; outcomeTransactionId: string; dependencySnapshot: DependencySnapshot; evaluator: EvaluatorIdentity }>): Promise<SerializedDelegabilityRecheckMaterial> {
    const [transactionRow, bindingRow] = await Promise.all([
      this.repositories.transactions.findById(input.outcomeTransactionId),
      this.repositories.bindings.get(input.outcomeTransactionId),
    ]);
    const transaction = OutcomeTransactionSchema.parse(transactionRow);
    const binding = bindingRow as OutcomeTransactionRequirementBinding | null;
    if (!binding || transaction.ownerTenantId !== input.authority.tenantId || transaction.id !== input.outcomeTransactionId || !transaction.ownerTenantId) throw new Error("HISTORICAL_GRAPH_INVALID");
    const [assetRow, versionRow] = await Promise.all([
      this.repositories.assets.findById(transaction.assetId),
      this.repositories.assetVersions.findById(transaction.baseVersionId),
    ]);
    const asset = AssetSchema.parse(assetRow);
    const sourceVersion = AssetVersionSchema.parse(versionRow);
    if (!asset.ownerTenantId || !sourceVersion.ownerTenantId || asset.ownerTenantId !== input.authority.tenantId || sourceVersion.ownerTenantId !== input.authority.tenantId || asset.id !== transaction.assetId || sourceVersion.id !== transaction.baseVersionId || sourceVersion.assetId !== asset.id) throw new Error("HISTORICAL_GRAPH_INVALID");
    const transactionSemanticHash = canonicalSha256({ schemaVersion: TRANSACTION_SEMANTIC_BINDING_VERSION, ownerTenantId: input.authority.tenantId, transactionId: transaction.id, projectId: transaction.projectId, assetId: transaction.assetId, baseVersionId: transaction.baseVersionId, rawRequest: transaction.rawRequest });
    const sourceAssetVersionHash = canonicalSha256({ schemaVersion: SOURCE_ASSET_VERSION_BINDING_VERSION, ownerTenantId: input.authority.tenantId, assetId: asset.id, versionId: sourceVersion.id, versionNumber: sourceVersion.versionNumber, parentVersionId: sourceVersion.parentVersionId, state: sourceVersion.state });
    if (input.dependencySnapshot.transactionSemanticHash !== transactionSemanticHash
      || input.dependencySnapshot.sourceAssetVersionHash !== sourceAssetVersionHash
      || input.dependencySnapshot.blueprintHash !== binding.blueprint.hash
      || input.dependencySnapshot.dependencyBindings.some((bindingEntry) => bindingEntry.identity === BUILD002_DEPENDENCY_IDENTITIES.TRANSACTION_SEMANTIC && bindingEntry.hash !== transactionSemanticHash)
      || input.dependencySnapshot.dependencyBindings.some((bindingEntry) => bindingEntry.identity === BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION && bindingEntry.hash !== sourceAssetVersionHash)) {
      throw new Error("CURRENTNESS_NOT_CURRENT");
    }
    return immutableCopy({
      transaction: { ownerTenantId: transaction.ownerTenantId, transactionId: transaction.id, projectId: transaction.projectId, assetId: transaction.assetId, baseVersionId: transaction.baseVersionId, rawRequest: transaction.rawRequest },
      asset: { id: asset.id, projectId: asset.projectId, ownerTenantId: asset.ownerTenantId, currentVersionId: asset.currentVersionId },
      sourceVersion: { id: sourceVersion.id, assetId: sourceVersion.assetId, ownerTenantId: sourceVersion.ownerTenantId, versionNumber: sourceVersion.versionNumber, parentVersionId: sourceVersion.parentVersionId, state: sourceVersion.state },
      binding: { ownerTenantId: binding.ownerTenantId, outcomeTransactionId: binding.outcomeTransactionId, blueprint: binding.blueprint, requirementProfile: binding.requirementProfile, policy: binding.policy, bindingHash: binding.bindingHash },
      dependencySnapshot: input.dependencySnapshot,
      evaluator: input.evaluator,
    });
  }
}
