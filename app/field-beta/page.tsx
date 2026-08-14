import { FieldBetaLab } from "@/src/ui/field-beta-lab";
import { isFieldBetaEnabled } from "@/src/server/field-beta-services";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { resolveAuthenticatedPrincipal } from "@/src/server/authenticated-principal-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FieldBetaPage() {
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) {
    notFound();
  }
  const principal = await resolveAuthenticatedPrincipal();
  if (principal.kind !== "AUTHENTICATED") redirect("/auth?next=/field-beta");
  return <FieldBetaLab />;
}
