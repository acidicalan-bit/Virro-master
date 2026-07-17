import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Privacidad y procesamiento seguro | Virro",
  description:
    "Acceso mínimo, enmascaramiento, procesamiento limitado y conservación de señales seguras.",
  alternates: { canonical: "/privacy" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="available"
      eyebrow="Privacy & Trust"
      title="Entendimiento operativo con acceso mínimo."
      description="Virro está diseñado para procesar información de forma limitada, descartar contenido crudo y conservar señales seguras según la configuración aplicable."
      sections={[
        {
          title: "Procesamiento",
          copy: "Receive → Mask → Analyze → Discard raw content.",
          points: ["Enmascaramiento", "Procesamiento limitado", "Eliminación"],
        },
        {
          title: "Señales",
          copy: "Conserva señales operativas necesarias para reportar.",
          points: ["Readiness", "Riesgos", "Patrones"],
        },
        {
          title: "Límites",
          copy: "No vigilancia y no entrenamiento cruzado entre clientes.",
          points: ["Aislamiento", "Revisión humana", "Sin rankings personales"],
        },
      ]}
    />
  );
}
