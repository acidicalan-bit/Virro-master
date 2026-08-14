import { NextResponse } from "next/server";

import { resolveAuthenticatedPrincipal } from "@/src/server/authenticated-principal-resolver";
import { provisionPersonalTenant } from "@/src/server/tenant-authority";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const resolved = await resolveAuthenticatedPrincipal(request);
  if (resolved.kind !== "AUTHENTICATED") return NextResponse.json({ error: "Autenticación requerida.", code: resolved.kind }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  try {
    const result = await provisionPersonalTenant(resolved.principal.principalId);
    return NextResponse.json({ tenant: result.tenant, membership: result.membership }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo preparar el acceso interno.", code: "PROVISIONING_FAILED" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
