import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { TenantCoreLineageRepository } from "@/src/application/ports/outcome/tenant-core-lineage-repository";

export class TenantCoreLineageService {
  constructor(
    private readonly repository: TenantCoreLineageRepository,
    private readonly authority: AuthorityContext,
  ) {}

  createProject(input: { name: string; description?: string | null }) {
    return this.repository.createProject(this.authority, { name: input.name, description: input.description ?? null });
  }

  async createAsset(input: { projectId: string; name: string; description?: string | null; initialState: Record<string, unknown> }) {
    return this.repository.createAssetWithInitialVersion(this.authority, {
      projectId: input.projectId,
      name: input.name,
      description: input.description ?? null,
      initialState: input.initialState,
    });
  }

  createTransaction(input: { projectId: string; assetId: string; baseVersionId: string; rawRequest: string }) {
    return this.repository.createTransaction(this.authority, input);
  }

  get(resource: "project" | "asset" | "version" | "transaction", id: string) {
    if (resource === "project") return this.repository.findProject(this.authority, id);
    if (resource === "asset") return this.repository.findAsset(this.authority, id);
    if (resource === "version") return this.repository.findAssetVersion(this.authority, id);
    return this.repository.findTransaction(this.authority, id);
  }
}
