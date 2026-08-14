import { FieldBetaLab } from "@/src/ui/field-beta-lab";
import { isFieldBetaEnabled } from "@/src/server/field-beta-services";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AuthorityError } from "@/src/domain/auth/authority";
import { resolveRequestAuthority } from "@/src/server/tenant-authority";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FieldBetaPage({ searchParams }: { searchParams?: Promise<{ tenantId?: string }> }) {
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) {
    notFound();
  }

  const params = searchParams ? await searchParams : {};
  const requestHeaders = await headers();
  const requestUrl = new URL("http://field-beta.internal/field-beta");
  const requestedTenantId = params.tenantId?.trim();
  if (requestedTenantId) requestUrl.searchParams.set("tenantId", requestedTenantId);

  try {
    const resolved = await resolveRequestAuthority(new Request(requestUrl, { headers: new Headers(requestHeaders) }));
    if (resolved.kind !== "AUTHENTICATED") redirect("/auth?next=/field-beta");
    if (!resolved.authority) notFound();
  } catch (error) {
    if (error instanceof AuthorityError) notFound();
    throw error;
  }

  return <FieldBetaLab />;
}
