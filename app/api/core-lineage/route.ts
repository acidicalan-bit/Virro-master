import { NextResponse } from "next/server";
import { z } from "zod";

import { TenantCoreLineageService } from "@/src/application/outcome/tenant-core-lineage-service";
import { resolveRequestAuthority } from "@/src/server/tenant-authority";
import { createUserScopedSupabaseClient } from "@/src/infrastructure/supabase/server-client";
import { SupabaseTenantCoreLineageRepository } from "@/src/infrastructure/persistence/outcome/supabase-tenant-core-lineage-repository";
import { AuthorityError } from "@/src/domain/auth/authority";
import { TenantLineageAuthorizationError } from "@/src/application/ports/outcome/tenant-core-lineage-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateProjectSchema = z.object({ action: z.literal("createProject"), name: z.string().trim().min(1).max(200), description: z.string().trim().max(2_000).nullable().optional() }).strict();
const CreateAssetSchema = z.object({ action: z.literal("createAsset"), projectId: z.uuid(), name: z.string().trim().min(1).max(200), description: z.string().trim().max(2_000).nullable().optional(), initialState: z.record(z.string(), z.unknown()) }).strict();
const CreateTransactionSchema = z.object({ action: z.literal("createTransaction"), projectId: z.uuid(), assetId: z.uuid(), baseVersionId: z.uuid(), rawRequest: z.string().trim().min(1).max(8_000) }).strict();
const RequestSchema = z.discriminatedUnion("action", [CreateProjectSchema, CreateAssetSchema, CreateTransactionSchema]);

export async function GET(request: Request) {
  try {
    const resolved = await resolveRequestAuthority(request);
    if (resolved.kind !== "AUTHENTICATED" || !resolved.authority) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const resource = z.enum(["project", "asset", "version", "transaction"]).parse(new URL(request.url).searchParams.get("resource"));
    const id = z.uuid().parse(new URL(request.url).searchParams.get("id"));
    const service = new TenantCoreLineageService(new SupabaseTenantCoreLineageRepository(await createUserScopedSupabaseClient()), resolved.authority);
    const record = await service.get(resource, id);
    if (!record) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    return NextResponse.json({ record });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const resolved = await resolveRequestAuthority(request);
    if (resolved.kind !== "AUTHENTICATED" || !resolved.authority) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const input = RequestSchema.parse(await request.json());
    const service = new TenantCoreLineageService(new SupabaseTenantCoreLineageRepository(await createUserScopedSupabaseClient()), resolved.authority);
    if (input.action === "createProject") return NextResponse.json({ project: await service.createProject(input) }, { status: 201 });
    if (input.action === "createAsset") return NextResponse.json(await service.createAsset(input), { status: 201 });
    return NextResponse.json({ transaction: await service.createTransaction(input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (error instanceof AuthorityError) return NextResponse.json({ error: "Tenant authorization denied." }, { status: 403 });
  if (error instanceof TenantLineageAuthorizationError) return NextResponse.json({ error: "Tenant authorization denied." }, { status: 403 });
  return NextResponse.json({ error: "Core lineage request failed." }, { status: 500 });
}
