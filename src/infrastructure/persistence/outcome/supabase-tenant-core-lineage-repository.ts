import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorityContext } from "@/src/domain/auth/authority";
import type { TenantCoreLineageRepository } from "@/src/application/ports/outcome/tenant-core-lineage-repository";
import { assertTenantOwner, TenantLineageAuthorizationError } from "@/src/application/ports/outcome/tenant-core-lineage-repository";

export class SupabaseTenantCoreLineageRepository implements TenantCoreLineageRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createProject(authority: AuthorityContext, input: { name: string; description: string | null }) {
    const { data, error } = await this.client.from("projects").insert({ owner_tenant_id: authority.tenantId, name: input.name, description: input.description }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear el proyecto.");
    return projectRow(data);
  }

  async findProject(authority: AuthorityContext, id: string) {
    const { data, error } = await this.client.from("projects").select("*").eq("id", id).eq("owner_tenant_id", authority.tenantId).maybeSingle();
    if (error) throw new Error("No se pudo leer el proyecto.");
    return data ? projectRow(data) : null;
  }

  async createAsset(authority: AuthorityContext, input: { projectId: string; name: string; description: string | null }) {
    if (!(await this.findProject(authority, input.projectId))) throw new TenantLineageAuthorizationError("El proyecto no existe o no pertenece al tenant autorizado.");
    const { data, error } = await this.client.from("assets").insert({ owner_tenant_id: authority.tenantId, project_id: input.projectId, name: input.name, description: input.description }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear el activo.");
    return assetRow(data);
  }

  async findAsset(authority: AuthorityContext, id: string) {
    const { data, error } = await this.client.from("assets").select("*").eq("id", id).eq("owner_tenant_id", authority.tenantId).maybeSingle();
    if (error) throw new Error("No se pudo leer el activo.");
    return data ? assetRow(data) : null;
  }

  async setCurrentVersion(authority: AuthorityContext, assetId: string, versionId: string) {
    const asset = await this.findAsset(authority, assetId);
    const version = await this.findAssetVersion(authority, versionId);
    if (!asset || !version || version.assetId !== asset.id) throw new TenantLineageAuthorizationError("La versión no pertenece al activo autorizado.");
    const { data, error } = await this.client.from("assets").update({ current_version_id: version.id }).eq("id", asset.id).eq("owner_tenant_id", authority.tenantId).select("*").single();
    if (error || !data) throw new Error("No se pudo actualizar la cabeza del activo.");
    return assetRow(data);
  }

  async createAssetVersion(authority: AuthorityContext, input: { assetId: string; versionNumber: number; state: Record<string, unknown>; parentVersionId: string | null }) {
    const asset = await this.findAsset(authority, input.assetId);
    if (!asset) throw new TenantLineageAuthorizationError("El activo no existe o no pertenece al tenant autorizado.");
    if (input.parentVersionId) {
      const parent = await this.findAssetVersion(authority, input.parentVersionId);
      if (!parent || parent.assetId !== asset.id) throw new TenantLineageAuthorizationError("La versión padre no pertenece al activo.");
    }
    const { data, error } = await this.client.from("asset_versions").insert({ owner_tenant_id: authority.tenantId, asset_id: input.assetId, version_number: input.versionNumber, state: input.state, parent_version_id: input.parentVersionId }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear la versión.");
    return versionRow(data);
  }

  async findAssetVersion(authority: AuthorityContext, id: string) {
    const { data, error } = await this.client.from("asset_versions").select("*").eq("id", id).eq("owner_tenant_id", authority.tenantId).maybeSingle();
    if (error) throw new Error("No se pudo leer la versión.");
    if (!data) return null;
    const row = versionRow(data);
    if (!(await this.findAsset(authority, row.assetId))) throw new TenantLineageAuthorizationError();
    return row;
  }

  async createTransaction(authority: AuthorityContext, input: { projectId: string; assetId: string; baseVersionId: string; rawRequest: string }) {
    const project = await this.findProject(authority, input.projectId);
    const asset = await this.findAsset(authority, input.assetId);
    const version = await this.findAssetVersion(authority, input.baseVersionId);
    if (!project || !asset || !version || asset.projectId !== project.id || version.assetId !== asset.id) throw new TenantLineageAuthorizationError("La lineage de la transacción no es consistente.");
    const { data, error } = await this.client.from("outcome_transactions").insert({ owner_tenant_id: authority.tenantId, project_id: input.projectId, asset_id: input.assetId, base_version_id: input.baseVersionId, raw_request: input.rawRequest, status: "DRAFT" }).select("*").single();
    if (error || !data) throw new Error("No se pudo crear la transacción.");
    return transactionRow(data);
  }

  async findTransaction(authority: AuthorityContext, id: string) {
    const { data, error } = await this.client.from("outcome_transactions").select("*").eq("id", id).eq("owner_tenant_id", authority.tenantId).maybeSingle();
    if (error) throw new Error("No se pudo leer la transacción.");
    if (!data) return null;
    const row = transactionRow(data);
    const project = await this.findProject(authority, row.projectId);
    const asset = await this.findAsset(authority, row.assetId);
    const version = await this.findAssetVersion(authority, row.baseVersionId);
    if (!project || !asset || !version || asset.projectId !== project.id || version.assetId !== asset.id) throw new TenantLineageAuthorizationError("La lineage de la transacción no es consistente.");
    assertTenantOwner(row, authority);
    return row;
  }
}

function ownerTenantId(row: Record<string, unknown>): string | null { return row.owner_tenant_id === null || row.owner_tenant_id === undefined ? null : String(row.owner_tenant_id); }
function projectRow(row: Record<string, unknown>) { return { id: String(row.id), ownerTenantId: ownerTenantId(row), name: String(row.name), description: row.description === null || row.description === undefined ? null : String(row.description), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function assetRow(row: Record<string, unknown>) { return { id: String(row.id), ownerTenantId: ownerTenantId(row), projectId: String(row.project_id), name: String(row.name), description: row.description === null || row.description === undefined ? null : String(row.description), currentVersionId: row.current_version_id ? String(row.current_version_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
function versionRow(row: Record<string, unknown>) { return { id: String(row.id), ownerTenantId: ownerTenantId(row), assetId: String(row.asset_id), versionNumber: Number(row.version_number), state: row.state as Record<string, unknown>, parentVersionId: row.parent_version_id ? String(row.parent_version_id) : null, createdAt: String(row.created_at) }; }
function transactionRow(row: Record<string, unknown>) { return { id: String(row.id), ownerTenantId: ownerTenantId(row), projectId: String(row.project_id), assetId: String(row.asset_id), baseVersionId: String(row.base_version_id), status: row.status as import("@/src/domain/outcome").TransactionStatus, rawRequest: String(row.raw_request), createdAt: String(row.created_at), updatedAt: String(row.updated_at), completedAt: row.completed_at ? String(row.completed_at) : null, abortReason: row.abort_reason ? String(row.abort_reason) : null }; }
