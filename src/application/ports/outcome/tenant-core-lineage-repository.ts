import type { AuthorityContext } from "@/src/domain/auth/authority";
import type {
  AssetRecord,
  AssetVersionRecord,
  OutcomeTransactionRecord,
  ProjectRecord,
} from "@/src/application/ports/repositories";

/**
 * Tenant-scoped port for the first authenticated core-lineage surface.
 * The caller supplies only a verified AuthorityContext; tenant IDs are never
 * accepted as an authority claim from request payloads.
 */
export interface TenantCoreLineageRepository {
  createProject(authority: AuthorityContext, input: { name: string; description: string | null }): Promise<ProjectRecord>;
  findProject(authority: AuthorityContext, id: string): Promise<ProjectRecord | null>;
  createAssetWithInitialVersion(authority: AuthorityContext, input: { projectId: string; name: string; description: string | null; initialState: Record<string, unknown> }): Promise<{ asset: AssetRecord; version: AssetVersionRecord }>;
  findAsset(authority: AuthorityContext, id: string): Promise<AssetRecord | null>;
  findAssetVersion(authority: AuthorityContext, id: string): Promise<AssetVersionRecord | null>;
  createTransaction(authority: AuthorityContext, input: { projectId: string; assetId: string; baseVersionId: string; rawRequest: string }): Promise<OutcomeTransactionRecord>;
  findTransaction(authority: AuthorityContext, id: string): Promise<OutcomeTransactionRecord | null>;
}

export class TenantLineageAuthorizationError extends Error {
  constructor(message = "El recurso no pertenece al tenant autorizado.") {
    super(message);
    this.name = "TenantLineageAuthorizationError";
  }
}

export function assertTenantOwner(record: { ownerTenantId?: string | null }, authority: AuthorityContext): void {
  if (record.ownerTenantId !== authority.tenantId) {
    throw new TenantLineageAuthorizationError();
  }
}
