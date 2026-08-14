import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { TenantCoreLineageRepository } from "@/src/application/ports/outcome/tenant-core-lineage-repository";
import { assertTenantOwner, TenantLineageAuthorizationError } from "@/src/application/ports/outcome/tenant-core-lineage-repository";
import type { ProjectRepository, AssetRepository, AssetVersionRepository, OutcomeTransactionRepository } from "@/src/application/ports/repositories";

export class InMemoryTenantCoreLineageRepository implements TenantCoreLineageRepository {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly assets: AssetRepository,
    private readonly versions: AssetVersionRepository,
    private readonly transactions: OutcomeTransactionRepository,
  ) {}

  async createProject(authority: AuthorityContext, input: { name: string; description: string | null }) {
    return this.projects.create({ ...input, ownerTenantId: authority.tenantId });
  }

  async findProject(authority: AuthorityContext, id: string) {
    const row = await this.projects.findById(id);
    if (!row) return null;
    assertTenantOwner(row, authority);
    return row;
  }

  async createAsset(authority: AuthorityContext, input: { projectId: string; name: string; description: string | null }) {
    const project = await this.findProject(authority, input.projectId);
    if (!project) throw new TenantLineageAuthorizationError("El proyecto no existe o no pertenece al tenant autorizado.");
    return this.assets.create({ ...input, ownerTenantId: authority.tenantId });
  }

  async findAsset(authority: AuthorityContext, id: string) {
    const row = await this.assets.findById(id);
    if (!row) return null;
    assertTenantOwner(row, authority);
    return row;
  }

  async setCurrentVersion(authority: AuthorityContext, assetId: string, versionId: string) {
    const asset = await this.findAsset(authority, assetId);
    const version = await this.findAssetVersion(authority, versionId);
    if (!asset || !version || version.assetId !== asset.id) throw new TenantLineageAuthorizationError("La versión no pertenece al activo autorizado.");
    return this.assets.update(asset.id, { currentVersionId: version.id });
  }

  async createAssetVersion(authority: AuthorityContext, input: { assetId: string; versionNumber: number; state: Record<string, unknown>; parentVersionId: string | null }) {
    const asset = await this.findAsset(authority, input.assetId);
    if (!asset) throw new TenantLineageAuthorizationError("El activo no existe o no pertenece al tenant autorizado.");
    if (input.parentVersionId) {
      const parent = await this.versions.findById(input.parentVersionId);
      if (!parent || parent.assetId !== asset.id) throw new TenantLineageAuthorizationError("La versión padre no pertenece al activo.");
      assertTenantOwner(parent, authority);
    }
    return this.versions.create({ ...input, ownerTenantId: authority.tenantId });
  }

  async findAssetVersion(authority: AuthorityContext, id: string) {
    const row = await this.versions.findById(id);
    if (!row) return null;
    assertTenantOwner(row, authority);
    const asset = await this.findAsset(authority, row.assetId);
    if (!asset) throw new TenantLineageAuthorizationError();
    return row;
  }

  async createTransaction(authority: AuthorityContext, input: { projectId: string; assetId: string; baseVersionId: string; rawRequest: string }) {
    const project = await this.findProject(authority, input.projectId);
    const asset = await this.findAsset(authority, input.assetId);
    const version = await this.findAssetVersion(authority, input.baseVersionId);
    if (!project || !asset || !version || asset.projectId !== project.id || version.assetId !== asset.id) {
      throw new TenantLineageAuthorizationError("La lineage de la transacción no es consistente.");
    }
    return this.transactions.create({ ...input, ownerTenantId: authority.tenantId });
  }

  async findTransaction(authority: AuthorityContext, id: string) {
    const row = await this.transactions.findById(id);
    if (!row) return null;
    assertTenantOwner(row, authority);
    const project = await this.findProject(authority, row.projectId);
    const asset = await this.findAsset(authority, row.assetId);
    const version = await this.findAssetVersion(authority, row.baseVersionId);
    if (!project || !asset || !version || asset.projectId !== project.id || version.assetId !== asset.id) throw new TenantLineageAuthorizationError("La lineage de la transacción no es consistente.");
    return row;
  }
}
