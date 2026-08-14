import { describe, expect, it } from "vitest";

import type { AuthorityContext } from "@/src/domain/auth/authority";
import { TenantCoreLineageService } from "@/src/application/outcome/tenant-core-lineage-service";
import { TenantLineageAuthorizationError } from "@/src/application/ports/outcome/tenant-core-lineage-repository";
import { InMemoryTenantCoreLineageRepository } from "@/src/infrastructure/persistence/outcome/in-memory-tenant-core-lineage-repository";
import { getInMemoryOutcomeRepositories } from "@/src/infrastructure/persistence/outcome/in-memory-outcome-repositories";

const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "22222222-2222-4222-8222-222222222222";

function authority(tenantId: string): AuthorityContext {
  return { principalId: tenantId, tenantId, membershipId: `33333333-3333-4333-8333-${tenantId.slice(-12)}`, membershipRole: "OWNER", authoritySource: "SUPABASE_AUTH", authorizationTimestamp: new Date().toISOString() };
}

describe("tenant authority envelope and core lineage", () => {
  it("derives ownership from AuthorityContext and rejects locator substitution", async () => {
    const repos = getInMemoryOutcomeRepositories();
    const repository = new InMemoryTenantCoreLineageRepository(repos.projects, repos.assets, repos.assetVersions, repos.outcomeTransactions);
    const serviceA = new TenantCoreLineageService(repository, authority(tenantA));
    const serviceB = new TenantCoreLineageService(repository, authority(tenantB));

    const project = await serviceA.createProject({ name: "A" });
    const created = await serviceA.createAsset({ projectId: project.id, name: "Asset A", initialState: { locked: true } });
    const transaction = await serviceA.createTransaction({ projectId: project.id, assetId: created.asset.id, baseVersionId: created.version.id, rawRequest: "change only the requested field" });

    expect(project.ownerTenantId).toBe(tenantA);
    expect(created.asset.ownerTenantId).toBe(tenantA);
    expect(created.version.ownerTenantId).toBe(tenantA);
    expect(transaction.ownerTenantId).toBe(tenantA);
    await expect(serviceB.get("project", project.id)).rejects.toBeInstanceOf(TenantLineageAuthorizationError);
    await expect(serviceB.get("transaction", transaction.id)).rejects.toBeInstanceOf(TenantLineageAuthorizationError);
  });

  it("ignores client owner fields and enforces parent lineage", async () => {
    const repos = getInMemoryOutcomeRepositories();
    const repository = new InMemoryTenantCoreLineageRepository(repos.projects, repos.assets, repos.assetVersions, repos.outcomeTransactions);
    const service = new TenantCoreLineageService(repository, authority(tenantA));
    const forged = { name: "A", ownerTenantId: tenantB };
    const project = await service.createProject(forged);
    expect(project.ownerTenantId).toBe(tenantA);
    await expect(service.createAsset({ projectId: "99999999-9999-4999-8999-999999999999", name: "forged", initialState: {} })).rejects.toBeInstanceOf(TenantLineageAuthorizationError);
  });
});
