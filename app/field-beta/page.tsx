import { FieldBetaLab } from "@/src/ui/field-beta-lab";
import { isFieldBetaEnabled } from "@/src/server/field-beta-services";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function FieldBetaPage() {
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) {
    notFound();
  }
  return <FieldBetaLab />;
}
