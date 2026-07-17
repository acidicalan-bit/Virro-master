import type { Metadata } from "next";
import { CommercialSeoPage } from "@/components/landing/commercial-seo-page";
export const metadata: Metadata = {
  title: "Auditoría de flujo | Virro",
  description:
    "Identifica dónde se pierde contexto cuando la información pasa de una persona, equipo o sistema a otro.",
  alternates: { canonical: "/flow-audit" },
};
export default function Page() {
  return (
    <CommercialSeoPage
      capabilityStatus="assisted"
      eyebrow="Flow Understanding Audit"
      title="Encuentra dónde se rompe el entendimiento de un flujo."
      description="Virro analiza el origen, el punto de transferencia, el receptor, la acción esperada y la evidencia disponible sin obligarte a cambiar de herramienta."
      cta="Solicitar auditoría de flujo"
      showAuditDeliverables
      sections={[
        {
          title: "Mapeo operativo",
          copy: "Reconstruye cómo se mueve realmente la información.",
          points: [
            "Origen y responsable",
            "Punto de transferencia",
            "Receptor final",
          ],
        },
        {
          title: "Diagnóstico",
          copy: "Detecta contexto insuficiente, versiones contradictorias y cambios no propagados.",
          points: ["Readiness", "Handoff Integrity", "Change Integrity"],
        },
        {
          title: "Resultado",
          copy: "Entrega un diagnóstico privado y acciones de mejora priorizadas.",
          points: [
            "Evidencia trazable",
            "Revisión humana",
            "Sin vigilancia de empleados",
          ],
        },
      ]}
    />
  );
}
