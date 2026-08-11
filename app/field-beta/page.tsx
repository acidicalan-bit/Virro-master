import { FieldBetaLab } from "@/src/ui/field-beta-lab";
import { isFieldBetaEnabled } from "@/src/server/field-beta-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function FieldBetaPage() {
  if (!isFieldBetaEnabled(process.env.FIELD_BETA_INTERNAL_ENABLED)) {
    return <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem" }}><p>BUILD 005-B · INTERNAL LAB</p><h1>Field Beta no habilitado</h1><p>Activa `FIELD_BETA_INTERNAL_ENABLED=true` sólo en un entorno interno.</p></main>;
  }
  return <FieldBetaLab />;
}
