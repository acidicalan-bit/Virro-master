import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Workflow Discovery | Virro",
  description:
    "Audita flujos que viven en correos, reuniones y documentos, sin exigir una integración previa.",
  alternates: { canonical: "/workflow-discovery" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="assisted"
      eyebrow="Workflow Discovery"
      title="¿Tu trabajo vive en correos, reuniones y documentos?"
      description="Virro identifica dónde se transfiere la responsabilidad, qué información suele faltar y cuál es el primer punto de control medible."
      cta="Solicitar auditoría de flujo"
      sections={[
        {
          title: "Descubrimiento",
          copy: "Mapea el flujo real, sus receptores y fuentes.",
          points: ["Origen", "Receptor", "Acción esperada"],
        },
        {
          title: "Evidencia",
          copy: "Identifica qué información existe y cuál solo vive en conversaciones.",
          points: ["Documentos", "Reuniones", "Versiones"],
        },
        {
          title: "Continuidad",
          copy: "Define cómo mantener vigente el entendimiento cuando el trabajo cambia.",
          points: ["Readiness", "Change Integrity", "Knowledge Continuity"],
        },
      ]}
    />
  );
}
